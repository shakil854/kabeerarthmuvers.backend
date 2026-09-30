import { Router } from 'express';
import {
  getPayments,
  createPayment,
  deletePayment,
  getDebitSummary,
} from '../controllers/payment.controller.js';
import { verifyJwt } from '../middlewares/auth.middleware.js';

const router = Router();

// Public / Authenticated read routes
router.get('/', getPayments);
router.get('/summary', getDebitSummary);

// Protected mutation routes
router.post('/', verifyJwt, createPayment);
router.delete('/:id', verifyJwt, deletePayment);

export default router;
