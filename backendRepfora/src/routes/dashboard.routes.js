import { Router } from 'express';
import dashboardController from '../controllers/dashboard.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';

const router = Router();

router.use(verifyToken);

// Apprentice Dashboard
router.get('/apprentice', checkRole('APPRENTICE'), dashboardController.getApprenticeStats);

// Instructor Dashboard
router.get('/instructor', checkRole('INSTRUCTOR'), dashboardController.getInstructorStats);

// Admin Dashboard
router.get('/admin', checkRole('ADMIN'), dashboardController.getAdminStats);

export default router;
