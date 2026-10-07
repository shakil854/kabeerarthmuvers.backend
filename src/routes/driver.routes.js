import { Router } from 'express';
import {
  getDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver,
  getDriverKhata,
  addDriverAdvance,
  updateDriverAdvance,
  deleteDriverAdvance,
  addDriverLeave,
  updateDriverLeave,
  deleteDriverLeave,
  settleDriverSalary,
  deleteDriverSalary,
} from '../controllers/driver.controller.js';
import { verifyJwt } from '../middlewares/auth.middleware.js';

const router = Router();

// Public / Authenticated read routes
router.get('/', getDrivers);
router.get('/:id', getDriverById);
router.get('/:id/khata', getDriverKhata);

// Driver CRUD
router.post('/', verifyJwt, createDriver);
router.put('/:id', verifyJwt, updateDriver);
router.delete('/:id', verifyJwt, deleteDriver);

// Driver Upad (Advance) routes
router.post('/:id/advances', verifyJwt, addDriverAdvance);
router.put('/advances/:advanceId', verifyJwt, updateDriverAdvance);
router.delete('/advances/:advanceId', verifyJwt, deleteDriverAdvance);

// Driver Raja (Leave) routes
router.post('/:id/leaves', verifyJwt, addDriverLeave);
router.put('/leaves/:leaveId', verifyJwt, updateDriverLeave);
router.delete('/leaves/:leaveId', verifyJwt, deleteDriverLeave);

// Driver Pagar (Salary) settlement routes
router.post('/:id/salaries', verifyJwt, settleDriverSalary);
router.delete('/salaries/:salaryId', verifyJwt, deleteDriverSalary);

export default router;
