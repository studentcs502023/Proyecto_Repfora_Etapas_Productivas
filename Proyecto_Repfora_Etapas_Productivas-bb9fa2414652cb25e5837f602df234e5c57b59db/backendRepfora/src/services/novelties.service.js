import Novelty from '../models/Novelty.model.js';
import ProductiveStage from '../models/ProductiveStage.model.js';
import User from '../models/User.model.js';
import Bitacora from '../models/Bitacora.model.js';
import Tracking from '../models/Tracking.model.js';
import { recordAuditLog } from '../utils/auditLog.util.js';
import pdfGenerator from '../utils/pdfGenerator.util.js';
import { NOVELTY_STATUSES } from '../utils/enums.js';
import { uploadToApprenticeFolder } from '../utils/googleDrive.util.js';
import notificationService from './notifications.service.js';

class NoveltyService {
  async createNovelty(noveltyData, files, reporterId) {
    const { productiveStageId, type, description, occurrenceDate, severity, contactAttempts, recommendations } = noveltyData;

    // 1. Find EP and verify
    const ep = await ProductiveStage.findById(productiveStageId).populate('apprentice');
    if (!ep) {
        const error = new Error('Productive stage not found');
        error.statusCode = 404;
        throw error;
    }

    // Verify instructor is assigned
    const isAssigned = [
      ep.followupInstructor?.toString(),
      ep.technicalInstructor?.toString(),
      ep.projectInstructor?.toString()
    ].includes(reporterId.toString());

    if (!isAssigned) {
        const error = new Error('Forbidden: You are not assigned to this productive stage');
        error.statusCode = 403;
        throw error;
    }

    if (['COMPLETED', 'ARCHIVED'].includes(ep.status)) {
        const error = new Error('Cannot report novelties for a completed or archived EP');
        error.statusCode = 400;
        throw error;
    }

    // 2. Upload attachments to Drive
    const attachments = [];
    if (files && files.length > 0) {
      for (const file of files) {
        try {
          const driveFile = await uploadToApprenticeFolder(file, ep.apprentice.nationalId, 'novedades');
          attachments.push(driveFile);
        } catch (driveErr) {
          console.error('[Google Drive] Error uploading novelty attachment:', driveErr.message);
          attachments.push({
            fileName: file.originalname || 'archivo.pdf',
            driveFileId: null,
            driveFileUrl: null
          });
        }
      }
    }

    // 3. Create novelty
    const novelty = new Novelty({
      productiveStage: productiveStageId,
      apprentice: ep.apprentice._id,
      reportedBy: reporterId,
      type,
      severity: severity || 'MEDIA',
      description,
      occurrenceDate,
      contactAttempts: contactAttempts || null,
      recommendations: recommendations || null,
      attachments,
      status: 'PENDING',
      timeline: [{
        event: 'CREATED',
        description: 'Novedad registrada por el instructor',
        author: reporterId,
        authorRole: 'INSTRUCTOR',
        createdAt: new Date()
      }]
    });

    // 4. Auto-generate PDF summary
    const pdfInfo = await pdfGenerator.generateNoveltyPDF(novelty);
    novelty.pdfDriveId = pdfInfo.driveFileId;
    novelty.pdfDriveUrl = pdfInfo.driveFileUrl;

    await novelty.save();

    // 5. Send priority notification to ADMIN
    try {
      const admins = await User.find({ role: 'ADMIN', isActive: true }).select('_id');
      const adminIds = admins.map(a => a._id.toString());
      if (adminIds.length > 0) {
        await notificationService.send({
          type: 'NEW_CRITICAL_NOVELTY',
          recipients: adminIds,
          title: `Novedad crítica: ${type}`,
          message: `${ep.apprentice.fullName} (Ficha ${ep.apprentice.enrollmentNumber}) - ${description.substring(0, 200)}`,
          metadata: { noveltyId: novelty._id, instructorId: reporterId }
        });
      }
    } catch (err) {
      console.warn('[novelties.service] Error notificando novedad:', err.message);
    }

    // 6. Record in AuditLog
    await recordAuditLog({
      action: 'NOVELTY_CREATED',
      entity: 'Novelty',
      entityId: novelty._id,
      performedBy: reporterId,
      details: { type, apprenticeId: ep.apprentice._id }
    });

    return novelty;
  }

  async getAllNovelties(filters, role, userId) {
    const { status, type, productiveStageId, apprenticeId, page = 1, limit = 20 } = filters;
    
    const query = { isActive: true };
    if (status) query.status = status;
    if (type) query.type = type;
    if (productiveStageId) query.productiveStage = productiveStageId;
    
    // Role-based access
    if (role === 'INSTRUCTOR') {
      query.reportedBy = userId;
    } else if (role === 'ADMIN' && apprenticeId) {
      query.apprentice = apprenticeId;
    }

    const skip = (page - 1) * limit;
    const novelties = await Novelty.find(query)
      .populate('apprentice', 'fullName enrollmentNumber')
      .populate('reportedBy', 'fullName')
      .populate('resolvedBy', 'fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Novelty.countDocuments(query);

    return {
      novelties,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    };
  }

  async getNoveltyById(id, role, userId) {
    const novelty = await Novelty.findById(id)
      .populate('apprentice', 'fullName enrollmentNumber')
      .populate('reportedBy', 'fullName')
      .populate('resolvedBy', 'fullName')
      .populate('productiveStage');

    if (!novelty || !novelty.isActive) {
        const error = new Error('Novelty not found');
        error.statusCode = 404;
        throw error;
    }

    if (role === 'INSTRUCTOR' && novelty.reportedBy._id.toString() !== userId.toString()) {
        const error = new Error('Forbidden: You can only access your own novelties');
        error.statusCode = 403;
        throw error;
    }

    return novelty;
  }

  async updateNoveltyStatus(id, updateData, adminId) {
    const { status, actionsTaken } = updateData;
    const novelty = await Novelty.findById(id).populate('apprentice');

    if (!novelty || !novelty.isActive) {
        const error = new Error('Novelty not found');
        error.statusCode = 404;
        throw error;
    }

    // Validate transitions
    if (novelty.status === 'RESOLVED') {
        const error = new Error('Resolved novelties cannot be reopened');
        error.statusCode = 400;
        throw error;
    }

    const validTransitions = {
      'PENDING': ['IN_PROGRESS', 'RESOLVED'],
      'IN_PROGRESS': ['RESOLVED']
    };

    if (!validTransitions[novelty.status]?.includes(status)) {
        const error = new Error(`Invalid status transition from ${novelty.status} to ${status}`);
        error.statusCode = 400;
        throw error;
    }

    if (['IN_PROGRESS', 'RESOLVED'].includes(status) && (!actionsTaken || actionsTaken.length < 20)) {
        const error = new Error('Actions taken must be at least 20 characters when advancing status');
        error.statusCode = 400;
        throw error;
    }

    // Update fields
    novelty.status = status;
    novelty.actionsTaken = actionsTaken;

    if (status === 'RESOLVED') {
      novelty.resolvedBy = adminId;
      novelty.resolvedAt = new Date();
    }

    // Regenerate PDF
    const pdfInfo = await pdfGenerator.generateNoveltyPDF(novelty);
    novelty.pdfDriveId = pdfInfo.driveFileId;
    novelty.pdfDriveUrl = pdfInfo.driveFileUrl;

    await novelty.save();

    // Notify instructor
    try {
      await notificationService.send({
        type: 'NOVELTY_STATUS_UPDATED',
        recipients: [novelty.reportedBy.toString()],
        title: 'Novedad actualizada',
        message: `Novedad de ${novelty.apprentice.fullName} actualizada a ${status}`,
        metadata: { noveltyId: novelty._id }
      });
    } catch (err) {
      console.warn('[novelties.service] Error notificando estado:', err.message);
    }

    // Record Audit Log
    await recordAuditLog({
      action: status === 'RESOLVED' ? 'NOVELTY_RESOLVED' : 'NOVELTY_CREATED',
      entity: 'Novelty',
      entityId: novelty._id,
      performedBy: adminId,
      details: { status, actionsTaken }
    });

    return novelty;
  }

  async addAttachments(id, files, userId, role) {
    const novelty = await Novelty.findById(id);
    if (!novelty || !novelty.isActive) {
        const error = new Error('Novelty not found');
        error.statusCode = 404;
        throw error;
    }

    // Access check
    if (role === 'INSTRUCTOR' && novelty.reportedBy.toString() !== userId.toString()) {
        const error = new Error('Forbidden: You can only modify your own novelties');
        error.statusCode = 403;
        throw error;
    }

    if (novelty.status === 'RESOLVED') {
        const error = new Error('Cannot add attachments to a resolved novelty');
        error.statusCode = 400;
        throw error;
    }

    // Upload files
    if (files && files.length > 0) {
      const apprentice = await User.findById(novelty.apprentice).select('nationalId');
      for (const file of files) {
        try {
          const driveFile = await uploadToApprenticeFolder(file, apprentice.nationalId, 'novedades');
          novelty.attachments.push(driveFile);
        } catch (driveErr) {
          console.error('[Google Drive] Error uploading novelty attachment:', driveErr.message);
          novelty.attachments.push({
            fileName: file.originalname || 'archivo.pdf',
            driveFileId: null,
            driveFileUrl: null
          });
        }
      }
    }

    // Regenerate PDF
    const pdfInfo = await pdfGenerator.generateNoveltyPDF(novelty);
    novelty.pdfDriveId = pdfInfo.driveFileId;
    novelty.pdfDriveUrl = pdfInfo.driveFileUrl;

    await novelty.save();

    return novelty;
  }

  async getNoveltiesByEP(productiveStageId) {
    const novelties = await Novelty.find({ productiveStage: productiveStageId, isActive: true })
      .sort({ createdAt: -1 });

    const stats = {
      total: novelties.length,
      pending: novelties.filter(n => n.status === 'PENDING').length,
      inProgress: novelties.filter(n => n.status === 'IN_PROGRESS').length,
      resolved: novelties.filter(n => n.status === 'RESOLVED').length,
      novelties
    };

    return stats;
  }

  async getNoveltyHistory(productiveStageId) {
    const novelties = await Novelty.find({ productiveStage: productiveStageId, isActive: true })
      .populate('apprentice', 'fullName')
      .populate('reportedBy', 'fullName')
      .populate('resolvedBy', 'fullName')
      .sort({ createdAt: -1 });

    return novelties;
  }

  async getNoveltyStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const [allNovelties, allResolvedThisMonth] = await Promise.all([
      Novelty.find({ isActive: true }),
      Novelty.find({ isActive: true, status: 'RESOLVED', resolvedAt: { $gte: startOfMonth } })
    ]);

    const pending = allNovelties.filter(n => n.status === 'PENDING');
    const inProgress = allNovelties.filter(n => n.status === 'IN_PROGRESS');
    const criticalUnattended = pending.filter(n => n.createdAt < threeDaysAgo);

    const byType = {};
    allNovelties.forEach(n => {
      byType[n.type] = (byType[n.type] || 0) + 1;
    });

    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      const created = allNovelties.filter(n => n.createdAt >= monthStart && n.createdAt <= monthEnd).length;
      const resolved = allNovelties.filter(n => n.resolvedAt && n.resolvedAt >= monthStart && n.resolvedAt <= monthEnd).length;
      monthlyTrends.push({
        month: d.toLocaleString('es-CO', { month: 'short' }),
        year: d.getFullYear(),
        created,
        resolved
      });
    }

    const byInstructor = {};
    for (const n of allNovelties) {
      if (n.reportedBy) {
        const id = n.reportedBy.toString();
        if (!byInstructor[id]) byInstructor[id] = { instructorId: id, count: 0 };
        byInstructor[id].count++;
      }
    }
    const byInstructorList = Object.values(byInstructor)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const resolvedNovelties = allNovelties.filter(n => n.status === 'RESOLVED' && n.createdAt && n.resolvedAt);
    let avgResolutionHours = 0;
    if (resolvedNovelties.length > 0) {
      const totalMs = resolvedNovelties.reduce((sum, n) => sum + (new Date(n.resolvedAt) - new Date(n.createdAt)), 0);
      avgResolutionHours = Math.round(totalMs / resolvedNovelties.length / (1000 * 60 * 60));
    }

    const urgentAlerts = criticalUnattended
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map(n => ({
        _id: n._id,
        type: n.type,
        description: n.description.substring(0, 120),
        createdAt: n.createdAt,
        apprenticeName: '—',
        hoursElapsed: Math.round((now - new Date(n.createdAt)) / (1000 * 60 * 60))
      }))
      .slice(0, 10);

    return {
      kpis: {
        totalActive: allNovelties.filter(n => n.status !== 'RESOLVED').length,
        pending: pending.length,
        inProgress: inProgress.length,
        resolvedThisMonth: allResolvedThisMonth.length,
        criticalUnattended: criticalUnattended.length
      },
      visualData: {
        byType: {
          labels: Object.keys(byType),
          values: Object.values(byType)
        },
        monthlyTrends,
        byInstructor: byInstructorList,
        avgResolutionHours
      },
      urgentAlerts
    };
  }

  async addTimelineEvent(noveltyId, { event, description, authorId, authorRole }) {
    const novelty = await Novelty.findById(noveltyId);
    if (!novelty) {
      const error = new Error('Novelty not found');
      error.statusCode = 404;
      throw error;
    }

    novelty.timeline.push({
      event,
      description: description || '',
      author: authorId,
      authorRole: authorRole || 'ADMIN',
      createdAt: new Date()
    });

    await novelty.save();
    return novelty;
  }

  async getNoveltyDetail(noveltyId) {
    const novelty = await Novelty.findById(noveltyId)
      .populate('apprentice', 'fullName email nationalId enrollmentNumber program trainingLevel trainingCenter')
      .populate('reportedBy', 'fullName email nationalId')
      .populate('resolvedBy', 'fullName email nationalId')
      .populate('timeline.author', 'fullName role')
      .populate('generatedDocuments.generatedBy', 'fullName')
      .populate('productiveStage', 'modality status startDate estimatedEndDate');

    if (!novelty) {
      const error = new Error('Novelty not found');
      error.statusCode = 404;
      throw error;
    }

    const apprenticeHistory = await Promise.all([
      Novelty.find({ apprentice: novelty.apprentice._id, isActive: true, _id: { $ne: noveltyId } })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('type severity status createdAt'),
      Tracking.find({ apprentice: novelty.apprentice._id, isActive: true })
        .sort({ executedDate: -1 })
        .limit(5)
        .select('type status executedDate trackingNumber'),
      Bitacora.find({ apprentice: novelty.apprentice._id, isActive: true, status: 'APPROVED' })
        .sort({ reviewedAt: -1 })
        .limit(5)
        .select('logbookNumber reviewedAt assignedHours')
    ]);

    return {
      ...novelty.toObject(),
      apprenticeHistory: {
        previousNovelties: apprenticeHistory[0],
        recentTrackings: apprenticeHistory[1],
        recentBitacoras: apprenticeHistory[2]
      }
    };
  }
}

export default new NoveltyService();
