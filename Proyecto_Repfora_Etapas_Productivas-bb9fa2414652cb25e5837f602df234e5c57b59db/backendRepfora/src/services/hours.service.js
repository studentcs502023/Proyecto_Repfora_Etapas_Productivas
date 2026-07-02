import HourRecord from '../models/HourRecord.model.js';
import User from '../models/User.model.js';
import Bitacora from '../models/Bitacora.model.js';
import Tracking from '../models/Tracking.model.js';
import ProductiveStage from '../models/ProductiveStage.model.js';
import { recordAuditLog } from '../utils/auditLog.util.js';
import { getConfig } from '../utils/configHelper.util.js';
import pdfGenerator from '../utils/pdfGenerator.util.js';
import { findOrCreateFolder, getRootFolderId, uploadToFolder, getDriveClient } from '../utils/googleDrive.util.js';
import notificationService from './notifications.service.js';

const { generatePdf } = pdfGenerator;

class HourService {
  /**
   * Internal helper: Add hours to an instructor's monthly record.
   */
  async addHours({ instructorId, month, year, field, amount }) {
    const maxHours = await getConfig('MAX_MONTHLY_HOURS_INSTRUCTOR') || 160;
    const warningPercent = await getConfig('HOURS_LIMIT_WARNING_PERCENT') || 80;

    let record = await HourRecord.findOne({ instructor: instructorId, month, year });
    if (!record) {
      record = new HourRecord({ instructor: instructorId, month, year });
    }

    record[field] = (record[field] || 0) + amount;
    
    record.totalHours = (record.bitacoraHours || 0) + 
                        (record.trackingHours || 0) + 
                        (record.certificationHours || 0) + 
                        (record.extraordinaryHours || 0) + 
                        (record.carriedOverHours || 0);

    record.pendingPaymentHours = (record.pendingPaymentHours || 0) + amount;

    let isOverLimit = false;
    let excessAmount = 0;
    const warningThreshold = maxHours * (warningPercent / 100);

    if (record.totalHours > maxHours) {
      isOverLimit = true;
      excessAmount = record.totalHours - maxHours;
      record.excessHours = excessAmount;
      if (!record.overloadWarningSent) {
        record.overloadWarningSent = true;
        record.limitWarningSent = true;
      }
    } else if (!record.limitWarningSent && record.totalHours >= warningThreshold) {
      record.limitWarningSent = true;
    } else {
      record.excessHours = 0;
    }

    await record.save();

    await User.findByIdAndUpdate(instructorId, {
      $inc: { accumulatedHours: amount, pendingPaymentHours: amount }
    });

    if (isOverLimit && record.overloadWarningSent) {
      const instructor = await User.findById(instructorId).select('fullName email');
      if (instructor) {
        notificationService.send({
          type: 'HOURS_OVERLOAD',
          recipients: [instructorId],
          title: 'Límite de horas mensuales excedido',
          message: `<p><strong>${instructor.fullName}</strong>, has superado el tope de <strong>${maxHours} horas</strong> para el mes en curso.</p>
            <p>Horas acumuladas: <strong>${record.totalHours}</strong> | Excedente: <strong>${excessAmount} horas</strong>.</p>
            <p>Las horas excedentes quedarán registradas como exceso y podrán ser gestionadas por el administrador.</p>
            <p style="color:#e67e22;"><em>Esta alerta es preventiva y no bloquea el registro de actividades.</em></p>`
        }).catch(err => console.error('[HourService] Error enviando HOURS_OVERLOAD:', err.message));
      }
    }

    if (!isOverLimit && record.limitWarningSent && record.totalHours >= warningThreshold && !record.overloadWarningSent) {
      const instructor = await User.findById(instructorId).select('fullName email');
      if (instructor) {
        notificationService.send({
          type: 'HOURS_LIMIT_ALERT',
          recipients: [instructorId],
          title: 'Aproximándose al límite de horas mensuales',
          message: `<p><strong>${instructor.fullName}</strong>, has alcanzado el <strong>${warningPercent}%</strong> del límite mensual de horas (${record.totalHours} de ${maxHours} horas).</p>
            <p>Te quedan <strong>${maxHours - record.totalHours} horas</strong> disponibles para este mes.</p>
            <p style="color:#e67e22;"><em>Esta alerta es preventiva y no bloquea el registro de actividades.</em></p>`
        }).catch(err => console.error('[HourService] Error enviando HOURS_LIMIT_ALERT:', err.message));
      }
    }

    return { record, isOverLimit, excessAmount };
  }

  /**
   * Internal helper: Subtract hours when marking as paid.
   */
  async markHoursPaidInternal({ instructorId, month, year, amount }) {
    const record = await HourRecord.findOne({ instructor: instructorId, month, year });
    if (!record) throw new Error('HourRecord not found for payment');

    record.paidHours = (record.paidHours || 0) + amount;
    record.pendingPaymentHours = Math.max(0, (record.pendingPaymentHours || 0) - amount);
    record.lastPaymentDate = new Date();
    await record.save();

    await User.findByIdAndUpdate(instructorId, {
      $inc: { pendingPaymentHours: -amount }
    });

    return record;
  }

  /**
   * GET /api/hours/instructors/:instructorId
   */
  async getInstructorHours(reqUser, instructorId, query) {
    const { year = new Date().getFullYear(), month } = query;

    // Access control
    if (reqUser.role === 'INSTRUCTOR' && reqUser.id.toString() !== instructorId.toString()) {
      const error = new Error('Forbidden: You can only access your own hour records');
      error.statusCode = 403;
      throw error;
    }

    const instructor = await User.findById(instructorId).select('fullName email nationalId accumulatedHours pendingPaymentHours');
    if (!instructor) {
      const error = new Error('Instructor not found');
      error.statusCode = 404;
      throw error;
    }

    let filter = { instructor: instructorId, year: Number(year) };
    if (month) filter.month = Number(month);

    const records = await HourRecord.find(filter).sort({ year: -1, month: -1 });

    return {
      instructor,
      records,
      totals: {
        allTimeAccumulatedHours: instructor.accumulatedHours,
        allTimePendingHours: instructor.pendingPaymentHours
      }
    };
  }

  /**
   * GET /api/hours/instructors/:instructorId/month/:year/:month
   */
  async getMonthlyDetail(reqUser, instructorId, year, month) {
    if (reqUser.role === 'INSTRUCTOR' && reqUser.id.toString() !== instructorId.toString()) {
      const error = new Error('Forbidden');
      error.statusCode = 403;
      throw error;
    }

    let record = await HourRecord.findOne({ instructor: instructorId, year: Number(year), month: Number(month) });
    
    if (!record) {
      record = {
        instructor: instructorId,
        year: Number(year),
        month: Number(month),
        bitacoraHours: 0,
        trackingHours: 0,
        certificationHours: 0,
        extraordinaryHours: 0,
        totalHours: 0,
        pendingPaymentHours: 0,
        paidHours: 0
      };
    }

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    const [bitacoras, trackings] = await Promise.all([
      Bitacora.find({ 
        instructor: instructorId, 
        reviewedAt: { $gte: monthStart, $lte: monthEnd },
        status: 'APPROVED' 
      }).populate('apprentice', 'fullName')
        .populate('productiveStage', 'modality status followupInstructor technicalInstructor projectInstructor'),
      Tracking.find({ 
        instructor: instructorId, 
        executedDate: { $gte: monthStart, $lte: monthEnd },
        status: { $in: ['EXECUTED', 'PAID'] }
      }).populate('apprentice', 'fullName')
        .populate('productiveStage', 'modality status followupInstructor technicalInstructor projectInstructor')
    ]);

    const getRole = (ep, instructorIdStr) => {
      const id = instructorIdStr.toString();
      const roles = [];
      if (ep.followupInstructor?.toString() === id) roles.push('Seguimiento');
      if (ep.technicalInstructor?.toString() === id) roles.push('Tecnico');
      if (ep.projectInstructor?.toString() === id) roles.push('Proyecto');
      return roles.length > 0 ? roles.join(' / ') : 'Instructor';
    };

    const detailItems = [
      ...bitacoras.map(b => ({
        _id: b._id,
        source: 'BITACORA',
        sourceLabel: 'Revision de Bitacora',
        apprenticeName: b.apprentice?.fullName || '—',
        productiveStageId: b.productiveStage?._id,
        modality: b.productiveStage?.modality,
        instructorRole: b.productiveStage ? getRole(b.productiveStage, instructorId) : '—',
        date: b.reviewedAt,
        assignedHours: b.assignedHours || 0,
        isPaid: b.isPaid,
        hoursValidated: b.hoursValidated || false,
        logbookNumber: b.logbookNumber
      })),
      ...trackings.map(t => ({
        _id: t._id,
        source: 'TRACKING',
        sourceLabel: t.isExtraordinary ? 'Seguimiento Extraordinario' : 'Seguimiento Presencial/Virtual',
        apprenticeName: t.apprentice?.fullName || '—',
        productiveStageId: t.productiveStage?._id,
        modality: t.productiveStage?.modality,
        instructorRole: t.productiveStage ? getRole(t.productiveStage, instructorId) : '—',
        date: t.executedDate,
        assignedHours: t.assignedHours || 0,
        isPaid: t.isPaid,
        hoursValidated: t.hoursValidated || false,
        trackingNumber: t.trackingNumber,
        trackingType: t.type,
        isExtraordinary: t.isExtraordinary
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    const epSummary = {};
    for (const item of detailItems) {
      const key = `${item.productiveStageId || 'unknown'}_${item.instructorRole}`;
      if (!epSummary[key]) {
        epSummary[key] = {
          productiveStageId: item.productiveStageId,
          apprenticeName: item.apprenticeName,
          modality: item.modality,
          instructorRole: item.instructorRole,
          totalHours: 0,
          validatedHours: 0,
          unvalidatedHours: 0,
          pendingHours: 0,
          paidHours: 0,
          itemCount: 0
        };
      }
      epSummary[key].totalHours += item.assignedHours;
      if (item.hoursValidated) {
        epSummary[key].validatedHours += item.assignedHours;
      } else {
        epSummary[key].unvalidatedHours += item.assignedHours;
      }
      epSummary[key].pendingHours += item.isPaid ? 0 : item.assignedHours;
      epSummary[key].paidHours += item.isPaid ? item.assignedHours : 0;
      epSummary[key].itemCount += 1;
    }

    return {
      record,
      summaryByEP: Object.values(epSummary).sort((a, b) => b.totalHours - a.totalHours),
      detailItems
    };
  }

  /**
   * PATCH .../mark-paid
   */
  async markPaid(reqUser, instructorId, year, month, data) {
    const { amount, confirm } = data;

    if (!confirm) {
      const error = new Error('Confirmation required to apply payment');
      error.statusCode = 400;
      throw error;
    }

    const record = await HourRecord.findOne({ instructor: instructorId, year: Number(year), month: Number(month) });
    if (!record) {
      const error = new Error('HourRecord not found');
      error.statusCode = 404;
      throw error;
    }

    if (amount > record.pendingPaymentHours) {
      const error = new Error(`Amount (${amount}) exceeds pending hours (${record.pendingPaymentHours})`);
      error.statusCode = 400;
      throw error;
    }

    record.paidHours += Number(amount);
    record.pendingPaymentHours -= Number(amount);
    record.lastPaymentDate = new Date();
    await record.save();

    // Update User
    await User.findByIdAndUpdate(instructorId, {
      $inc: { pendingPaymentHours: -Number(amount) }
    });

    await recordAuditLog({
      action: 'HOURS_MARKED_PAID',
      entity: 'HourRecord',
      entityId: record._id,
      performedBy: reqUser.id,
      details: { instructorId, year, month, amount }
    });

    return record;
  }

  /**
   * PATCH .../carry-over
   */
  async carryOver(reqUser, instructorId, data) {
    const { fromYear, fromMonth, toYear, toMonth } = data;

    const source = await HourRecord.findOne({ instructor: instructorId, year: fromYear, month: fromMonth });
    if (!source || source.excessHours <= 0) {
      const error = new Error('No excess hours to carry over');
      error.statusCode = 400;
      throw error;
    }

    let target = await HourRecord.findOne({ instructor: instructorId, year: toYear, month: toMonth });
    if (!target) {
      target = new HourRecord({ instructor: instructorId, year: toYear, month: toMonth });
    }

    const amount = source.excessHours;

    target.carriedOverHours += amount;
    target.totalHours += amount;
    target.pendingPaymentHours += amount;

    source.excessHours = 0;
    // record source as carrying over to target
    await source.save();
    await target.save();

    // Update User (since they are "new" payable hours for the target month, but wait... 
    // actually accumulatedHours was already incremented when they were earned. 
    // But pendingPaymentHours was also incremented when earned.
    // So carrying over doesn't change User totals, just moves them between monthly records.)

    await recordAuditLog({
      action: 'HOURS_CARRIED_OVER',
      entity: 'HourRecord',
      entityId: target._id,
      performedBy: reqUser.id,
      details: { instructorId, from: { fromYear, fromMonth }, to: { toYear, toMonth }, amount }
    });

    return { source, target };
  }

  /**
   * POST .../request-charge
   */
  async requestCharge(reqUser, instructorId, year, month) {
    if (reqUser.id.toString() !== instructorId.toString()) {
      const error = new Error('Solo puedes solicitar cobro de tus propias horas');
      error.statusCode = 403;
      throw error;
    }

    const record = await HourRecord.findOne({ instructor: instructorId, year: Number(year), month: Number(month) });
    if (!record) {
      const error = new Error('No tienes horas registradas en este mes');
      error.statusCode = 404;
      throw error;
    }

    if (record.pendingPaymentHours <= 0) {
      const error = new Error('No tienes horas pendientes de cobro en este mes');
      error.statusCode = 400;
      throw error;
    }

    if (record.chargeRequested) {
      const error = new Error('Ya has solicitado el cobro de este mes');
      error.statusCode = 400;
      throw error;
    }

    record.chargeRequested = true;
    record.chargeRequestedAt = new Date();
    await record.save();

    const instructor = await User.findById(instructorId).select('fullName');
    const mesLetra = new Date(year, month - 1).toLocaleString('es-CO', { month: 'long' });

    const admins = await User.find({ role: 'ADMIN', status: 'ACTIVE' }).select('_id');
    const adminIds = admins.map(a => a._id.toString());

    if (adminIds.length > 0) {
      await notificationService.send({
        type: 'HOURS_PAYMENT_REQUEST',
        recipients: adminIds,
        title: `Solicitud de Cobro - ${instructor.fullName}`,
        message: `<p>El instructor <strong>${instructor.fullName}</strong> ha solicitado el cobro de <strong>${record.pendingPaymentHours} horas</strong> correspondientes al mes de <strong>${mesLetra} ${year}</strong>.</p>
          <p>Total horas del mes: ${record.totalHours}h | Horas ya pagadas: ${record.paidHours}h | Pendientes por pagar: ${record.pendingPaymentHours}h</p>`,
        metadata: { entity: 'HourRecord', entityId: record._id.toString() }
      }).catch(e => console.error('[HourService] Error notificando solicitud de cobro:', e.message));
    }

    await recordAuditLog({
      action: 'HOURS_PAYMENT_REQUEST',
      entity: 'HourRecord',
      entityId: record._id,
      performedBy: reqUser.id,
      details: { instructorId, year, month, pendingHours: record.pendingPaymentHours }
    });

    return { success: true, pendingHours: record.pendingPaymentHours, requestedAt: record.chargeRequestedAt };
  }

  async getPendingChargeRequests() {
    const records = await HourRecord.find({ chargeRequested: true, pendingPaymentHours: { $gt: 0 } })
      .populate('instructor', 'fullName email nationalId')
      .sort({ chargeRequestedAt: -1 })
      .lean();

    return records.map(r => ({
      _id: r._id,
      instructor: r.instructor,
      month: r.month,
      year: r.year,
      totalHours: r.totalHours,
      pendingPaymentHours: r.pendingPaymentHours,
      paidHours: r.paidHours,
      chargeRequestedAt: r.chargeRequestedAt
    }));
  }

  async approveChargeRequest(reqUser, recordId) {
    const record = await HourRecord.findById(recordId);
    if (!record) {
      const error = new Error('Registro de horas no encontrado');
      error.statusCode = 404;
      throw error;
    }

    if (!record.chargeRequested) {
      const error = new Error('Este registro no tiene una solicitud de cobro pendiente');
      error.statusCode = 400;
      throw error;
    }

    const pending = record.pendingPaymentHours;
    record.paidHours += pending;
    record.pendingPaymentHours = 0;
    record.lastPaymentDate = new Date();
    record.chargeRequested = false;
    await record.save();

    await User.findByIdAndUpdate(record.instructor, {
      $inc: { pendingPaymentHours: -pending }
    });

    const instructor = await User.findById(record.instructor).select('fullName');
    const mesLetra = new Date(record.year, record.month - 1).toLocaleString('es-CO', { month: 'long' });

    notificationService.send({
      type: 'HOURS_LIMIT_ALERT',
      recipients: [record.instructor.toString()],
      title: 'Cobro de horas aprobado',
      message: `<p>El administrador ha <strong>aprobado</strong> el cobro de <strong>${pending} horas</strong> correspondientes a <strong>${mesLetra} ${record.year}</strong>.</p>`
    }).catch(e => console.error('[HourService] Error notificando aprobacion de cobro:', e.message));

    await recordAuditLog({
      action: 'HOURS_MARKED_PAID',
      entity: 'HourRecord',
      entityId: record._id,
      performedBy: reqUser.id,
      details: { instructorId: record.instructor, year: record.year, month: record.month, amount: pending, via: 'CHARGE_REQUEST_APPROVAL' }
    });

    return { success: true, paidHours: pending, instructor: instructor.fullName };
  }

  async rejectChargeRequest(reqUser, recordId, reason) {
    const record = await HourRecord.findById(recordId);
    if (!record) {
      const error = new Error('Registro de horas no encontrado');
      error.statusCode = 404;
      throw error;
    }

    if (!record.chargeRequested) {
      const error = new Error('Este registro no tiene una solicitud de cobro pendiente');
      error.statusCode = 400;
      throw error;
    }

    record.chargeRequested = false;
    await record.save();

    const instructor = await User.findById(record.instructor).select('fullName');
    const mesLetra = new Date(record.year, record.month - 1).toLocaleString('es-CO', { month: 'long' });

    notificationService.send({
      type: 'HOURS_LIMIT_ALERT',
      recipients: [record.instructor.toString()],
      title: 'Cobro de horas rechazado',
      message: `<p>El administrador ha <strong>rechazado</strong> tu solicitud de cobro de <strong>${record.pendingPaymentHours} horas</strong> de <strong>${mesLetra} ${record.year}</strong>.</p>
        ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ''}
        <p>Puedes volver a solicitarlo cuando corrijas lo necesario.</p>`
    }).catch(e => console.error('[HourService] Error notificando rechazo de cobro:', e.message));

    await recordAuditLog({
      action: 'HOURS_REJECTED',
      entity: 'HourRecord',
      entityId: record._id,
      performedBy: reqUser.id,
      details: { instructorId: record.instructor, year: record.year, month: record.month, reason }
    });

    return { success: true, instructor: instructor.fullName, reason };
  }

  /**
   * GET /api/hours/summary
   */
  async getSummary(query) {
    const { year, month } = query;
    if (!year || !month) {
      const error = new Error('year and month are required');
      error.statusCode = 400;
      throw error;
    }

    const records = await HourRecord.find({ year: Number(year), month: Number(month) })
      .populate('instructor', 'fullName');

    const instructors = records.map(r => ({
      instructorId: r.instructor._id,
      fullName: r.instructor.fullName,
      totalHours: r.totalHours,
      pendingPaymentHours: r.pendingPaymentHours,
      paidHours: r.paidHours,
      excessHours: r.excessHours
    }));

    const totals = {
      totalHoursAllInstructors: instructors.reduce((sum, i) => sum + i.totalHours, 0),
      totalPendingAllInstructors: instructors.reduce((sum, i) => sum + i.pendingPaymentHours, 0)
    };

    return {
      period: { year: Number(year), month: Number(month) },
      instructors,
      totals
    };
  }

  /**
   * GET .../report
   */
  async getReport(reqUser, instructorId, year, month) {
     // Access control
     if (reqUser.role === 'INSTRUCTOR' && reqUser.id.toString() !== instructorId.toString()) {
      const error = new Error('Forbidden');
      error.statusCode = 403;
      throw error;
    }

    const record = await HourRecord.findOne({ instructor: instructorId, year: Number(year), month: Number(month) });
    if (!record) {
      const error = new Error('HourRecord not found');
      error.statusCode = 404;
      throw error;
    }

    if (record.reportDriveUrl) {
      return { reportDriveUrl: record.reportDriveUrl };
    }

    // Generate PDF
    const instructor = await User.findById(instructorId, 'fullName nationalId');
    if (!instructor) {
      const error = new Error('Instructor no encontrado');
      error.statusCode = 404;
      throw error;
    }

    const mesLetra = new Date(year, month - 1).toLocaleString('es-CO', { month: 'long' });
    const pdfBuffer = await generatePdf({
      title: `Reporte Mensual de Horas`,
      subtitle: `${mesLetra} ${year} - ${instructor.fullName}`,
      sections: [
        {
          heading: 'Detalle de Horas',
          rows: [
            ['Bitácoras', String(record.bitacoraHours)],
            ['Seguimientos', String(record.trackingHours)],
            ['Certificaciones', String(record.certificationHours)],
            ['Extraordinarias', String(record.extraordinaryHours)],
            ['TOTAL', String(record.totalHours)]
          ]
        },
        {
          heading: 'Estado de Pagos',
          rows: [
            ['Pagadas', String(record.paidHours)],
            ['Pendientes', String(record.pendingPaymentHours)]
          ]
        }
      ],
      summary: {
        'Exceso': record.excessHours,
        'Acumulado': record.carriedOverHours,
        'Último Pago': record.lastPaymentDate ? record.lastPaymentDate.toLocaleDateString('es-CO') : 'No registrado'
      }
    });

    let driveFileUrl = null;
    let driveFileId = null;
    try {
      const rootId = getRootFolderId();
      if (rootId) {
        const dClient = getDriveClient();
        const instructorFolderId = await findOrCreateFolder(dClient, `instructor_${instructor.nationalId}`, rootId);
        const reportsFolderId = await findOrCreateFolder(dClient, 'reportes', instructorFolderId);
        const driveResult = await uploadToFolder(
          { buffer: pdfBuffer, mimetype: 'application/pdf', originalname: `reporte_${year}_${month}.pdf` },
          reportsFolderId,
          `reporte_horas_${instructor.nationalId}_${year}_${String(month).padStart(2, '0')}.pdf`
        );
        driveFileUrl = driveResult.driveFileUrl;
        driveFileId = driveResult.driveFileId;
      }
    } catch (driveErr) {
      console.warn('[hours.service] No se pudo subir reporte a Drive:', driveErr.message);
    }

    record.reportDriveUrl = driveFileUrl;
    record.reportDriveId = driveFileId;
    await record.save();

    return { reportDriveUrl: driveFileUrl };
  }
}

export default new HourService();
