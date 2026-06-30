import hourValidationService from '../services/hourValidation.service.js';
import { successResponse, errorResponse } from '../utils/response.util.js';

class HourValidationController {

  async getPendingValidations(req, res) {
    try {
      const { page, limit, instructorId } = req.query;
      const result = await hourValidationService.getPendingValidations({ page, limit, instructorId });
      return successResponse(res, 200, 'Validaciones pendientes obtenidas', result);
    } catch (error) {
      return errorResponse(res, error.statusCode || 500, error.message);
    }
  }

  async validateHours(req, res) {
    try {
      const { source, id } = req.body;
      const result = await hourValidationService.validateHours({ source, id, performedBy: req.user.id });
      return successResponse(res, 200, 'Horas validadas correctamente', result);
    } catch (error) {
      return errorResponse(res, error.statusCode || 500, error.message);
    }
  }

  async rejectHours(req, res) {
    try {
      const { source, id, reason } = req.body;
      const result = await hourValidationService.rejectHours({ source, id, reason, performedBy: req.user.id });
      return successResponse(res, 200, 'Horas rechazadas correctamente', result);
    } catch (error) {
      return errorResponse(res, error.statusCode || 500, error.message);
    }
  }
}

const hourValidationController = new HourValidationController();
export default hourValidationController;
