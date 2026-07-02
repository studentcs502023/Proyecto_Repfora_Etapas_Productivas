import { Router } from 'express';
import { body, query, param } from 'express-validator';
import hourController from '../controllers/hours.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';
import { validateFields } from '../middlewares/validate.middleware.js';

const router = Router();

router.use(verifyToken);

// Admin only summary
router.get('/summary',
    checkRole('ADMIN'),
    [
        query('year').isInt({ min: 2020 }),
        query('month').isInt({ min: 1, max: 12 }),
        validateFields
    ],
    hourController.getSummary
);

// Admin or Instructor records
router.get('/instructors/:instructorId',
    [
        param('instructorId').isMongoId(),
        query('year').optional().isInt({ min: 2020 }),
        query('month').optional().isInt({ min: 1, max: 12 }),
        validateFields
    ],
    hourController.getInstructorHours
);

router.get('/instructors/:instructorId/month/:year/:month',
    [
        param('instructorId').isMongoId(),
        param('year').isInt({ min: 2020 }),
        param('month').isInt({ min: 1, max: 12 }),
        validateFields
    ],
    hourController.getMonthlyDetail
);

router.get('/instructors/:instructorId/report/:year/:month',
    [
        param('instructorId').isMongoId(),
        param('year').isInt({ min: 2020 }),
        param('month').isInt({ min: 1, max: 12 }),
        validateFields
    ],
    hourController.getReport
);

// Instructor: request charge (notify admin)
router.post('/instructors/:instructorId/month/:year/:month/request-charge',
    [
        param('instructorId').isMongoId(),
        param('year').isInt({ min: 2020 }),
        param('month').isInt({ min: 1, max: 12 }),
        validateFields
    ],
    hourController.requestCharge
);

// Admin: manage charge requests
router.get('/charge-requests/pending',
    checkRole('ADMIN'),
    hourController.getPendingChargeRequests
);

router.post('/charge-requests/:id/approve',
    checkRole('ADMIN'),
    [
        param('id').isMongoId(),
        validateFields
    ],
    hourController.approveChargeRequest
);

router.post('/charge-requests/:id/reject',
    checkRole('ADMIN'),
    [
        param('id').isMongoId(),
        body('reason').isString().isLength({ min: 10 }).withMessage('El motivo debe tener al menos 10 caracteres'),
        validateFields
    ],
    hourController.rejectChargeRequest
);

// Admin only actions
router.patch('/instructors/:instructorId/month/:year/:month/mark-paid',
    checkRole('ADMIN'),
    [
        param('instructorId').isMongoId(),
        param('year').isInt({ min: 2020 }),
        param('month').isInt({ min: 1, max: 12 }),
        body('amount').isNumeric({ min: 0.1 }),
        body('confirm').equals('true'),
        validateFields
    ],
    hourController.markPaid
);

router.patch('/instructors/:instructorId/carry-over',
    checkRole('ADMIN'),
    [
        param('instructorId').isMongoId(),
        body('fromYear').isInt(),
        body('fromMonth').isInt(),
        body('toYear').isInt(),
        body('toMonth').isInt(),
        validateFields
    ],
    hourController.carryOver
);

export default router;
