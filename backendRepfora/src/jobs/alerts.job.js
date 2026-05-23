import cron from 'node-cron';
import ProductiveStage from '../models/ProductiveStage.model.js';
import User from '../models/User.model.js';
import Bitacora from '../models/Bitacora.model.js';
import Tracking from '../models/Tracking.model.js';
import notificationService from '../services/notifications.service.js';
import emailService from '../services/email.service.js';

/**
 * Find PENDING bitacoras older than 7 days and notify ADMIN
 */
const checkOverdueReviews = async () => {
  console.log('[Cron] Checking overdue reviews...');
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const pendingBitacoras = await Bitacora.find({
    status: 'PENDING',
    submittedAt: { $lte: sevenDaysAgo },
    isActive: true
  }).populate('instructor apprentice');

  // Find all admins
  const admins = await User.find({ role: 'ADMIN', isActive: true });
  const adminIds = admins.map(a => a._id.toString());

  for (const b of pendingBitacoras) {
    if (adminIds.length > 0) {
      await notificationService.send({
        type: 'INSTRUCTOR_OVERDUE_REVIEW',
        recipients: adminIds,
        title: 'Revisión de bitácora atrasada',
        message: `El instructor ${b.instructor?.fullName || 'No asignado'} no ha revisado la bitácora #${b.logbookNumber} de ${b.apprentice?.fullName} en más de 7 días.`,
        metadata: { entity: 'Bitacora', entityId: b._id }
      });
    }
  }
};

/**
 * Check for apprentices missing bitacora submissions (one every 14 days)
 */
const checkMissingBitacoras = async () => {
  console.log('[Cron] Checking missing bitacoras...');
  const activeEPs = await ProductiveStage.find({
    status: { $in: ['ACTIVE', 'IN_FOLLOWUP'] },
    isActive: true
  }).populate('apprentice followupInstructor');

  for (const ep of activeEPs) {
    if (!ep.startDate) continue;

    const daysSinceStart = Math.floor((new Date() - new Date(ep.startDate)) / (1000 * 60 * 60 * 24));
    const expectedBitacoras = Math.floor(daysSinceStart / 14);

    if (ep.completedBitacoras < expectedBitacoras) {
      // Notify apprentice and instructor
      const recipients = [ep.apprentice._id.toString()];
      if (ep.followupInstructor) recipients.push(ep.followupInstructor._id.toString());

      await notificationService.send({
        type: 'APPRENTICE_MISSING_BITACORA',
        recipients,
        title: 'Bitácora pendiente de entrega',
        message: `El aprendiz ${ep.apprentice.fullName} tiene entregas de bitácora pendientes según el cronograma.`,
        metadata: { entity: 'ProductiveStage', entityId: ep._id }
      });
    }
  }
};

/**
 * Check for apprentices missing EP registration (monthly reminder) - RF-003
 */
const checkUnregisteredApprentices = async () => {
  console.log('[Cron] Checking unregistered apprentices...');
  
  const activeApprentices = await User.find({ role: 'APPRENTICE', isActive: true });
  
  for (const apprentice of activeApprentices) {
    const epCount = await ProductiveStage.countDocuments({ apprentice: apprentice._id, isActive: true });
    
    if (epCount === 0 && apprentice.createdAt) {
      const msSinceCreation = new Date() - new Date(apprentice.createdAt);
      const daysSinceCreation = Math.floor(msSinceCreation / (1000 * 60 * 60 * 24));
      
      // Remind them every 30 days roughly, until 24 months (730 days)
      if (daysSinceCreation > 0 && daysSinceCreation % 30 === 0 && daysSinceCreation <= 730) {
         const monthsLeft = 24 - Math.floor(daysSinceCreation / 30);
         await notificationService.send({
            type: 'EP_REGISTRATION_REMINDER',
            recipients: [apprentice._id.toString()],
            title: 'Recordatorio: Registro de Etapa Productiva',
            message: `Estimado aprendiz, aún no ha registrado su etapa productiva. Le recordamos que por ley tiene un máximo de 2 años para finalizarla. Le quedan aproximadamente ${monthsLeft} meses. Por favor, ingrese al sistema y registre su modalidad.`,
            metadata: { entity: 'User', entityId: apprentice._id }
         });
      }
    }
  }
};

/**
 * Check for critical desertion (3 months without bitacoras) - RF-005
 */
const checkCriticalDesertion = async () => {
  console.log('[Cron] Checking critical desertion (3 months without bitacora)...');
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const activeEPs = await ProductiveStage.find({
    status: { $in: ['ACTIVE', 'IN_FOLLOWUP'] },
    isActive: true
  }).populate('apprentice');

  const admins = await User.find({ role: 'ADMIN', isActive: true });
  const adminIds = admins.map(a => a._id.toString());

  if (adminIds.length === 0) return;

  for (const ep of activeEPs) {
    if (!ep.startDate) continue;

    const latestBitacora = await Bitacora.findOne({ productiveStage: ep._id, isActive: true }).sort({ submittedAt: -1 });

    let isDesertion = false;
    if (latestBitacora) {
       if (new Date(latestBitacora.submittedAt) < ninetyDaysAgo) isDesertion = true;
    } else {
       if (new Date(ep.startDate) < ninetyDaysAgo) isDesertion = true;
    }

    if (isDesertion) {
      await notificationService.send({
        type: 'NEW_CRITICAL_NOVELTY',
        recipients: adminIds,
        title: 'ALERTA CRÍTICA: Posible Deserción de Aprendiz',
        message: `El aprendiz ${ep.apprentice.fullName} (Ficha: ${ep.apprentice.enrollmentNumber || 'N/A'}) lleva más de 3 meses sin subir una bitácora en la plataforma. Se sugiere iniciar proceso de revisión o anulación por incumplimiento.`,
        metadata: { entity: 'ProductiveStage', entityId: ep._id }
      });
    }
  }
};

/**
 * Check deadlines for bitacoras (Case A and Case B)
 */
const checkLogbookDeadlines = async () => {
  console.log('[Cron] Checking logbook deadlines (Case A & B)...');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Buscar bitácoras no aprobadas (PENDING, IN_REVIEW o sin subir si el sistema las pre-crea)
  const pendingBitacoras = await Bitacora.find({
    status: { $ne: 'APPROVED' },
    isActive: true
  }).populate('apprentice instructor');

  const admins = await User.find({ role: 'ADMIN', isActive: true });
  const adminEmails = admins.map(a => a.email).filter(e => e);

  for (const b of pendingBitacoras) {
    if (!b.periodEnd || !b.instructor || !b.apprentice) continue;

    // Se asume periodEnd como base límite.
    const deadlineDate = new Date(b.periodEnd.getFullYear(), b.periodEnd.getMonth(), b.periodEnd.getDate());
    
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // CASO A: Exactamente a 7 días de vencer (Alerta Preventiva)
    if (diffDays === 7) {
      await notificationService.send({
        type: 'BITACORA_REMINDER', 
        recipients: [b.instructor._id.toString()],
        title: 'Alerta Preventiva: Bitácora por vencer',
        message: `La bitácora del aprendiz <strong>${b.apprentice.fullName}</strong> correspondiente al periodo <strong>${b.periodStart.toLocaleDateString('es-CO')} - ${b.periodEnd.toLocaleDateString('es-CO')}</strong> vence en exactamente 7 días y aún no ha sido revisada/aprobada.`,
        metadata: { entity: 'Bitacora', entityId: b._id }
      });
    }

    // CASO B: Ya venció (exactamente 1 día de atraso para no spamear diario al admin)
    if (diffDays === -1 && adminEmails.length > 0) {
      for (const email of adminEmails) {
        await emailService.send({
          to: email,
          subject: '⚠️ INCUMPLIMIENTO: Bitácora Vencida',
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
              <h2 style="color: #d32f2f;">Alerta de Incumplimiento</h2>
              <p>El instructor <strong>${b.instructor.fullName}</strong> no ha cargado/aprobado una bitácora en el tiempo establecido.</p>
              <ul>
                <li><strong>Aprendiz afectado:</strong> ${b.apprentice.fullName}</li>
                <li><strong>Periodo:</strong> ${b.periodStart.toLocaleDateString('es-CO')} - ${b.periodEnd.toLocaleDateString('es-CO')}</li>
                <li><strong>Estado actual:</strong> ${b.status}</li>
              </ul>
              <p>Por favor, revise el caso en la plataforma.</p>
            </div>
          `
        });
      }
    }
  }
};

/**
 * Check deadlines for Trackings (Cases 1, 2 and 3)
 */
const checkTrackingDeadlines = async () => {
  console.log('[Cron] Checking tracking deadlines (Cases 1, 2 & 3)...');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Traer seguimientos no ejecutados de EPs activas
  const pendingTrackings = await Tracking.find({
    status: 'SCHEDULED',
    isActive: true
  }).populate('apprentice instructor productiveStage');

  for (const t of pendingTrackings) {
    if (!t.scheduledDate || !t.instructor || !t.apprentice) continue;

    const deadlineDate = new Date(t.scheduledDate.getFullYear(), t.scheduledDate.getMonth(), t.scheduledDate.getDate());
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const ep = t.productiveStage;
    const requiredTrackings = ep?.requiredTrackings || 3;
    const isLastTracking = !t.isExtraordinary && t.trackingNumber === requiredTrackings;

    const trackingLabel = t.isExtraordinary
      ? `Seguimiento Extraordinario #${t.trackingNumber}`
      : `Seguimiento #${t.trackingNumber} (${t.type === 'IN_PERSON' ? 'Presencial' : 'Virtual'})`;

    // CASO 1: Exactamente 7 días para vencer — Alerta Preventiva Estándar
    // Solo para seguimientos que NO son el último (ese tiene su propia alerta en Caso 2)
    if (diffDays === 7 && !isLastTracking) {
      await notificationService.send({
        type: 'SEGUIMIENTO_REMINDER',
        recipients: [t.instructor._id.toString()],
        title: 'Alerta Preventiva: Seguimiento por vencer',
        message: `El <strong>${trackingLabel}</strong> del aprendiz <strong>${t.apprentice.fullName}</strong> está programado para el <strong>${deadlineDate.toLocaleDateString('es-CO')}</strong> (en 7 días). Asegúrate de tenerlo listo.`,
        metadata: { entity: 'Tracking', entityId: t._id }
      });
    }

    // CASO 2: El ÚLTIMO seguimiento está exactamente a 7 días — Alerta Crítica de No-Certificación
    if (diffDays === 7 && isLastTracking) {
      // Notificación web en-plataforma
      await notificationService.send({
        type: 'SEGUIMIENTO_REMINDER',
        recipients: [t.instructor._id.toString()],
        title: '🚨 ALERTA CRÍTICA: Último seguimiento por vencer',
        message: `<strong>⚠️ RIESGO DE NO CERTIFICACIÓN:</strong> El <strong>${trackingLabel}</strong> del aprendiz <strong>${t.apprentice.fullName}</strong> es el ÚLTIMO requerido y vence en 7 días. Sin este seguimiento el aprendiz NO podrá ser certificado.`,
        metadata: { entity: 'Tracking', entityId: t._id }
      });

      // Correo crítico al instructor con diseño visual resaltado
      if (t.instructor.email) {
        await emailService.send({
          to: t.instructor.email,
          subject: '🚨 RIESGO DE NO CERTIFICACIÓN — Último Seguimiento por Vencer',
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 3px solid #b71c1c; border-radius: 10px; overflow: hidden;">
              <div style="background: #b71c1c; padding: 20px; text-align: center;">
                <h1 style="color: #fff; margin: 0; font-size: 22px;">🚨 ALERTA CRÍTICA DE CERTIFICACIÓN</h1>
              </div>
              <div style="padding: 24px; background: #fff3f3;">
                <p style="font-size: 16px; color: #333;">Estimado/a <strong>${t.instructor.fullName}</strong>,</p>
                <p style="font-size: 16px; color: #b71c1c;"><strong>⚠️ RIESGO DE NO CERTIFICACIÓN</strong></p>
                <p style="font-size: 15px; color: #333;">El siguiente aprendiz tiene su <strong>ÚLTIMO seguimiento requerido</strong> próximo a vencer. Sin ejecutar este seguimiento, el aprendiz <strong>NO podrá ser certificado</strong>.</p>
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                  <tr style="background: #ffebee;">
                    <td style="padding: 10px; border: 1px solid #ef9a9a; font-weight: bold;">Aprendiz</td>
                    <td style="padding: 10px; border: 1px solid #ef9a9a;">${t.apprentice.fullName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border: 1px solid #ef9a9a; font-weight: bold;">Documento de Identidad</td>
                    <td style="padding: 10px; border: 1px solid #ef9a9a;">${t.apprentice.nationalId || 'N/A'}</td>
                  </tr>
                  <tr style="background: #ffebee;">
                    <td style="padding: 10px; border: 1px solid #ef9a9a; font-weight: bold;">Seguimiento</td>
                    <td style="padding: 10px; border: 1px solid #ef9a9a;">${trackingLabel} (${requiredTrackings} de ${requiredTrackings} requeridos)</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border: 1px solid #ef9a9a; font-weight: bold;">Fecha Límite</td>
                    <td style="padding: 10px; border: 1px solid #ef9a9a; color: #b71c1c;"><strong>${deadlineDate.toLocaleDateString('es-CO')} (Quedan 7 días)</strong></td>
                  </tr>
                </table>
                <p style="text-align: center; font-size: 13px; color: #888;">REPFORA E.P. — Sistema de Alertas Automatizadas</p>
              </div>
            </div>
          `
        });
      }
    }

    // CASO 3: La fecha ya venció hoy (diffDays === 0 significa que era hoy, -1 es que ya pasó ayer)
    // Se dispara el día exacto en que vence (diffDays === 0) para no acumular retrasos
    if (diffDays === 0) {
      // 3a. Notificar al Instructor: web + correo
      await notificationService.send({
        type: 'SEGUIMIENTO_OVERDUE',
        recipients: [t.instructor._id.toString()],
        title: 'Plazo de seguimiento vencido',
        message: `El plazo del <strong>${trackingLabel}</strong> del aprendiz <strong>${t.apprentice.fullName}</strong> ha vencido hoy. Por favor, contacta al aprendiz y registra la incidencia.`,
        metadata: { entity: 'Tracking', entityId: t._id }
      });

      if (t.instructor.email) {
        await emailService.send({
          to: t.instructor.email,
          subject: '⚠️ Seguimiento Vencido — Acción Requerida',
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
              <div style="background: #ff6f00; padding: 16px; text-align: center;">
                <h2 style="color: #fff; margin: 0;">⚠️ Seguimiento Vencido</h2>
              </div>
              <div style="padding: 20px;">
                <p>Estimado/a <strong>${t.instructor.fullName}</strong>,</p>
                <p>El plazo del <strong>${trackingLabel}</strong> con el aprendiz <strong>${t.apprentice.fullName}</strong> ha vencido el día de hoy sin haber sido ejecutado.</p>
                <ul>
                  <li><strong>Aprendiz:</strong> ${t.apprentice.fullName}</li>
                  <li><strong>Documento:</strong> ${t.apprentice.nationalId || 'N/A'}</li>
                  <li><strong>Fecha límite:</strong> ${deadlineDate.toLocaleDateString('es-CO')}</li>
                </ul>
                <p>Por favor, ingresa a la plataforma y gestiona esta situación a la brevedad.</p>
              </div>
            </div>
          `
        });
      }

      // 3b. Notificar al Aprendiz por correo
      if (t.apprentice.email) {
        await emailService.send({
          to: t.apprentice.email,
          subject: 'Aviso: Tu seguimiento ha vencido',
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
              <div style="background: #1565c0; padding: 16px; text-align: center;">
                <h2 style="color: #fff; margin: 0;">Aviso de Seguimiento</h2>
              </div>
              <div style="padding: 20px;">
                <p>Estimado/a <strong>${t.apprentice.fullName}</strong>,</p>
                <p>Te informamos que el <strong>${trackingLabel}</strong> programado para el <strong>${deadlineDate.toLocaleDateString('es-CO')}</strong> ha vencido sin ser ejecutado.</p>
                <p>Tu instructor ha sido notificado. Si tienes dudas sobre tu proceso de etapa productiva, comunícate con él directamente o ingresa a la plataforma REPFORA.</p>
                <p style="color: #888; font-size: 13px;">Este es un mensaje automático. Por favor no respondas a este correo.</p>
              </div>
            </div>
          `
        });
      }
    }
  }
};

/**
 * Start all scheduled jobs
 */
export const initJobs = () => {
  // Run daily at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    await checkOverdueReviews();
    await checkMissingBitacoras();
    await checkUnregisteredApprentices();
    await checkCriticalDesertion();
    await checkLogbookDeadlines();
    await checkTrackingDeadlines();
  });
  
  console.log('⏰ Scheduled jobs initialized');
};
