import { Router } from 'express';
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../controllers/supplier.controller.js';
import { verifyJwt } from '../middlewares/auth.middleware.js';

const router = Router();

// Public / Authenticated read routes
router.get('/', getSuppliers);
router.get('/:id', getSupplierById);

// Protected mutation routes
router.post('/', verifyJwt, createSupplier);
router.put('/:id', verifyJwt, updateSupplier);
router.delete('/:id', verifyJwt, deleteSupplier);

export default router;
