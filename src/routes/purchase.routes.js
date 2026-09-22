import { Router } from 'express';
import {
  getPurchases,
  getPurchaseById,
  createPurchase,
  updatePurchase,
  confirmPayment,
  deletePurchase,
} from '../controllers/purchase.controller.js';
import { verifyJwt, optionalJwt } from '../middlewares/auth.middleware.js';

const router = Router();

// Public / Authenticated read routes
router.get('/', optionalJwt, getPurchases);
router.get('/:id', optionalJwt, getPurchaseById);

// Protected mutation routes
router.post('/', verifyJwt, createPurchase);
router.put('/:id', verifyJwt, updatePurchase);
router.patch('/:id/confirm-payment', verifyJwt, confirmPayment);
router.delete('/:id', verifyJwt, deletePurchase);

export default router;
