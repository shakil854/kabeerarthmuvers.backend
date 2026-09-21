import { Router } from 'express';
import { getEarnings } from '../controllers/earning.controller.js';

const router = Router();

// Public / Authenticated analytics endpoint
router.get('/', getEarnings);

export default router;
