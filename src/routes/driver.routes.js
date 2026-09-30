import { Router } from 'express';
import {
  getDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver,
} from '../controllers/driver.controller.js';
import { verifyJwt } from '../middlewares/auth.middleware.js';

const router = Router();

// Public / Authenticated read routes
router.get('/', getDrivers);
router.get('/:id', getDriverById);

// Protected mutation routes
router.post('/', verifyJwt, createDriver);
router.put('/:id', verifyJwt, updateDriver);
router.delete('/:id', verifyJwt, deleteDriver);

export default router;
