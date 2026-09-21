import { Op } from 'sequelize';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import Expense from '../models/Expense.model.js';
import Vehicle from '../models/Vehicle.model.js';

/**
 * Standard include options for Expense queries
 */
const expenseIncludes = [
  {
    model: Vehicle,
    as: 'vehicle',
    attributes: ['id', 'vehicleNumber', 'chassisNumber', 'engineNumber'],
    required: false,
  },
];

/**
 * @desc Get all expenses (with optional query filters: search, vehicleId, startDate, endDate)
 * @route GET /api/v1/expenses
 * @access Public / Authenticated
 */
export const getExpenses = asyncHandler(async (req, res) => {
  const { search, vehicleId, startDate, endDate } = req.query;

  const whereClause = {};

  if (vehicleId && !isNaN(parseInt(vehicleId, 10))) {
    whereClause.vehicleId = parseInt(vehicleId, 10);
  }

  if (startDate && endDate) {
    whereClause.expenseDate = {
      [Op.between]: [startDate, endDate],
    };
  } else if (startDate) {
    whereClause.expenseDate = {
      [Op.gte]: startDate,
    };
  } else if (endDate) {
    whereClause.expenseDate = {
      [Op.lte]: endDate,
    };
  }

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    whereClause[Op.or] = [
      { vehicleNumber: { [Op.like]: term } },
      { '$vehicle.vehicleNumber$': { [Op.like]: term } },
      { note: { [Op.like]: term } },
    ];
  }

  const expenses = await Expense.findAll({
    where: whereClause,
    include: expenseIncludes,
    order: [
      ['expenseDate', 'DESC'],
      ['createdAt', 'DESC'],
    ],
  });

  return res.status(200).json(
    new ApiResponse(200, expenses, 'Expenses fetched successfully')
  );
});

/**
 * @desc Get expense by ID
 * @route GET /api/v1/expenses/:id
 * @access Public / Authenticated
 */
export const getExpenseById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const expense = await Expense.findByPk(id, {
    include: expenseIncludes,
  });

  if (!expense) {
    throw new ApiError(404, 'Expense record not found.');
  }

  return res.status(200).json(
    new ApiResponse(200, expense, 'Expense fetched successfully')
  );
});

/**
 * @desc Create a new expense
 * @route POST /api/v1/expenses
 * @access Authenticated
 */
export const createExpense = asyncHandler(async (req, res) => {
  const {
    vehicleId,
    diesel,
    driver,
    maintenance,
    note,
    expenseDate,
  } = req.body;

  let resolvedVehicleId = null;
  let resolvedVehicleNumber = null;

  if (vehicleId) {
    const vehicle = await Vehicle.findByPk(vehicleId);
    if (vehicle) {
      resolvedVehicleId = vehicle.id;
      resolvedVehicleNumber = vehicle.vehicleNumber;
    }
  }

  const parsedDiesel = parseFloat(diesel) || 0;
  const parsedDriver = parseFloat(driver) || 0;
  const parsedMaintenance = parseFloat(maintenance) || 0;

  if (parsedDiesel < 0 || parsedDriver < 0 || parsedMaintenance < 0) {
    throw new ApiError(400, 'Expense amounts cannot be negative.');
  }

  const totalAmount = parseFloat((parsedDiesel + parsedDriver + parsedMaintenance).toFixed(2));
  const finalExpenseDate = expenseDate || new Date().toISOString().split('T')[0];

  const newExpense = await Expense.create({
    vehicleId: resolvedVehicleId,
    vehicleNumber: resolvedVehicleNumber,
    diesel: parsedDiesel,
    driver: parsedDriver,
    maintenance: parsedMaintenance,
    totalAmount,
    note: note && note.trim() ? note.trim() : null,
    expenseDate: finalExpenseDate,
  });

  const createdExpense = await Expense.findByPk(newExpense.id, {
    include: expenseIncludes,
  });

  return res.status(201).json(
    new ApiResponse(201, createdExpense, 'Expense created successfully')
  );
});

/**
 * @desc Update expense by ID
 * @route PUT /api/v1/expenses/:id
 * @access Authenticated
 */
export const updateExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    vehicleId,
    diesel,
    driver,
    maintenance,
    note,
    expenseDate,
  } = req.body;

  const expense = await Expense.findByPk(id);
  if (!expense) {
    throw new ApiError(404, 'Expense record not found.');
  }

  if (vehicleId) {
    const vehicle = await Vehicle.findByPk(vehicleId);
    if (!vehicle) {
      throw new ApiError(404, 'Selected vehicle does not exist.');
    }
    expense.vehicleId = vehicle.id;
    expense.vehicleNumber = vehicle.vehicleNumber;
  }

  if (diesel !== undefined) {
    const d = parseFloat(diesel) || 0;
    if (d < 0) throw new ApiError(400, 'Diesel expense cannot be negative.');
    expense.diesel = d;
  }

  if (driver !== undefined) {
    const dr = parseFloat(driver) || 0;
    if (dr < 0) throw new ApiError(400, 'Driver expense cannot be negative.');
    expense.driver = dr;
  }

  if (maintenance !== undefined) {
    const m = parseFloat(maintenance) || 0;
    if (m < 0) throw new ApiError(400, 'Maintenance expense cannot be negative.');
    expense.maintenance = m;
  }

  if (note !== undefined) {
    expense.note = note && note.trim() ? note.trim() : null;
  }

  if (expenseDate) {
    expense.expenseDate = expenseDate;
  }

  // Recalculate total amount
  const d = parseFloat(expense.diesel) || 0;
  const dr = parseFloat(expense.driver) || 0;
  const m = parseFloat(expense.maintenance) || 0;
  expense.totalAmount = parseFloat((d + dr + m).toFixed(2));

  await expense.save();

  const updatedExpense = await Expense.findByPk(id, {
    include: expenseIncludes,
  });

  return res.status(200).json(
    new ApiResponse(200, updatedExpense, 'Expense updated successfully')
  );
});

/**
 * @desc Delete expense by ID
 * @route DELETE /api/v1/expenses/:id
 * @access Authenticated
 */
export const deleteExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const expense = await Expense.findByPk(id);
  if (!expense) {
    throw new ApiError(404, 'Expense record not found.');
  }

  await expense.destroy();

  return res.status(200).json(
    new ApiResponse(200, { id: Number(id) }, 'Expense deleted successfully')
  );
});
