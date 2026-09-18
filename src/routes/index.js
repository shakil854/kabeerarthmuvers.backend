import { Router } from 'express';
import healthRoutes from './health.routes.js';

const router = Router();

// Mount sub-routes
router.use('/health', healthRoutes);

// Export centralized router
export default router;
