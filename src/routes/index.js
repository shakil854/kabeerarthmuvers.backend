import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';

const router = Router();

// Mount sub-routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

// Export centralized router
export default router;
