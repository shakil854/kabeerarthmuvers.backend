import { Op } from 'sequelize';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import Sale from '../models/Sale.model.js';
import Customer from '../models/Customer.model.js';
import Category from '../models/Category.model.js';
import Vehicle from '../models/Vehicle.model.js';

/**
 * Standard include options for Sale queries
 */
const saleIncludes = [
  {
    model: Customer,
    as: 'customer',
    attributes: ['id', 'customerName', 'companyName', 'mobile', 'address'],
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name'],
        required: false,
      },
    ],
    required: false,
  },
  {
    model: Vehicle,
    as: 'vehicle',
    attributes: ['id', 'vehicleNumber', 'chassisNumber'],
    required: false,
  },
];

/**
 * @desc Get all sales (with optional query filters: search, paymentMode, unit, customerId, paymentStatus, vehicleId)
 * @route GET /api/v1/sales
 * @access Public / Authenticated
 */
export const getSales = asyncHandler(async (req, res) => {
  const { search, paymentMode, unit, customerId, paymentStatus, vehicleId } = req.query;

  const whereClause = {};

  if (customerId && !isNaN(parseInt(customerId, 10))) {
    whereClause.customerId = parseInt(customerId, 10);
  }

  if (vehicleId && !isNaN(parseInt(vehicleId, 10))) {
    whereClause.vehicleId = parseInt(vehicleId, 10);
  }

  if (paymentStatus && ['Pending', 'Paid'].includes(paymentStatus)) {
    whereClause.paymentStatus = paymentStatus;
  }

  if (paymentMode && ['Online', 'Cash'].includes(paymentMode)) {
    whereClause.paymentMode = paymentMode;
  }

  if (unit && ['Ton', 'Pcs'].includes(unit)) {
    whereClause.unit = unit;
  }

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    whereClause[Op.or] = [
      { '$customer.customerName$': { [Op.like]: term } },
      { '$customer.companyName$': { [Op.like]: term } },
      { '$customer.mobile$': { [Op.like]: term } },
      { paymentMode: { [Op.like]: term } },
      { paymentStatus: { [Op.like]: term } },
      { note: { [Op.like]: term } },
    ];
  }

  const sales = await Sale.findAll({
    where: whereClause,
    include: saleIncludes,
    order: [
      ['saleDate', 'DESC'],
      ['createdAt', 'DESC'],
    ],
  });

  return res.status(200).json(
    new ApiResponse(200, sales, 'Sales fetched successfully')
  );
});

/**
 * @desc Get sale by ID
 * @route GET /api/v1/sales/:id
 * @access Public / Authenticated
 */
export const getSaleById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const sale = await Sale.findByPk(id, {
    include: saleIncludes,
  });

  if (!sale) {
    throw new ApiError(404, 'Sale record not found.');
  }

  return res.status(200).json(
    new ApiResponse(200, sale, 'Sale fetched successfully')
  );
});

/**
 * @desc Create a new sale
 * @route POST /api/v1/sales
 * @access Authenticated
 */
export const createSale = asyncHandler(async (req, res) => {
  const {
    customerId,
    vehicleId,
    vehicleNumber,
    paymentMode,
    paymentStatus,
    paymentDate,
    quantity,
    unit,
    price,
    note,
    saleDate,
  } = req.body;

  // Validation: Customer is required
  if (!customerId) {
    throw new ApiError(400, 'Customer is required.');
  }

  const customer = await Customer.findByPk(customerId);
  if (!customer) {
    throw new ApiError(404, 'Selected customer does not exist.');
  }

  // Vehicle resolution (optional)
  let finalVehicleId = null;
  let finalVehicleNumber = null;
  if (vehicleId) {
    const parsedVId = parseInt(vehicleId, 10);
    if (!isNaN(parsedVId)) {
      const vRecord = await Vehicle.findByPk(parsedVId);
      if (vRecord) {
        finalVehicleId = vRecord.id;
        finalVehicleNumber = vRecord.vehicleNumber;
      }
    }
  } else if (vehicleNumber && typeof vehicleNumber === 'string' && vehicleNumber.trim()) {
    finalVehicleNumber = vehicleNumber.trim().toUpperCase();
  }

  // Validation: Quantity and Price
  const parsedQty = parseFloat(quantity);
  if (isNaN(parsedQty) || parsedQty <= 0) {
    throw new ApiError(400, 'Valid quantity greater than 0 is required.');
  }

  const parsedPrice = parseFloat(price);
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    throw new ApiError(400, 'Valid price (rate) is required.');
  }

  // Payment Mode
  const validPaymentMode = paymentMode === 'Online' ? 'Online' : 'Cash';

  // Payment Status & Date
  const validPaymentStatus = paymentStatus === 'Paid' ? 'Paid' : 'Pending';
  let finalPaymentDate = null;
  if (validPaymentStatus === 'Paid') {
    finalPaymentDate = paymentDate || new Date().toISOString().split('T')[0];
  }

  // Unit
  const validUnit = unit === 'Pcs' ? 'Pcs' : 'Ton';

  const totalAmount = parseFloat((parsedQty * parsedPrice).toFixed(2));
  const finalSaleDate = saleDate || new Date().toISOString().split('T')[0];

  const newSale = await Sale.create({
    customerId: customer.id,
    vehicleId: finalVehicleId,
    vehicleNumber: finalVehicleNumber,
    paymentMode: validPaymentMode,
    paymentStatus: validPaymentStatus,
    paymentDate: finalPaymentDate,
    quantity: parsedQty,
    unit: validUnit,
    price: parsedPrice,
    totalAmount,
    note: note && note.trim() ? note.trim() : null,
    saleDate: finalSaleDate,
  });

  const createdSale = await Sale.findByPk(newSale.id, {
    include: saleIncludes,
  });

  return res.status(201).json(
    new ApiResponse(201, createdSale, 'Sale created successfully')
  );
});

/**
 * @desc Update sale by ID
 * @route PUT /api/v1/sales/:id
 * @access Authenticated
 */
export const updateSale = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    customerId,
    vehicleId,
    vehicleNumber,
    paymentMode,
    paymentStatus,
    paymentDate,
    quantity,
    unit,
    price,
    note,
    saleDate,
  } = req.body;

  const sale = await Sale.findByPk(id);
  if (!sale) {
    throw new ApiError(404, 'Sale record not found.');
  }

  if (customerId) {
    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      throw new ApiError(404, 'Selected customer does not exist.');
    }
    sale.customerId = customer.id;
  }

  // Vehicle resolution (optional)
  if (vehicleId !== undefined) {
    if (vehicleId) {
      const parsedVId = parseInt(vehicleId, 10);
      if (!isNaN(parsedVId)) {
        const vRecord = await Vehicle.findByPk(parsedVId);
        if (vRecord) {
          sale.vehicleId = vRecord.id;
          sale.vehicleNumber = vRecord.vehicleNumber;
        } else {
          sale.vehicleId = parsedVId;
        }
      }
    } else {
      sale.vehicleId = null;
      sale.vehicleNumber = null;
    }
  } else if (vehicleNumber !== undefined) {
    sale.vehicleNumber = vehicleNumber && vehicleNumber.trim() ? vehicleNumber.trim().toUpperCase() : null;
  }

  if (quantity !== undefined) {
    const parsedQty = parseFloat(quantity);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      throw new ApiError(400, 'Valid quantity greater than 0 is required.');
    }
    sale.quantity = parsedQty;
  }

  if (price !== undefined) {
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      throw new ApiError(400, 'Valid price (rate) is required.');
    }
    sale.price = parsedPrice;
  }

  if (paymentMode) {
    sale.paymentMode = paymentMode === 'Online' ? 'Online' : 'Cash';
  }

  if (paymentStatus !== undefined) {
    sale.paymentStatus = paymentStatus === 'Paid' ? 'Paid' : 'Pending';
    if (sale.paymentStatus === 'Paid') {
      sale.paymentDate = paymentDate || sale.paymentDate || new Date().toISOString().split('T')[0];
    } else {
      sale.paymentDate = null;
    }
  } else if (paymentDate !== undefined) {
    sale.paymentDate = paymentDate;
  }

  if (unit) {
    sale.unit = unit === 'Pcs' ? 'Pcs' : 'Ton';
  }

  if (note !== undefined) {
    sale.note = note && note.trim() ? note.trim() : null;
  }

  if (saleDate) {
    sale.saleDate = saleDate;
  }

  // Recalculate total amount
  const qty = parseFloat(sale.quantity) || 0;
  const prc = parseFloat(sale.price) || 0;
  sale.totalAmount = parseFloat((qty * prc).toFixed(2));

  await sale.save();

  const updatedSale = await Sale.findByPk(id, {
    include: saleIncludes,
  });

  return res.status(200).json(
    new ApiResponse(200, updatedSale, 'Sale updated successfully')
  );
});

/**
 * @desc Confirm payment received for a sale
 * @route PATCH /api/v1/sales/:id/confirm-payment
 * @access Authenticated
 */
export const confirmPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { paymentDate } = req.body;

  const sale = await Sale.findByPk(id);
  if (!sale) {
    throw new ApiError(404, 'Sale record not found.');
  }

  sale.paymentStatus = 'Paid';
  sale.paymentDate = paymentDate || new Date().toISOString().split('T')[0];
  await sale.save();

  const updatedSale = await Sale.findByPk(id, {
    include: saleIncludes,
  });

  return res.status(200).json(
    new ApiResponse(200, updatedSale, 'Payment confirmed successfully')
  );
});

/**
 * @desc Delete sale by ID
 * @route DELETE /api/v1/sales/:id
 * @access Authenticated
 */
export const deleteSale = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const sale = await Sale.findByPk(id);
  if (!sale) {
    throw new ApiError(404, 'Sale record not found.');
  }

  await sale.destroy();

  return res.status(200).json(
    new ApiResponse(200, { id: Number(id) }, 'Sale deleted successfully')
  );
});
