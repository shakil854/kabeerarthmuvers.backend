import { Op } from 'sequelize';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import Vehicle from '../models/Vehicle.model.js';

/**
 * @desc Get all vehicles (optional search query)
 * @route GET /api/v1/vehicles
 * @access Public / Authenticated
 */
export const getVehicles = asyncHandler(async (req, res) => {
  const { search } = req.query;

  const whereClause = {};
  if (search && search.trim()) {
    const term = `%${search.trim().toUpperCase()}%`;
    whereClause[Op.or] = [
      { vehicleNumber: { [Op.like]: term } },
      { chassisNumber: { [Op.like]: term } },
      { engineNumber: { [Op.like]: term } },
    ];
  }

  const vehicles = await Vehicle.findAll({
    where: whereClause,
    order: [['createdAt', 'DESC']],
  });

  return res.status(200).json(
    new ApiResponse(200, vehicles, 'Vehicles fetched successfully')
  );
});

/**
 * @desc Get vehicle by ID
 * @route GET /api/v1/vehicles/:id
 * @access Public / Authenticated
 */
export const getVehicleById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const vehicle = await Vehicle.findByPk(id);
  if (!vehicle) {
    throw new ApiError(404, 'Vehicle not found.');
  }

  return res.status(200).json(
    new ApiResponse(200, vehicle, 'Vehicle fetched successfully')
  );
});

/**
 * @desc Create a new vehicle
 * @route POST /api/v1/vehicles
 * @access Authenticated
 */
export const createVehicle = asyncHandler(async (req, res) => {
  const { vehicleNumber, chassisNumber, engineNumber } = req.body;

  if (!vehicleNumber || !vehicleNumber.trim()) {
    throw new ApiError(400, 'Vehicle number is required.');
  }

  const formattedVehicleNo = vehicleNumber.trim().toUpperCase();
  const formattedChassisNo = chassisNumber && chassisNumber.trim() ? chassisNumber.trim().toUpperCase() : null;
  const formattedEngineNo = engineNumber && engineNumber.trim() ? engineNumber.trim().toUpperCase() : null;

  // Check if vehicle number already exists
  const existingVehicle = await Vehicle.findOne({
    where: {
      vehicleNumber: formattedVehicleNo,
    },
  });

  if (existingVehicle) {
    throw new ApiError(409, `Vehicle number "${formattedVehicleNo}" already exists.`);
  }

  const vehicle = await Vehicle.create({
    vehicleNumber: formattedVehicleNo,
    chassisNumber: formattedChassisNo,
    engineNumber: formattedEngineNo,
  });

  return res.status(201).json(
    new ApiResponse(201, vehicle, 'Vehicle created successfully')
  );
});

/**
 * @desc Update vehicle by ID
 * @route PUT /api/v1/vehicles/:id
 * @access Authenticated
 */
export const updateVehicle = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { vehicleNumber, chassisNumber, engineNumber } = req.body;

  if (!vehicleNumber || !vehicleNumber.trim()) {
    throw new ApiError(400, 'Vehicle number is required.');
  }

  const formattedVehicleNo = vehicleNumber.trim().toUpperCase();
  const formattedChassisNo = chassisNumber && chassisNumber.trim() ? chassisNumber.trim().toUpperCase() : null;
  const formattedEngineNo = engineNumber && engineNumber.trim() ? engineNumber.trim().toUpperCase() : null;

  const vehicle = await Vehicle.findByPk(id);
  if (!vehicle) {
    throw new ApiError(404, 'Vehicle not found.');
  }

  // Check if another vehicle already has this vehicle number
  const duplicate = await Vehicle.findOne({
    where: {
      vehicleNumber: formattedVehicleNo,
      id: { [Op.ne]: id },
    },
  });

  if (duplicate) {
    throw new ApiError(409, `Another vehicle with number "${formattedVehicleNo}" already exists.`);
  }

  vehicle.vehicleNumber = formattedVehicleNo;
  vehicle.chassisNumber = formattedChassisNo;
  vehicle.engineNumber = formattedEngineNo;
  await vehicle.save();

  return res.status(200).json(
    new ApiResponse(200, vehicle, 'Vehicle updated successfully')
  );
});

/**
 * @desc Delete vehicle by ID
 * @route DELETE /api/v1/vehicles/:id
 * @access Authenticated
 */
export const deleteVehicle = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const vehicle = await Vehicle.findByPk(id);
  if (!vehicle) {
    throw new ApiError(404, 'Vehicle not found.');
  }

  await vehicle.destroy();

  return res.status(200).json(
    new ApiResponse(200, { id: Number(id) }, 'Vehicle deleted successfully')
  );
});
