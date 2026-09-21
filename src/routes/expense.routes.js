import { Router } from 'express';
import {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
} from '../controllers/expense.controller.js';
import { verifyJwt } from '../middlewares/auth.middleware.js';

const router = Router();

// Public / Authenticated read routes
router.get('/', getExpenses);
router.get('/:id', getExpenseById);

// Protected mutation routes
router.post('/', verifyJwt, createExpense);
router.put('/:id', verifyJwt, updateExpense);
router.delete('/:id', verifyJwt, deleteExpense);

export default router;
