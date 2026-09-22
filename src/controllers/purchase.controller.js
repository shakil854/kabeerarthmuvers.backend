import { Op } from 'sequelize';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import Purchase from '../models/Purchase.model.js';
import Supplier from '../models/Supplier.model.js';
import Vehicle from '../models/Vehicle.model.js';
import Category from '../models/Category.model.js';

/**
 * Standard include options for Purchase queries
 */
const purchaseIncludes = [
  {
    model: Supplier,
    as: 'supplier',
    attributes: ['id', 'name', 'mobile', 'address'],
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
    attributes: ['id', 'vehicleNumber', 'chassisNumber', 'engineNumber'],
    required: false,
  },
];

/**
 * @desc Get all purchases (with optional query filters: search, paymentMode, unit, supplierId, paymentStatus)
 * @route GET /api/v1/purchases
 * @access Public / Authenticated
 */
export const getPurchases = asyncHandler(async (req, res) => {
  const { search, paymentMode, unit, supplierId, paymentStatus } = req.query;

  const whereClause = {};

  // If logged in as a supplier, strictly restrict to their own purchases
  if (req.user && req.user.supplierId) {
    whereClause.supplierId = req.user.supplierId;
  } else if (supplierId && !isNaN(parseInt(supplierId, 10))) {
    whereClause.supplierId = parseInt(supplierId, 10);
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
      { '$supplier.name$': { [Op.like]: term } },
      { '$supplier.mobile$': { [Op.like]: term } },
      { vehicleNumber: { [Op.like]: term } },
      { '$vehicle.vehicleNumber$': { [Op.like]: term } },
      { paymentMode: { [Op.like]: term } },
      { paymentStatus: { [Op.like]: term } },
      { note: { [Op.like]: term } },
    ];
  }

  const purchases = await Purchase.findAll({
    where: whereClause,
    include: purchaseIncludes,
    order: [
      ['purchaseDate', 'DESC'],
      ['createdAt', 'DESC'],
    ],
  });

  return res.status(200).json(
    new ApiResponse(200, purchases, 'Purchases fetched successfully')
  );
});

/**
 * @desc Get purchase by ID
 * @route GET /api/v1/purchases/:id
 * @access Public / Authenticated
 */
export const getPurchaseById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const purchase = await Purchase.findByPk(id, {
    include: purchaseIncludes,
  });

  if (!purchase) {
    throw new ApiError(404, 'Purchase record not found.');
  }

  return res.status(200).json(
    new ApiResponse(200, purchase, 'Purchase fetched successfully')
  );
});

/**
 * @desc Create a new purchase
 * @route POST /api/v1/purchases
 * @access Authenticated
 */
export const createPurchase = asyncHandler(async (req, res) => {
  const {
    supplierId,
    vehicleId,
    vehicleNumber,
    paymentMode,
    paymentStatus,
    paymentDate,
    quantity,
    unit,
    price,
    note,
    purchaseDate,
  } = req.body;

  // Validation: Supplier is required
  if (!supplierId) {
    throw new ApiError(400, 'Supplier is required.');
  }

  const supplier = await Supplier.findByPk(supplierId);
  if (!supplier) {
    throw new ApiError(404, 'Selected supplier does not exist.');
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

  // Vehicle resolution
  let resolvedVehicleId = null;
  let resolvedVehicleNumber = vehicleNumber ? vehicleNumber.trim().toUpperCase() : null;

  if (vehicleId) {
    const vehicle = await Vehicle.findByPk(vehicleId);
    if (vehicle) {
      resolvedVehicleId = vehicle.id;
      if (!resolvedVehicleNumber) {
        resolvedVehicleNumber = vehicle.vehicleNumber;
      }
    }
  }

  const totalAmount = parseFloat((parsedQty * parsedPrice).toFixed(2));
  const finalPurchaseDate = purchaseDate || new Date().toISOString().split('T')[0];

  const newPurchase = await Purchase.create({
    supplierId: supplier.id,
    vehicleId: resolvedVehicleId,
    vehicleNumber: resolvedVehicleNumber,
    paymentMode: validPaymentMode,
    paymentStatus: validPaymentStatus,
    paymentDate: finalPaymentDate,
    quantity: parsedQty,
    unit: validUnit,
    price: parsedPrice,
    totalAmount,
    note: note && note.trim() ? note.trim() : null,
    purchaseDate: finalPurchaseDate,
  });

  const createdPurchase = await Purchase.findByPk(newPurchase.id, {
    include: purchaseIncludes,
  });

  return res.status(201).json(
    new ApiResponse(201, createdPurchase, 'Purchase created successfully')
  );
});

/**
 * @desc Update purchase by ID
 * @route PUT /api/v1/purchases/:id
 * @access Authenticated
 */
export const updatePurchase = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    supplierId,
    vehicleId,
    vehicleNumber,
    paymentMode,
    paymentStatus,
    paymentDate,
    quantity,
    unit,
    price,
    note,
    purchaseDate,
  } = req.body;

  const purchase = await Purchase.findByPk(id);
  if (!purchase) {
    throw new ApiError(404, 'Purchase record not found.');
  }

  if (supplierId) {
    const supplier = await Supplier.findByPk(supplierId);
    if (!supplier) {
      throw new ApiError(404, 'Selected supplier does not exist.');
    }
    purchase.supplierId = supplier.id;
  }

  if (quantity !== undefined) {
    const parsedQty = parseFloat(quantity);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      throw new ApiError(400, 'Valid quantity greater than 0 is required.');
    }
    purchase.quantity = parsedQty;
  }

  if (price !== undefined) {
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      throw new ApiError(400, 'Valid price (rate) is required.');
    }
    purchase.price = parsedPrice;
  }

  if (paymentMode) {
    purchase.paymentMode = paymentMode === 'Online' ? 'Online' : 'Cash';
  }

  if (paymentStatus !== undefined) {
    purchase.paymentStatus = paymentStatus === 'Paid' ? 'Paid' : 'Pending';
    if (purchase.paymentStatus === 'Paid') {
      purchase.paymentDate = paymentDate || purchase.paymentDate || new Date().toISOString().split('T')[0];
    } else {
      purchase.paymentDate = null;
    }
  } else if (paymentDate !== undefined) {
    purchase.paymentDate = paymentDate;
  }

  if (unit) {
    purchase.unit = unit === 'Pcs' ? 'Pcs' : 'Ton';
  }

  if (vehicleId !== undefined) {
    if (vehicleId) {
      const vehicle = await Vehicle.findByPk(vehicleId);
      if (vehicle) {
        purchase.vehicleId = vehicle.id;
        purchase.vehicleNumber = vehicleNumber || vehicle.vehicleNumber;
      }
    } else {
      purchase.vehicleId = null;
      purchase.vehicleNumber = vehicleNumber ? vehicleNumber.trim().toUpperCase() : null;
    }
  } else if (vehicleNumber !== undefined) {
    purchase.vehicleNumber = vehicleNumber ? vehicleNumber.trim().toUpperCase() : null;
  }

  if (note !== undefined) {
    purchase.note = note && note.trim() ? note.trim() : null;
  }

  if (purchaseDate) {
    purchase.purchaseDate = purchaseDate;
  }

  // Recalculate total amount
  const qty = parseFloat(purchase.quantity) || 0;
  const prc = parseFloat(purchase.price) || 0;
  purchase.totalAmount = parseFloat((qty * prc).toFixed(2));

  await purchase.save();

  const updatedPurchase = await Purchase.findByPk(id, {
    include: purchaseIncludes,
  });

  return res.status(200).json(
    new ApiResponse(200, updatedPurchase, 'Purchase updated successfully')
  );
});

/**
 * @desc Confirm payment received/paid for a purchase
 * @route PATCH /api/v1/purchases/:id/confirm-payment
 * @access Authenticated
 */
export const confirmPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { paymentDate } = req.body;

  const purchase = await Purchase.findByPk(id);
  if (!purchase) {
    throw new ApiError(404, 'Purchase record not found.');
  }

  purchase.paymentStatus = 'Paid';
  purchase.paymentDate = paymentDate || new Date().toISOString().split('T')[0];
  await purchase.save();

  const updatedPurchase = await Purchase.findByPk(id, {
    include: purchaseIncludes,
  });

  return res.status(200).json(
    new ApiResponse(200, updatedPurchase, 'Payment confirmed successfully')
  );
});

/**
 * @desc Delete purchase by ID
 * @route DELETE /api/v1/purchases/:id
 * @access Authenticated
 */
export const deletePurchase = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const purchase = await Purchase.findByPk(id);
  if (!purchase) {
    throw new ApiError(404, 'Purchase record not found.');
  }

  await purchase.destroy();

  return res.status(200).json(
    new ApiResponse(200, { id: Number(id) }, 'Purchase deleted successfully')
  );
});
