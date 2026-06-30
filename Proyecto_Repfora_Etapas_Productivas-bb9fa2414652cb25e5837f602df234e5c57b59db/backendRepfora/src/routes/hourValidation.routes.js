import { Router } from 'express';
import hourValidationController from '../controllers/hourValidation.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';
import { body, query } from 'express-validator';
import { validateFields } from '../middlewares/validate.middleware.js';

const router = Router();

router.use(verifyToken);

router.get('/pending',
  checkRole('ADMIN'),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('instructorId').optional().isMongoId()
  ],
  hourValidationController.getPendingValidations
);

router.patch('/validate',
  checkRole('ADMIN'),
  [
    body('source').isIn(['BITACORA', 'TRACKING']).withMessage('Origen inválido'),
    body('id').isMongoId().withMessage('ID inválido'),
    validateFields
  ],
  hourValidationController.validateHours
);

router.patch('/reject',
  checkRole('ADMIN'),
  [
    body('source').isIn(['BITACORA', 'TRACKING']).withMessage('Origen inválido'),
    body('id').isMongoId().withMessage('ID inválido'),
    body('reason').isString().isLength({ min: 10 }).withMessage('El motivo debe tener al menos 10 caracteres'),
    validateFields
  ],
  hourValidationController.rejectHours
);

export default router;
