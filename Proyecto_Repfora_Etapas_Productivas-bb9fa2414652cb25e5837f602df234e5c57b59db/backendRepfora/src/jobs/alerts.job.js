import cron from 'node-cron';
import ProductiveStage from '../models/ProductiveStage.model.js';
import User from '../models/User.model.js';
import Bitacora from '../models/Bitacora.model.js';
import Tracking from '../models/Tracking.model.js';
import notificationService from '../services/notifications.service.js';
import { calculateEpDeadline, daysUntil, getExpiryAlertLevel } from '../utils/dateHelper.util.js';
import { getConfig } from '../utils/configHelper.util.js';
import {
  buildBitacoraSubject, buildBitacoraMessage,
  buildBitacoraOverdueSubject, buildBitacoraOverdueMessage,
  buildTrackingSubject, buildTrackingMessage,
  buildTrackingDeadlineSubject, buildTrackingDeadlineMessage,
  buildInstructorTrackingDeadlineSubject, buildInstructorTrackingDeadlineMessage,
  buildLastTrackingCriticalSubject, buildLastTrackingCriticalMessage
} from '../templates/calendarReminderEmail.template.js';
import { buildExpirySubject, buildExpiryMessage } from '../templates/enrollmentExpiryEmail.template.js';

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
 * Bitácora schedule reminders (RF-004 Escenario 1)
 * - Preemptive: reminds apprentice 1-3 days before the next bitácora is due (every 14 days)
 * - Overdue: notifies when bitácoras are past due
 * Runs daily at 8 AM.
 */
const checkBitacoraSchedule = async () => {
  console.log('[Cron] Verificando cronograma de bitácoras...');

  const activeEPs = await ProductiveStage.find({
    status: { $in: ['ACTIVE', 'IN_FOLLOWUP'] },
    isActive: true
  }).populate('apprentice followupInstructor');

  let remindersSent = 0;
  let overdueSent = 0;

  for (const ep of activeEPs) {
    if (!ep.startDate || !ep.apprentice) continue;

    const completedBitacoras = ep.completedBitacoras || 0;

    const msSinceStart = new Date() - new Date(ep.startDate);
    const daysSinceStart = Math.floor(msSinceStart / (1000 * 60 * 60 * 24));
    const expectedBitacoras = Math.floor(daysSinceStart / 14);

    if (completedBitacoras < expectedBitacoras) {
      const daysOverdue = daysSinceStart - (completedBitacoras * 14);
      const recipients = [ep.apprentice._id.toString()];
      if (ep.followupInstructor) recipients.push(ep.followupInstructor._id.toString());

      await notificationService.send({
        type: 'BITACORA_REMINDER',
        recipients,
        title: buildBitacoraOverdueSubject(),
        message: buildBitacoraOverdueMessage({
          fullName: ep.apprentice.fullName,
          expectedBitacoras,
          completedBitacoras,
          daysOverdue
        }),
        metadata: { entity: 'ProductiveStage', entityId: ep._id }
      });

      console.log(`[Cron] Bitácora atrasada: ${ep.apprentice.fullName} (${completedBitacoras}/${expectedBitacoras}, +${daysOverdue}d)`);
      overdueSent++;
    } else {
      const nextBitacoraNumber = completedBitacoras + 1;
      const nextDueMs = new Date(ep.startDate).getTime() + (nextBitacoraNumber * 14 * 24 * 60 * 60 * 1000);
      const daysUntilDue = Math.ceil((nextDueMs - Date.now()) / (1000 * 60 * 60 * 24));

      if (daysUntilDue >= 1 && daysUntilDue <= 3) {
        await notificationService.send({
          type: 'BITACORA_REMINDER',
          recipients: [ep.apprentice._id.toString()],
          title: buildBitacoraSubject(),
          message: buildBitacoraMessage({
            fullName: ep.apprentice.fullName,
            nextBitacoraNumber,
            nextDueDate: new Date(nextDueMs),
            daysUntilDue
          }),
          metadata: { entity: 'ProductiveStage', entityId: ep._id }
        });

        console.log(`[Cron] Recordatorio bitácora #${nextBitacoraNumber}: ${ep.apprentice.fullName} (en ${daysUntilDue}d)`);
        remindersSent++;
      }
    }
  }

  console.log(`[Cron] Bitácoras - Recordatorios: ${remindersSent} | Atrasos: ${overdueSent}`);
};

/**
 * Check for apprentices missing EP registration (monthly reminder) - RF-003
 * Sends email alerts based on enrollment expiry deadline with YELLOW/ORANGE/RED levels.
 */
const checkEnrollmentExpiry = async () => {
  console.log('[Cron] Verificando vencimiento de matrícula para aprendices sin EP...');

  const [activeApprentices, yellowDays, orangeDays, redDays, monthsNew, yearsOld] = await Promise.all([
    User.find({ role: 'APPRENTICE', isActive: true }),
    getConfig('EXPIRY_ALERT_DAYS_YELLOW').catch(() => 30),
    getConfig('EXPIRY_ALERT_DAYS_ORANGE').catch(() => 15),
    getConfig('EXPIRY_ALERT_DAYS_RED').catch(() => 7),
    getConfig('EP_DEADLINE_MONTHS_NEW_ENROLLMENT').catch(() => 6),
    getConfig('EP_DEADLINE_YEARS_OLD_ENROLLMENT').catch(() => 2),
  ]);

  let alertsSent = 0;

  for (const apprentice of activeApprentices) {
    if (!apprentice.enrollmentExpiryDate) continue;

    const epCount = await ProductiveStage.countDocuments({
      apprentice: apprentice._id,
      isActive: true,
      status: { $nin: ['COMPLETED', 'ARCHIVED'] }
    });

    if (epCount > 0) continue;

    const deadline = calculateEpDeadline(
      apprentice.enrollmentExpiryDate,
      apprentice.isPreNov2024,
      monthsNew,
      yearsOld
    );

    const remaining = daysUntil(deadline);

    if (remaining <= 0) {
      const admins = await User.find({ role: 'ADMIN', isActive: true });
      if (admins.length > 0) {
        await notificationService.send({
          type: 'ENROLLMENT_EXPIRY_ALERT',
          recipients: admins.map(a => a._id.toString()),
          title: `Plazo vencido: ${apprentice.fullName}`,
          message: `El plazo para registrar la etapa productiva del aprendiz ${apprentice.fullName} (${apprentice.nationalId}) ha vencido. Fecha límite: ${deadline.toISOString().split('T')[0]}.`,
          metadata: { entity: 'User', entityId: apprentice._id }
        });
        alertsSent++;
      }
      continue;
    }

    const level = getExpiryAlertLevel(remaining, redDays, orangeDays, yellowDays);

    const shouldSendMonthly = !level && remaining % 30 < 1;
    const shouldSendAlert = level !== null;

    if (shouldSendAlert || shouldSendMonthly) {
      const monthsRemaining = Math.floor(remaining / 30);
      const daysRemaining = remaining % 30;

      await notificationService.send({
        type: 'ENROLLMENT_EXPIRY_ALERT',
        recipients: [apprentice._id.toString()],
        title: level ? buildExpirySubject(level) : buildExpirySubject(null),
        message: buildExpiryMessage({
          fullName: apprentice.fullName,
          monthsRemaining,
          daysRemaining,
          level,
          deadline
        }),
        metadata: { entity: 'User', entityId: apprentice._id }
      });

      console.log(`[Cron] Alerta enviada a ${apprentice.fullName}: ${remaining} días restantes, nivel: ${level || 'MENSUAL'}`);
      alertsSent++;
    }
  }

  console.log(`[Cron] Total alertas de vencimiento enviadas: ${alertsSent}`);
};

/**
 * Tracking session reminders (RF-004 Escenario 2)
 * Notifies apprentice 1-3 days before a scheduled tracking session.
 * Runs daily at 8 AM.
 */
const checkUpcomingTrackings = async () => {
  console.log('[Cron] Verificando seguimientos próximos...');

  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const upcomingTrackings = await Tracking.find({
    status: 'SCHEDULED',
    scheduledDate: { $gte: now, $lte: threeDaysFromNow },
    isActive: true
  }).populate('apprentice instructor');

  let remindersSent = 0;

  for (const tracking of upcomingTrackings) {
    if (!tracking.apprentice) continue;

    const daysUntilTracking = Math.ceil(
      (new Date(tracking.scheduledDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    await notificationService.send({
      type: 'TRACKING_REMINDER',
      recipients: [tracking.apprentice._id.toString()],
      title: buildTrackingSubject(),
      message: buildTrackingMessage({
        fullName: tracking.apprentice.fullName,
        trackingType: tracking.type,
        scheduledDate: tracking.scheduledDate,
        instructorName: tracking.instructor?.fullName || null,
        daysUntilTracking
      }),
      metadata: { entity: 'Tracking', entityId: tracking._id }
    });

    console.log(`[Cron] Recordatorio seguimiento: ${tracking.apprentice.fullName} - ${tracking.type} (en ${daysUntilTracking}d)`);
    remindersSent++;
  }

  console.log(`[Cron] Seguimientos - Recordatorios enviados: ${remindersSent}`);
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
 * Check tracking deadlines and send YELLOW/ORANGE/RED alerts (RF-004 Escenario 2 + RF-005.0)
 * - YELLOW: tracking scheduled in 7 days → apprentice + instructor
 * - ORANGE: tracking scheduled in 3 days → apprentice + instructor
 * - RED: tracking scheduled date has passed → apprentice + instructor + admin
 * Runs daily at 8:00 AM.
 */
const checkTrackingDeadlines = async () => {
  console.log('[Cron] Verificando plazos de seguimientos...');

  const now = new Date();

  const pendingTrackings = await Tracking.find({
    status: 'SCHEDULED',
    isActive: true
  }).populate('apprentice instructor');

  let yellowSent = 0, orangeSent = 0, redSent = 0;

  for (const tracking of pendingTrackings) {
    if (!tracking.apprentice) continue;
    const scheduled = new Date(tracking.scheduledDate);
    const daysUntil = Math.ceil((scheduled.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const recipients = [tracking.apprentice._id.toString()];

    // Include instructor in recipients
    if (tracking.instructor) {
      recipients.push(tracking.instructor._id.toString());
    }

    // RED: passed deadline (daysUntil < 0)
    if (daysUntil < 0) {
      const admins = await User.find({ role: 'ADMIN', isActive: true }).select('_id');
      const adminIds = admins.map(a => a._id.toString());

      await notificationService.send({
        type: 'TRACKING_DEADLINE_APPROACHING',
        recipients: [...recipients, ...adminIds],
        title: buildTrackingDeadlineSubject('RED'),
        message: buildTrackingDeadlineMessage({
          fullName: tracking.apprentice.fullName,
          trackingNumber: tracking.trackingNumber,
          scheduledDate: tracking.scheduledDate,
          level: 'RED'
        }),
        metadata: { entity: 'Tracking', entityId: tracking._id }
      });
      redSent++;
      continue;
    }

    // ORANGE: within 3 days
    if (daysUntil <= 3) {
      await notificationService.send({
        type: 'TRACKING_DEADLINE_APPROACHING',
        recipients,
        title: buildTrackingDeadlineSubject('ORANGE'),
        message: buildTrackingDeadlineMessage({
          fullName: tracking.apprentice.fullName,
          trackingNumber: tracking.trackingNumber,
          scheduledDate: tracking.scheduledDate,
          level: 'ORANGE'
        }),
        metadata: { entity: 'Tracking', entityId: tracking._id }
      });
      orangeSent++;
      continue;
    }

    // YELLOW: within 7 days
    if (daysUntil <= 7) {
      await notificationService.send({
        type: 'TRACKING_DEADLINE_APPROACHING',
        recipients,
        title: buildTrackingDeadlineSubject('YELLOW'),
        message: buildTrackingDeadlineMessage({
          fullName: tracking.apprentice.fullName,
          trackingNumber: tracking.trackingNumber,
          scheduledDate: tracking.scheduledDate,
          level: 'YELLOW'
        }),
        metadata: { entity: 'Tracking', entityId: tracking._id }
      });
      yellowSent++;
    }
  }

  console.log(`[Cron] Alertas de seguimiento - Amarillas: ${yellowSent} | Naranjas: ${orangeSent} | Rojas: ${redSent}`);
};

/**
 * Alerta de bitacora proxima a vencer para instructores (RF-003.0)
 * Notifica a instructores 7 dias antes de que una bitacora este programada.
 * Runs daily at 8 AM.
 */
const checkPendingBitacoraAlerts = async () => {
  console.log('[Cron] Verificando alertas de bitacoras proximas para instructores...');

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const activeEPs = await ProductiveStage.find({
    status: { $in: ['ACTIVE', 'IN_FOLLOWUP'] },
    isActive: true
  }).populate('apprentice followupInstructor technicalInstructor projectInstructor');

  let alertsSent = 0;

  for (const ep of activeEPs) {
    if (!ep.startDate || !ep.apprentice) continue;

    const completedBitacoras = ep.completedBitacoras || 0;
    const nextBitacoraNumber = completedBitacoras + 1;

    // Skip if all bitacoras completed
    if (ep.maxBitacoras && completedBitacoras >= ep.maxBitacoras) continue;

    const nextDueMs = new Date(ep.startDate).getTime() + (nextBitacoraNumber * 14 * 24 * 60 * 60 * 1000);
    const daysUntilDue = Math.ceil((nextDueMs - now.getTime()) / (1000 * 60 * 60 * 24));

    // Alert if due within 7 days (not overdue)
    if (daysUntilDue < 0 || daysUntilDue > 7) continue;

    // Check if this bitacora has already been submitted
    const existingBitacora = await Bitacora.findOne({
      productiveStage: ep._id,
      logbookNumber: nextBitacoraNumber,
      isActive: true
    });

    if (existingBitacora && existingBitacora.status !== 'PENDING') continue;

    // Collect instructor recipients
    const instructorIds = [];
    if (ep.followupInstructor) instructorIds.push(ep.followupInstructor._id.toString());
    if (ep.technicalInstructor) instructorIds.push(ep.technicalInstructor._id.toString());
    if (ep.projectInstructor) instructorIds.push(ep.projectInstructor._id.toString());

    if (instructorIds.length === 0) continue;

    const periodStart = new Date(nextDueMs - (14 * 24 * 60 * 60 * 1000));
    const periodEnd = new Date(nextDueMs);
    const periodStartStr = periodStart.toLocaleDateString('es-CO');
    const periodEndStr = periodEnd.toLocaleDateString('es-CO');

    const urgencyLabel = daysUntilDue <= 3 ? 'URGENTE' : daysUntilDue <= 5 ? 'PROXIMA' : 'RECORDATORIO';

    await notificationService.send({
      type: 'BITACORA_PENDING_REVIEW',
      recipients: instructorIds,
      title: `[${urgencyLabel}] Bitacora #${nextBitacoraNumber} proxima a vencer`,
      message: `La bitacora #${nextBitacoraNumber} del aprendiz ${ep.apprentice.fullName} (Ficha: ${ep.apprentice.enrollmentNumber || 'N/D'}, Programa: ${ep.apprentice.program || 'N/D'}) vence en ${daysUntilDue} dia(s). Periodo correspondiente: ${periodStartStr} - ${periodEndStr}.`,
      metadata: { entity: 'ProductiveStage', entityId: ep._id.toString() }
    });

    console.log(`[Cron] Alerta bitacora #${nextBitacoraNumber}: ${ep.apprentice.fullName} (en ${daysUntilDue}d, instructores: ${instructorIds.length})`);
    alertsSent++;
  }

  console.log(`[Cron] Alertas de bitacoras proximas enviadas: ${alertsSent}`);
};

/**
 * Check for LAST tracking deadlines (RF-005.0 Sub-flow 2.0)
 * When the LAST required tracking is due within 7 days, send CRITICAL alert to instructor
 * highlighting risk of non-certification with apprentice name and document ID.
 * Runs daily at 8:00 AM.
 */
const checkLastTrackingDeadlines = async () => {
  console.log('[Cron] Verificando últimos seguimientos próximos a vencer...');

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const activeEPs = await ProductiveStage.find({
    status: { $in: ['ACTIVE', 'IN_FOLLOWUP'] },
    isActive: true
  }).populate('apprentice followupInstructor');

  let criticalSent = 0;

  for (const ep of activeEPs) {
    if (!ep.apprentice) continue;

    const requiredTrackings = ep.requiredTrackings || (ep.apprentice.trainingLevel === 'TECHNICIAN' || ep.apprentice.trainingLevel === 'TECHNOLOGIST' ? 3 : 2);

    const lastTracking = await Tracking.findOne({
      productiveStage: ep._id,
      trackingNumber: requiredTrackings,
      status: 'SCHEDULED',
      isActive: true
    }).populate('instructor');

    if (!lastTracking || !lastTracking.scheduledDate) continue;

    const scheduled = new Date(lastTracking.scheduledDate);
    const daysUntil = Math.ceil((scheduled.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0 || daysUntil > 7) continue;

    const instructor = lastTracking.instructor || ep.followupInstructor;
    if (!instructor) continue;

    await notificationService.send({
      type: 'TRACKING_LAST_DEADLINE',
      recipients: [instructor._id.toString()],
      title: buildLastTrackingCriticalSubject(),
      message: buildLastTrackingCriticalMessage({
        apprenticeName: ep.apprentice.fullName,
        apprenticeDoc: ep.apprentice.nationalId || 'N/D',
        trackingNumber: requiredTrackings,
        scheduledDate: lastTracking.scheduledDate,
        daysUntil,
        enrollmentNumber: ep.apprentice.enrollmentNumber,
        program: ep.apprentice.program
      }),
      metadata: { entity: 'Tracking', entityId: lastTracking._id }
    });

    console.log(`[Cron] ALERTA CRÍTICA último seguimiento: ${ep.apprentice.fullName} (Doc: ${ep.apprentice.nationalId}) - Seguimiento #${requiredTrackings} en ${daysUntil} día(s)`);
    criticalSent++;
  }

  console.log(`[Cron] Alertas críticas de último seguimiento enviadas: ${criticalSent}`);
};

/**
 * Start all scheduled jobs
 */
export const initJobs = () => {
  // Run daily at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    await checkPendingBitacoraAlerts();
    await checkOverdueReviews();
    await checkBitacoraSchedule();
    await checkUpcomingTrackings();
    await checkTrackingDeadlines();
    await checkLastTrackingDeadlines();
    await checkEnrollmentExpiry();
    await checkCriticalDesertion();
  });
  
  console.log('⏰ Scheduled jobs initialized');
};
