import Bitacora from '../models/Bitacora.model.js';
import Tracking from '../models/Tracking.model.js';
import ProductiveStage from '../models/ProductiveStage.model.js';
import User from '../models/User.model.js';
import HourRecord from '../models/HourRecord.model.js';
import { successResponse, errorResponse } from '../utils/response.util.js';

class DashboardController {
  
  // ==========================
  // APPRENTICE DASHBOARD
  // ==========================
  async getApprenticeStats(req, res) {
    try {
      const apprenticeId = req.user.id;

      // 1. Bitacoras (Progreso 3/12 etc)
      // Find active ProductiveStage to know maxBitacoras
      const activeStage = await ProductiveStage.findOne({
        apprentice: apprenticeId,
        isActive: true,
        isHistorical: false
      });

      const maxBitacoras = activeStage?.maxBitacoras || 12;
      
      const completedBitacoras = await Bitacora.countDocuments({
        apprentice: apprenticeId,
        status: 'APPROVED',
        isActive: true
      });

      // 2. Proximos Seguimientos (Próximos Trackings Scheduled)
      const nextTrackings = await Tracking.find({
        apprentice: apprenticeId,
        status: 'SCHEDULED',
        isActive: true
      }).sort({ scheduledDate: 1 }).limit(5);

      const stats = {
        bitacoras: {
          completed: completedBitacoras,
          total: maxBitacoras
        },
        nextTrackings: nextTrackings.map(t => ({
          id: t._id,
          trackingNumber: t.trackingNumber,
          scheduledDate: t.scheduledDate,
          status: t.status,
          type: t.type
        }))
      };

      return successResponse(res, 200, 'Apprentice stats retrieved', stats);
    } catch (error) {
      return errorResponse(res, 500, error.message);
    }
  }

  // ==========================
  // INSTRUCTOR DASHBOARD
  // ==========================
  async getInstructorStats(req, res) {
    try {
      const instructorId = req.user.id;

      // 1. Aprendices Asignados (Active Productive Stages with this instructor in any role)
      const assignedApprentices = await ProductiveStage.countDocuments({
        $or: [
          { followupInstructor: instructorId },
          { technicalInstructor: instructorId },
          { projectInstructor: instructorId }
        ],
        isActive: true,
        isHistorical: false,
        status: { $in: ['ACTIVE', 'IN_FOLLOWUP', 'CERTIFICATION'] }
      });

      // 2. Horas del Mes
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      let totalHours = 0;
      const hourRecord = await HourRecord.findOne({
        instructor: instructorId,
        month: currentMonth,
        year: currentYear
      });
      if (hourRecord) {
        totalHours = hourRecord.totalHours;
      }
      const MAX_MONTHLY_HOURS = 40; // Default assumption

      // 3. Revisiones Pendientes (Bitacoras and Trackings in PENDING/SCHEDULED states)
      const pendingBitacoras = await Bitacora.find({
        instructor: instructorId,
        status: 'PENDING',
        isActive: true
      }).populate('apprentice', 'fullName nationalId').sort({ submittedAt: 1 }).limit(10);

      const mappedPendingReviews = pendingBitacoras.map(b => ({
        id: b._id,
        apprentice: b.apprentice?.fullName || 'Desconocido',
        documentId: b.apprentice?.nationalId,
        documentType: `Bitácora ${b.logbookNumber}`,
        date: b.submittedAt,
        status: b.status,
        type: 'BITACORA'
      }));

      const stats = {
        assignedApprentices,
        monthlyHours: {
          current: totalHours,
          max: MAX_MONTHLY_HOURS
        },
        pendingReviews: mappedPendingReviews
      };

      return successResponse(res, 200, 'Instructor stats retrieved', stats);
    } catch (error) {
      return errorResponse(res, 500, error.message);
    }
  }

  // ==========================
  // ADMIN DASHBOARD
  // ==========================
  async getAdminStats(req, res) {
    try {
      // 1. Etapas Activas
      const activeStagesCount = await ProductiveStage.countDocuments({
        status: { $in: ['ACTIVE', 'IN_FOLLOWUP', 'CERTIFICATION', 'PENDING_REGISTRATION', 'PENDING_APPROVAL'] },
        isActive: true,
        isHistorical: false
      });

      // 2. Instructores Activos
      const activeInstructorsCount = await User.countDocuments({
        role: 'INSTRUCTOR',
        status: 'ACTIVE',
        isActive: true
      });

      // 3. Aprendices
      const apprenticesCount = await User.countDocuments({
        role: 'APPRENTICE',
        isActive: true
      });

      const stats = {
        activeStages: activeStagesCount,
        instructors: activeInstructorsCount,
        apprentices: apprenticesCount
      };

      return successResponse(res, 200, 'Admin stats retrieved', stats);
    } catch (error) {
      return errorResponse(res, 500, error.message);
    }
  }
}

export default new DashboardController();
