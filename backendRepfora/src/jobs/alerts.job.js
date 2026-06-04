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
  buildTrackingSubject, buildTrackingMessage
} from '../templates/calendarReminderEmail.template.js';
import { buildExpirySubject, buildExpiryMessage } from '../templates/enrollmentExpiryEmail.template.js';
import { buildCertificationSubject, buildCertificationMessage } from '../templates/certificationReminderEmail.template.js';
import Document from '../models/Document.model.js';

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
 * Certification document reminders (RF-006 - Flujo 3)
 * Notifies apprentices whose EP is in CERTIFICATION status but haven't uploaded
 * their CERTIFICATION_DOSSIER document yet.
 * - Sends first reminder ~60 days before estimatedEndDate
 * - Escalates at YELLOW (30d), ORANGE (15d), RED (7d)
 * Runs daily at 8 AM.
 */
const checkCertificationReminders = async () => {
  console.log('[Cron] Verificando recordatorios de certificación...');

  const now = new Date();
  const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  const certEPs = await ProductiveStage.find({
    status: 'CERTIFICATION',
    isActive: true,
    estimatedEndDate: { $lte: sixtyDaysFromNow }
  }).populate('apprentice');

  let remindersSent = 0;

  for (const ep of certEPs) {
    if (!ep.apprentice || !ep.estimatedEndDate) continue;

    const daysRemaining = Math.ceil(
      (new Date(ep.estimatedEndDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysRemaining <= 0) continue;

    const existingDossier = await Document.findOne({
      productiveStage: ep._id,
      documentType: 'CERTIFICATION_DOSSIER',
      status: { $ne: 'REJECTED' },
      isActive: true
    });

    if (existingDossier) {
      console.log(`[Cron] Certificación - ${ep.apprentice.fullName}: ya subió documento, omitiendo.`);
      continue;
    }

    let level = null;
    let shouldNotify = false;

    if (daysRemaining <= 7) {
      level = 'RED';
      shouldNotify = true;
    } else if (daysRemaining <= 15) {
      level = 'ORANGE';
      shouldNotify = true;
    } else if (daysRemaining <= 30) {
      level = 'YELLOW';
      shouldNotify = true;
    } else if (daysRemaining <= 60 && daysRemaining % 7 === 0) {
      shouldNotify = true;
    }

    if (shouldNotify) {
      await notificationService.send({
        type: 'DOCUMENTS_REMINDER',
        recipients: [ep.apprentice._id.toString()],
        title: buildCertificationSubject(level),
        message: buildCertificationMessage({
          fullName: ep.apprentice.fullName,
          daysRemaining,
          level,
          estimatedEndDate: ep.estimatedEndDate
        }),
        metadata: { entity: 'ProductiveStage', entityId: ep._id }
      });

      console.log(`[Cron] Recordatorio certificación enviado a ${ep.apprentice.fullName}: ${daysRemaining}d restantes, nivel: ${level || 'INICIAL'}`);
      remindersSent++;
    }
  }

  console.log(`[Cron] Certificación - Recordatorios enviados: ${remindersSent}`);
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
 * Start all scheduled jobs
 */
export const initJobs = () => {
  // Run daily at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    await checkOverdueReviews();
    await checkBitacoraSchedule();
    await checkUpcomingTrackings();
    await checkEnrollmentExpiry();
    await checkCertificationReminders();
    await checkCriticalDesertion();
  });
  
  console.log('⏰ Scheduled jobs initialized');
};
