import { Op } from 'sequelize';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import Payment from '../models/Payment.model.js';
import Customer from '../models/Customer.model.js';
import Supplier from '../models/Supplier.model.js';
import Sale from '../models/Sale.model.js';
import Purchase from '../models/Purchase.model.js';
import Category from '../models/Category.model.js';
import Vehicle from '../models/Vehicle.model.js';
import Driver from '../models/Driver.model.js';

/**
 * Standard include options for Payment queries
 */
const paymentIncludes = [
  {
    model: Customer,
    as: 'customer',
    attributes: ['id', 'customerName', 'companyName', 'mobile', 'address'],
  },
  {
    model: Supplier,
    as: 'supplier',
    attributes: ['id', 'name', 'mobile', 'address'],
  },
];

/**
 * @desc Get all manual payment entries (with optional filters)
 * @route GET /api/v1/payments
 * @access Public / Authenticated
 */
export const getPayments = asyncHandler(async (req, res) => {
  const { partyType, customerId, supplierId, search, startDate, endDate, paymentMode } = req.query;

  const whereClause = {};

  if (partyType && ['Customer', 'Supplier'].includes(partyType)) {
    whereClause.partyType = partyType;
  }

  if (customerId && !isNaN(parseInt(customerId, 10))) {
    whereClause.customerId = parseInt(customerId, 10);
  }

  if (supplierId && !isNaN(parseInt(supplierId, 10))) {
    whereClause.supplierId = parseInt(supplierId, 10);
  }

  if (paymentMode && ['Cash', 'Online'].includes(paymentMode)) {
    whereClause.paymentMode = paymentMode;
  }

  if (startDate && endDate) {
    whereClause.paymentDate = { [Op.between]: [startDate, endDate] };
  } else if (startDate) {
    whereClause.paymentDate = { [Op.gte]: startDate };
  } else if (endDate) {
    whereClause.paymentDate = { [Op.lte]: endDate };
  }

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    whereClause[Op.or] = [
      { '$customer.customerName$': { [Op.like]: term } },
      { '$customer.companyName$': { [Op.like]: term } },
      { '$supplier.name$': { [Op.like]: term } },
      { note: { [Op.like]: term } },
      { paymentMode: { [Op.like]: term } },
    ];
  }

  const payments = await Payment.findAll({
    where: whereClause,
    include: paymentIncludes,
    order: [
      ['paymentDate', 'DESC'],
      ['createdAt', 'DESC'],
    ],
  });

  return res.status(200).json(
    new ApiResponse(200, payments, 'Payments fetched successfully')
  );
});

/**
 * @desc Create a new manual payment entry (Jama from Customer / Bhugtan to Supplier)
 * @route POST /api/v1/payments
 * @access Authenticated
 */
export const createPayment = asyncHandler(async (req, res) => {
  const { partyType, customerId, supplierId, amount, paymentDate, paymentMode, note } = req.body;

  if (!partyType || !['Customer', 'Supplier'].includes(partyType)) {
    throw new ApiError(400, 'Party type must be either Customer or Supplier.');
  }

  const parsedAmt = parseFloat(amount);
  if (isNaN(parsedAmt) || parsedAmt <= 0) {
    throw new ApiError(400, 'Please enter a valid payment amount greater than 0.');
  }

  let validCustomerId = null;
  let validSupplierId = null;

  if (partyType === 'Customer') {
    if (!customerId) {
      throw new ApiError(400, 'Customer is required for customer payment entry.');
    }
    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      throw new ApiError(404, 'Selected customer does not exist.');
    }
    validCustomerId = customer.id;
  } else {
    if (!supplierId) {
      throw new ApiError(400, 'Supplier is required for supplier payment entry.');
    }
    const supplier = await Supplier.findByPk(supplierId);
    if (!supplier) {
      throw new ApiError(404, 'Selected supplier does not exist.');
    }
    validSupplierId = supplier.id;
  }

  const finalDate = paymentDate || new Date().toISOString().split('T')[0];
  const validMode = paymentMode === 'Online' ? 'Online' : 'Cash';

  const newPayment = await Payment.create({
    partyType,
    customerId: validCustomerId,
    supplierId: validSupplierId,
    amount: parsedAmt,
    paymentDate: finalDate,
    paymentMode: validMode,
    note: note && typeof note === 'string' && note.trim() ? note.trim() : null,
  });

  const createdPayment = await Payment.findByPk(newPayment.id, {
    include: paymentIncludes,
  });

  return res.status(201).json(
    new ApiResponse(201, createdPayment, 'Payment recorded successfully')
  );
});

/**
 * @desc Delete payment entry by ID
 * @route DELETE /api/v1/payments/:id
 * @access Authenticated
 */
export const deletePayment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const payment = await Payment.findByPk(id);
  if (!payment) {
    throw new ApiError(404, 'Payment record not found.');
  }

  await payment.destroy();

  return res.status(200).json(
    new ApiResponse(200, { id: parseInt(id, 10) }, 'Payment entry deleted successfully')
  );
});

/**
 * @desc Get comprehensive Debit / Khata Summary
 * Calculates pending balances grouped by Customer and Supplier, subtracting manual payments.
 * @route GET /api/v1/payments/summary
 * @access Public / Authenticated
 */
export const getDebitSummary = asyncHandler(async (req, res) => {
  const [customers, suppliers, sales, purchases, payments] = await Promise.all([
    Customer.findAll({
      attributes: ['id', 'customerName', 'companyName', 'mobile', 'address'],
      include: [{ model: Category, as: 'category', attributes: ['id', 'name'], required: false }],
      order: [['customerName', 'ASC']],
    }),
    Supplier.findAll({
      attributes: ['id', 'name', 'mobile', 'address'],
      include: [{ model: Category, as: 'category', attributes: ['id', 'name'], required: false }],
      order: [['name', 'ASC']],
    }),
    Sale.findAll({
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'customerName', 'companyName', 'mobile'] },
        { model: Vehicle, as: 'vehicle', attributes: ['id', 'vehicleNumber'] },
        { model: Driver, as: 'driver', attributes: ['id', 'name'] },
        { model: Category, as: 'category', attributes: ['id', 'name'] },
      ],
      order: [['saleDate', 'DESC']],
    }),
    Purchase.findAll({
      include: [
        { model: Supplier, as: 'supplier', attributes: ['id', 'name', 'mobile'] },
        { model: Vehicle, as: 'vehicle', attributes: ['id', 'vehicleNumber'] },
        { model: Driver, as: 'driver', attributes: ['id', 'name'] },
        { model: Category, as: 'category', attributes: ['id', 'name'] },
      ],
      order: [['purchaseDate', 'DESC']],
    }),
    Payment.findAll({
      include: paymentIncludes,
      order: [['paymentDate', 'DESC']],
    }),
  ]);

  // Group Sales by Customer
  const customerSalesMap = {};
  sales.forEach((s) => {
    if (!s.customerId) return;
    if (!customerSalesMap[s.customerId]) {
      customerSalesMap[s.customerId] = [];
    }
    customerSalesMap[s.customerId].push(s);
  });

  // Group Purchases by Supplier
  const supplierPurchasesMap = {};
  purchases.forEach((p) => {
    if (!p.supplierId) return;
    if (!supplierPurchasesMap[p.supplierId]) {
      supplierPurchasesMap[p.supplierId] = [];
    }
    supplierPurchasesMap[p.supplierId].push(p);
  });

  // Group Payments by Customer & Supplier
  const customerPaymentsMap = {};
  const supplierPaymentsMap = {};
  payments.forEach((pm) => {
    if (pm.partyType === 'Customer' && pm.customerId) {
      if (!customerPaymentsMap[pm.customerId]) customerPaymentsMap[pm.customerId] = [];
      customerPaymentsMap[pm.customerId].push(pm);
    } else if (pm.partyType === 'Supplier' && pm.supplierId) {
      if (!supplierPaymentsMap[pm.supplierId]) supplierPaymentsMap[pm.supplierId] = [];
      supplierPaymentsMap[pm.supplierId].push(pm);
    }
  });

  // Build Customer Debit Summary (Lena Hai)
  let totalCustomerBilled = 0;
  let totalCustomerPaidInstant = 0;
  let totalCustomerJamaManual = 0;
  let totalCustomerPending = 0;

  const customerDebits = customers.map((c) => {
    const cSales = customerSalesMap[c.id] || [];
    const cPayments = customerPaymentsMap[c.id] || [];

    let totalBilled = 0;
    let paidInstant = 0;
    let pendingFromBills = 0;
    let pendingBillsCount = 0;

    let totalTrips = 0;
    cSales.forEach((s) => {
      const amt = parseFloat(s.totalAmount) || (parseFloat(s.quantity) * parseFloat(s.price)) || 0;
      totalBilled += amt;
      const t = parseFloat(s.trip);
      if (!isNaN(t) && t > 0) {
        totalTrips += t;
      }
      if (s.paymentStatus === 'Paid') {
        paidInstant += amt;
      } else {
        pendingFromBills += amt;
        pendingBillsCount += 1;
      }
    });

    let totalJama = 0;
    cPayments.forEach((pm) => {
      totalJama += parseFloat(pm.amount) || 0;
    });

    // Net Outstanding Lena Hai
    // Formula: Pending Bills Amount - Manual Jama Payments
    const netPending = Math.max(0, parseFloat((pendingFromBills - totalJama).toFixed(2)));
    const totalCollected = parseFloat((paidInstant + totalJama).toFixed(2));

    totalCustomerBilled += totalBilled;
    totalCustomerPaidInstant += paidInstant;
    totalCustomerJamaManual += totalJama;
    totalCustomerPending += netPending;

    // Build timeline statement of all events (Sales + Payments)
    const statement = [
      ...cSales.map((s) => ({
        type: 'SALE_BILL',
        id: `sale-${s.id}`,
        rawId: s.id,
        date: s.saleDate,
        amount: parseFloat(s.totalAmount) || (parseFloat(s.quantity) * parseFloat(s.price)) || 0,
        quantity: s.quantity,
        unit: s.unit,
        price: s.price,
        vehicleNumber: s.vehicleNumber || s.vehicle?.vehicleNumber,
        driverName: s.driverName || s.driver?.name,
        categoryName: s.categoryName || s.category?.name,
        srNo: s.srNo,
        trip: s.trip,
        note: s.note,
        paymentStatus: s.paymentStatus,
        paymentMode: s.paymentMode,
      })),
      ...cPayments.map((pm) => ({
        type: 'PAYMENT_JAMA',
        id: `payment-${pm.id}`,
        rawId: pm.id,
        date: pm.paymentDate,
        amount: parseFloat(pm.amount) || 0,
        paymentMode: pm.paymentMode,
        note: pm.note,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      customerId: c.id,
      customerName: c.customerName,
      companyName: c.companyName,
      mobile: c.mobile,
      address: c.address,
      categoryName: c.category?.name,
      totalSalesCount: cSales.length,
      totalTrips,
      pendingBillsCount,
      totalBilled: parseFloat(totalBilled.toFixed(2)),
      paidInstant: parseFloat(paidInstant.toFixed(2)),
      pendingFromBills: parseFloat(pendingFromBills.toFixed(2)),
      totalJama: parseFloat(totalJama.toFixed(2)),
      totalCollected,
      netPending,
      statement,
    };
  });

  // Build Supplier Debit Summary (Dena Hai)
  let totalSupplierBilled = 0;
  let totalSupplierPaidInstant = 0;
  let totalSupplierBhugtanManual = 0;
  let totalSupplierPending = 0;

  const supplierDebits = suppliers.map((sup) => {
    const sPurchases = supplierPurchasesMap[sup.id] || [];
    const sPayments = supplierPaymentsMap[sup.id] || [];

    let totalBilled = 0;
    let totalTrips = 0;
    let paidInstant = 0;
    let pendingFromBills = 0;
    let pendingBillsCount = 0;

    sPurchases.forEach((p) => {
      const amt = parseFloat(p.totalAmount) || (parseFloat(p.quantity) * parseFloat(p.price)) || 0;
      totalBilled += amt;
      const t = parseFloat(p.trip);
      if (!isNaN(t) && t > 0) {
        totalTrips += t;
      }
      if (p.paymentStatus === 'Paid') {
        paidInstant += amt;
      } else {
        pendingFromBills += amt;
        pendingBillsCount += 1;
      }
    });

    let totalBhugtan = 0;
    sPayments.forEach((pm) => {
      totalBhugtan += parseFloat(pm.amount) || 0;
    });

    const netPending = Math.max(0, parseFloat((pendingFromBills - totalBhugtan).toFixed(2)));
    const totalPaid = parseFloat((paidInstant + totalBhugtan).toFixed(2));

    totalSupplierBilled += totalBilled;
    totalSupplierPaidInstant += paidInstant;
    totalSupplierBhugtanManual += totalBhugtan;
    totalSupplierPending += netPending;

    const statement = [
      ...sPurchases.map((p) => ({
        type: 'PURCHASE_BILL',
        id: `purchase-${p.id}`,
        rawId: p.id,
        date: p.purchaseDate,
        amount: parseFloat(p.totalAmount) || (parseFloat(p.quantity) * parseFloat(p.price)) || 0,
        quantity: p.quantity,
        unit: p.unit,
        price: p.price,
        vehicleNumber: p.vehicleNumber || p.vehicle?.vehicleNumber,
        driverName: p.driverName || p.driver?.name,
        categoryName: p.categoryName || p.category?.name,
        srNo: p.srNo,
        trip: p.trip,
        note: p.note,
        paymentStatus: p.paymentStatus,
        paymentMode: p.paymentMode,
      })),
      ...sPayments.map((pm) => ({
        type: 'PAYMENT_BHUGTAN',
        id: `payment-${pm.id}`,
        rawId: pm.id,
        date: pm.paymentDate,
        amount: parseFloat(pm.amount) || 0,
        paymentMode: pm.paymentMode,
        note: pm.note,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      supplierId: sup.id,
      supplierName: sup.name,
      mobile: sup.mobile,
      address: sup.address,
      categoryName: sup.category?.name,
      totalPurchasesCount: sPurchases.length,
      totalTrips,
      pendingBillsCount,
      totalBilled: parseFloat(totalBilled.toFixed(2)),
      paidInstant: parseFloat(paidInstant.toFixed(2)),
      pendingFromBills: parseFloat(pendingFromBills.toFixed(2)),
      totalBhugtan: parseFloat(totalBhugtan.toFixed(2)),
      totalPaid,
      netPending,
      statement,
    };
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        summary: {
          totalCustomerPending: parseFloat(totalCustomerPending.toFixed(2)),
          totalSupplierPending: parseFloat(totalSupplierPending.toFixed(2)),
          netDifference: parseFloat((totalCustomerPending - totalSupplierPending).toFixed(2)),
          totalCustomerBilled: parseFloat(totalCustomerBilled.toFixed(2)),
          totalCustomerJamaManual: parseFloat(totalCustomerJamaManual.toFixed(2)),
          totalSupplierBilled: parseFloat(totalSupplierBilled.toFixed(2)),
          totalSupplierBhugtanManual: parseFloat(totalSupplierBhugtanManual.toFixed(2)),
        },
        customers: customerDebits,
        suppliers: supplierDebits,
        recentPayments: payments,
      },
      'Debit summary fetched successfully'
    )
  );
});
