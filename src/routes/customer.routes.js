import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customer.controller.js';
import { verifyJwt } from '../middlewares/auth.middleware.js';

const router = Router();

// Public / Authenticated read routes
router.get('/', getCustomers);
router.get('/:id', getCustomerById);

// Protected mutation routes
router.post('/', verifyJwt, createCustomer);
router.put('/:id', verifyJwt, updateCustomer);
router.delete('/:id', verifyJwt, deleteCustomer);

export default router;
