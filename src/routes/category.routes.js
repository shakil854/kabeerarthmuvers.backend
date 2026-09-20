import { Router } from 'express';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller.js';
import { verifyJwt } from '../middlewares/auth.middleware.js';

const router = Router();

// Public / Authenticated read routes
router.get('/', getCategories);
router.get('/:id', getCategoryById);

// Protected mutation routes
router.post('/', verifyJwt, createCategory);
router.put('/:id', verifyJwt, updateCategory);
router.delete('/:id', verifyJwt, deleteCategory);

export default router;
