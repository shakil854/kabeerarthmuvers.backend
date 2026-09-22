import { Router } from 'express';
import {
  getSales,
  getSaleById,
  createSale,
  updateSale,
  confirmPayment,
  deleteSale,
} from '../controllers/sale.controller.js';
import { verifyJwt, optionalJwt } from '../middlewares/auth.middleware.js';

const router = Router();

// Public / Authenticated read routes
router.get('/', optionalJwt, getSales);
router.get('/:id', optionalJwt, getSaleById);

// Protected mutation routes
router.post('/', verifyJwt, createSale);
router.put('/:id', verifyJwt, updateSale);
router.patch('/:id/confirm-payment', verifyJwt, confirmPayment);
router.delete('/:id', verifyJwt, deleteSale);

export default router;
