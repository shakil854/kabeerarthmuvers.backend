import { Op } from 'sequelize';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import Driver from '../models/Driver.model.js';

/**
 * @desc Get all drivers (with optional search filter)
 * @route GET /api/v1/drivers
 * @access Public / Authenticated
 */
export const getDrivers = asyncHandler(async (req, res) => {
  const { search } = req.query;

  const whereClause = {};
  if (search && search.trim()) {
    whereClause.name = {
      [Op.like]: `%${search.trim()}%`,
    };
  }

  const drivers = await Driver.findAll({
    where: whereClause,
    order: [['createdAt', 'DESC']],
  });

  return res.status(200).json(
    new ApiResponse(200, drivers, 'Drivers fetched successfully')
  );
});

/**
 * @desc Get driver by ID
 * @route GET /api/v1/drivers/:id
 * @access Public / Authenticated
 */
export const getDriverById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const driver = await Driver.findByPk(id);
  if (!driver) {
    throw new ApiError(404, 'Driver not found.');
  }

  return res.status(200).json(
    new ApiResponse(200, driver, 'Driver fetched successfully')
  );
});

/**
 * @desc Create a new driver
 * @route POST /api/v1/drivers
 * @access Authenticated
 */
export const createDriver = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    throw new ApiError(400, 'Driver name is required.');
  }

  const trimmedName = name.trim();

  // Check if driver name already exists (case-insensitive)
  const existingDriver = await Driver.findOne({
    where: {
      name: {
        [Op.like]: trimmedName,
      },
    },
  });

  if (existingDriver) {
    throw new ApiError(409, `Driver "${trimmedName}" already exists.`);
  }

  const driver = await Driver.create({ name: trimmedName });

  return res.status(201).json(
    new ApiResponse(201, driver, 'Driver created successfully')
  );
});

/**
 * @desc Update a driver by ID
 * @route PUT /api/v1/drivers/:id
 * @access Authenticated
 */
export const updateDriver = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name || !name.trim()) {
    throw new ApiError(400, 'Driver name is required.');
  }

  const trimmedName = name.trim();

  const driver = await Driver.findByPk(id);
  if (!driver) {
    throw new ApiError(404, 'Driver not found.');
  }

  // Check if another driver already has this name
  const duplicate = await Driver.findOne({
    where: {
      name: { [Op.like]: trimmedName },
      id: { [Op.ne]: id },
    },
  });

  if (duplicate) {
    throw new ApiError(409, `Another driver with name "${trimmedName}" already exists.`);
  }

  driver.name = trimmedName;
  await driver.save();

  return res.status(200).json(
    new ApiResponse(200, driver, 'Driver updated successfully')
  );
});

/**
 * @desc Delete driver by ID
 * @route DELETE /api/v1/drivers/:id
 * @access Authenticated
 */
export const deleteDriver = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const driver = await Driver.findByPk(id);
  if (!driver) {
    throw new ApiError(404, 'Driver not found.');
  }

  await driver.destroy();

  return res.status(200).json(
    new ApiResponse(200, { id: Number(id) }, 'Driver deleted successfully')
  );
});
