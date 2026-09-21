import { Router } from 'express';
import {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} from '../controllers/vehicle.controller.js';
import { verifyJwt } from '../middlewares/auth.middleware.js';

const router = Router();

// Public / Authenticated read routes
router.get('/', getVehicles);
router.get('/:id', getVehicleById);

// Protected mutation routes
router.post('/', verifyJwt, createVehicle);
router.put('/:id', verifyJwt, updateVehicle);
router.delete('/:id', verifyJwt, deleteVehicle);

export default router;
