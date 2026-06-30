import Bitacora from '../models/Bitacora.model.js';
import Tracking from '../models/Tracking.model.js';
import { recordAuditLog } from '../utils/auditLog.util.js';
import notificationService from './notifications.service.js';

class HourValidationService {

  async getPendingValidations({ page = 1, limit = 20, instructorId } = {}) {
    const skip = (page - 1) * limit;

    const bitacoraQuery = { status: 'APPROVED', hoursValidated: false, assignedHours: { $gt: 0 } };
    const trackingQuery = { status: 'EXECUTED', hoursValidated: false, assignedHours: { $gt: 0 } };

    if (instructorId) {
      bitacoraQuery.instructor = instructorId;
      trackingQuery.instructor = instructorId;
    }

    const [bitacoras, bitacoraTotal] = await Promise.all([
      Bitacora.find(bitacoraQuery)
        .populate('instructor', 'fullName email')
        .populate('apprentice', 'fullName')
        .sort({ reviewedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Bitacora.countDocuments(bitacoraQuery)
    ]);

    const [trackings, trackingTotal] = await Promise.all([
      Tracking.find(trackingQuery)
        .populate('instructor', 'fullName email')
        .populate('apprentice', 'fullName')
        .sort({ executedDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Tracking.countDocuments(trackingQuery)
    ]);

    const bitacoraItems = bitacoras.map(b => ({
      _id: b._id,
      source: 'BITACORA',
      sourceLabel: 'Bitácora',
      instructor: b.instructor,
      apprentice: b.apprentice,
      assignedHours: b.assignedHours,
      date: b.reviewedAt,
      logbookNumber: b.logbookNumber
    }));

    const trackingItems = trackings.map(t => ({
      _id: t._id,
      source: 'TRACKING',
      sourceLabel: t.isExtraordinary ? 'Seguimiento Extraordinario' : 'Seguimiento',
      instructor: t.instructor,
      apprentice: t.apprentice,
      assignedHours: t.assignedHours,
      date: t.executedDate,
      trackingNumber: t.trackingNumber,
      trackingType: t.type,
      isExtraordinary: t.isExtraordinary
    }));

    const allItems = [...bitacoraItems, ...trackingItems]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit);

    return {
      items: allItems,
      total: bitacoraTotal + trackingTotal,
      page,
      limit
    };
  }

  async validateHours({ source, id, performedBy }) {
    if (source === 'BITACORA') {
      const bitacora = await Bitacora.findById(id);
      if (!bitacora) {
        const err = new Error('Bitácora no encontrada');
        err.statusCode = 404;
        throw err;
      }
      if (bitacora.hoursValidated) {
        const err = new Error('Las horas de esta bitácora ya fueron validadas');
        err.statusCode = 400;
        throw err;
      }
      bitacora.hoursValidated = true;
      bitacora.hoursValidatedBy = performedBy;
      bitacora.hoursValidatedAt = new Date();
      await bitacora.save();

      await recordAuditLog({
        action: 'HOURS_VALIDATED',
        entity: 'Bitacora',
        entityId: id,
        performedBy,
        details: { source: 'BITACORA', assignedHours: bitacora.assignedHours, instructor: bitacora.instructor }
      });

      return { source: 'BITACORA', id, validated: true };
    }

    if (source === 'TRACKING') {
      const tracking = await Tracking.findById(id);
      if (!tracking) {
        const err = new Error('Seguimiento no encontrado');
        err.statusCode = 404;
        throw err;
      }
      if (tracking.hoursValidated) {
        const err = new Error('Las horas de este seguimiento ya fueron validadas');
        err.statusCode = 400;
        throw err;
      }
      tracking.hoursValidated = true;
      tracking.hoursValidatedBy = performedBy;
      tracking.hoursValidatedAt = new Date();
      await tracking.save();

      await recordAuditLog({
        action: 'HOURS_VALIDATED',
        entity: 'Tracking',
        entityId: id,
        performedBy,
        details: { source: 'TRACKING', assignedHours: tracking.assignedHours, instructor: tracking.instructor }
      });

      return { source: 'TRACKING', id, validated: true };
    }

    const err = new Error('Origen inválido. Debe ser BITACORA o TRACKING');
    err.statusCode = 400;
    throw err;
  }

  async rejectHours({ source, id, reason, performedBy }) {
    if (!reason || reason.trim().length < 10) {
      const err = new Error('Debe proporcionar un motivo de al menos 10 caracteres');
      err.statusCode = 400;
      throw err;
    }

    if (source === 'BITACORA') {
      const bitacora = await Bitacora.findById(id);
      if (!bitacora) {
        const err = new Error('Bitácora no encontrada');
        err.statusCode = 404;
        throw err;
      }
      if (bitacora.hoursValidated) {
        const err = new Error('Las horas de esta bitácora ya fueron validadas');
        err.statusCode = 400;
        throw err;
      }

      const previousHours = bitacora.assignedHours;
      bitacora.hoursValidated = true;
      bitacora.hoursValidatedBy = performedBy;
      bitacora.hoursValidatedAt = new Date();
      bitacora.assignedHours = 0;
      await bitacora.save();

      if (bitacora.instructor) {
        notificationService.send({
          type: 'ADMIN_COMMENT_ON_BITACORA',
          recipients: [bitacora.instructor.toString()],
          title: 'Horas de bitácora rechazadas',
          message: `<p>Las <strong>${previousHours} horas</strong> asignadas por tu revisión de la bitácora #${bitacora.logbookNumber} han sido <strong>rechazadas</strong> por el administrador.</p>
            <p><strong>Motivo:</strong> ${reason}</p>`
        }).catch(e => console.error('[HourValidation] Error notificando rechazo bitacora:', e.message));
      }

      await recordAuditLog({
        action: 'HOURS_REJECTED',
        entity: 'Bitacora',
        entityId: id,
        performedBy,
        details: { source: 'BITACORA', reason, previousHours, instructor: bitacora.instructor }
      });

      return { source: 'BITACORA', id, rejected: true, reason };
    }

    if (source === 'TRACKING') {
      const tracking = await Tracking.findById(id);
      if (!tracking) {
        const err = new Error('Seguimiento no encontrado');
        err.statusCode = 404;
        throw err;
      }
      if (tracking.hoursValidated) {
        const err = new Error('Las horas de este seguimiento ya fueron validadas');
        err.statusCode = 400;
        throw err;
      }

      const previousHours = tracking.assignedHours;
      tracking.hoursValidated = true;
      tracking.hoursValidatedBy = performedBy;
      tracking.hoursValidatedAt = new Date();
      tracking.assignedHours = 0;
      await tracking.save();

      if (tracking.instructor) {
        notificationService.send({
          type: 'ADMIN_COMMENT_ON_BITACORA',
          recipients: [tracking.instructor.toString()],
          title: 'Horas de seguimiento rechazadas',
          message: `<p>Las <strong>${previousHours} horas</strong> asignadas por el seguimiento #${tracking.trackingNumber} han sido <strong>rechazadas</strong> por el administrador.</p>
            <p><strong>Motivo:</strong> ${reason}</p>`
        }).catch(e => console.error('[HourValidation] Error notificando rechazo tracking:', e.message));
      }

      await recordAuditLog({
        action: 'HOURS_REJECTED',
        entity: 'Tracking',
        entityId: id,
        performedBy,
        details: { source: 'TRACKING', reason, previousHours, instructor: tracking.instructor }
      });

      return { source: 'TRACKING', id, rejected: true, reason };
    }

    const err = new Error('Origen inválido. Debe ser BITACORA o TRACKING');
    err.statusCode = 400;
    throw err;
  }
}

const hourValidationService = new HourValidationService();
export default hourValidationService;
