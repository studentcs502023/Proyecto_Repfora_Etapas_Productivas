import Notification from '../models/Notification.model.js';
import User from '../models/User.model.js';
import emailService from './email.service.js';

/**
 * Simple HTML email template
 */
const buildEmailBody = (fullName, message) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
    <h2 style="color: #39a900; text-align: center;">REPFORA E.P. — SENA</h2>
    <p style="line-height: 1.6; color: #333;">Estimado/a <strong>${fullName}</strong>,</p>
    <div style="line-height: 1.6; color: #333;">${message}</div>
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
      <p style="font-size: 12px; color: #666;">
        Este es un mensaje autom&aacute;tico del Sistema de Seguimiento de Etapa Productiva.
        <br>Por favor no responda a este correo.
      </p>
    </div>
  </div>
`;

class NotificationService {
  /**
   * Create in-platform notification(s) and send email(s).
   * Never throws — email failures are logged but do not propagate.
   *
   * @param {Object} params
   * @param {string}   params.type          - enum NOTIFICATION_TYPES
   * @param {string[]} params.recipients    - array of User IDs (strings)
   * @param {string}   params.title
   * @param {string}   params.message
   * @param {Object}   [params.metadata]    - { entity, entityId, url }
   */
  async send({ type, recipients, title, message, metadata = {} }) {
    console.log(`[NotificationService] Procesando ${recipients.length} destinatario(s). Tipo: ${type}`);
    const results = [];

    for (const recipientId of recipients) {
      try {
        const notification = new Notification({
          recipient: recipientId,
          type,
          title,
          message,
          metadata,
          emailSent: false
        });

        const user = await User.findById(recipientId).select('email fullName');
        console.log(`[NotificationService] Usuario: ${user?.fullName || 'NO ENCONTRADO'} - Email: ${user?.email || 'SIN EMAIL'}`);

        if (user?.email && process.env.NODE_ENV !== 'test') {
          try {
            console.log('[NotificationService] Llamando a emailService.send()...');
            await emailService.send({
              to: user.email,
              subject: title,
              body: buildEmailBody(user.fullName, message)
            });
            notification.emailSent = true;
            notification.emailSentAt = new Date();
            console.log(`[NotificationService] Email enviado OK a ${user.email}`);
          } catch (emailErr) {
            notification.emailError = emailErr.message;
            console.error(`[NotificationService] Fallo email a ${user.email}: ${emailErr.message}`);
          }
        } else if (process.env.NODE_ENV === 'test') {
          notification.emailSent = true;
          notification.emailSentAt = new Date();
        } else {
          console.warn(`[NotificationService] Sin email para ${recipientId} - no se envía.`);
        }

        await notification.save();
        results.push(notification);
        console.log(`[NotificationService] Notificación guardada. emailSent: ${notification.emailSent}`);
      } catch (err) {
        console.error(`[NotificationService] Error procesando destinatario ${recipientId}:`, err.message);
      }
    }

    console.log(`[NotificationService] Finalizado. ${results.length} notificación(es) creada(s).`);
    return results;
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(userId, query) {
    const { isRead, type, page = 1, limit = 20 } = query;
    let filter = { recipient: userId };

    if (isRead !== undefined) filter.isRead = isRead === 'true';
    if (type) filter.type = type;

    const skip = (page - 1) * limit;
    
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipient: userId, isRead: false })
    ]);

    return {
      notifications,
      unreadCount,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get unread count only
   */
  async getUnreadCount(userId) {
    const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });
    return { unreadCount };
  }

  /**
   * Mark as read
   */
  async markAsRead(userId, notificationId) {
    const notification = await Notification.findOne({ _id: notificationId, recipient: userId });
    
    if (!notification) {
        const error = new Error('Notification not found');
        error.statusCode = 404;
        throw error;
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    return notification;
  }

  /**
   * Mark all as read
   */
  async markAllAsRead(userId) {
    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    return { success: true };
  }

  /**
   * Delete notification
   */
  async deleteNotification(userId, notificationId) {
    const result = await Notification.findOneAndDelete({ _id: notificationId, recipient: userId });
    if (!result) {
        const error = new Error('Notification not found');
        error.statusCode = 404;
        throw error;
    }
    return { success: true };
  }
}

export default new NotificationService();
