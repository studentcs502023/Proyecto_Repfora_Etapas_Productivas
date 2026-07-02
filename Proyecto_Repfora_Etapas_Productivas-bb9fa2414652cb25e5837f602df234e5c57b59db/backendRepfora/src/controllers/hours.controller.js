import hourService from '../services/hours.service.js';
import { successResponse, errorResponse } from '../utils/response.util.js';

class HourController {
  async getInstructorHours(req, res) {
    try {
      const data = await hourService.getInstructorHours(req.user, req.params.instructorId, req.query);
      return successResponse(res, 200, 'Instructor hours retrieved', data);
    } catch (error) {
      return errorResponse(res, error.statusCode || 500, error.message);
    }
  }

  async getMonthlyDetail(req, res) {
    try {
      const { instructorId, year, month } = req.params;
      const data = await hourService.getMonthlyDetail(req.user, instructorId, year, month);
      return successResponse(res, 200, 'Monthly detail retrieved', data);
    } catch (error) {
      return errorResponse(res, error.statusCode || 500, error.message);
    }
  }

  async markPaid(req, res) {
    try {
      const { instructorId, year, month } = req.params;
      const record = await hourService.markPaid(req.user, instructorId, year, month, req.body);
      return successResponse(res, 200, 'Hours marked as paid', { record });
    } catch (error) {
      return errorResponse(res, error.statusCode || 500, error.message);
    }
  }

  async requestCharge(req, res) {
    try {
      const { instructorId, year, month } = req.params;
      const result = await hourService.requestCharge(req.user, instructorId, year, month);
      return successResponse(res, 200, 'Solicitud de cobro enviada al administrador', result);
    } catch (error) {
      return errorResponse(res, error.statusCode || 500, error.message);
    }
  }

  async getPendingChargeRequests(req, res) {
    try {
      const data = await hourService.getPendingChargeRequests();
      return successResponse(res, 200, 'Solicitudes de cobro pendientes', data);
    } catch (error) {
      return errorResponse(res, error.statusCode || 500, error.message);
    }
  }

  async approveChargeRequest(req, res) {
    try {
      const result = await hourService.approveChargeRequest(req.user, req.params.id);
      return successResponse(res, 200, 'Cobro aprobado exitosamente', result);
    } catch (error) {
      return errorResponse(res, error.statusCode || 500, error.message);
    }
  }

  async rejectChargeRequest(req, res) {
    try {
      const { reason } = req.body;
      const result = await hourService.rejectChargeRequest(req.user, req.params.id, reason);
      return successResponse(res, 200, 'Solicitud de cobro rechazada', result);
    } catch (error) {
      return errorResponse(res, error.statusCode || 500, error.message);
    }
  }

  async carryOver(req, res) {
    try {
      const result = await hourService.carryOver(req.user, req.params.instructorId, req.body);
      return successResponse(res, 200, 'Excess hours carried over', result);
    } catch (error) {
      return errorResponse(res, error.statusCode || 500, error.message);
    }
  }

  async getSummary(req, res) {
    try {
      const data = await hourService.getSummary(req.query);
      return successResponse(res, 200, 'Hours summary retrieved', data);
    } catch (error) {
      return errorResponse(res, error.statusCode || 500, error.message);
    }
  }

  async getReport(req, res) {
    try {
      const { instructorId, year, month } = req.params;
      const data = await hourService.getReport(req.user, instructorId, year, month);
      return successResponse(res, 200, 'Report retrieved', data);
    } catch (error) {
      return errorResponse(res, error.statusCode || 500, error.message);
    }
  }
}

export default new HourController();
