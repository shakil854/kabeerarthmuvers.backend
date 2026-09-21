import { Op } from 'sequelize';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import Sale from '../models/Sale.model.js';
import Purchase from '../models/Purchase.model.js';
import Expense from '../models/Expense.model.js';
import Vehicle from '../models/Vehicle.model.js';
import Customer from '../models/Customer.model.js';
import Supplier from '../models/Supplier.model.js';

/**
 * @desc Get comprehensive earnings, profit & loss analytics
 * Formula: Net Earning = Total Sales - Total Purchases - Total Expenses
 * Supports: date range (startDate, endDate) & vehicleId filter
 * @route GET /api/v1/earnings
 * @access Public / Authenticated
 */
export const getEarnings = asyncHandler(async (req, res) => {
  const { startDate, endDate, vehicleId } = req.query;

  // Build where clauses based on date range and optional vehicle
  const saleWhere = {};
  const purchaseWhere = {};
  const expenseWhere = {};

  // Date range filter
  if (startDate && endDate) {
    saleWhere.saleDate = { [Op.between]: [startDate, endDate] };
    purchaseWhere.purchaseDate = { [Op.between]: [startDate, endDate] };
    expenseWhere.expenseDate = { [Op.between]: [startDate, endDate] };
  } else if (startDate) {
    saleWhere.saleDate = { [Op.gte]: startDate };
    purchaseWhere.purchaseDate = { [Op.gte]: startDate };
    expenseWhere.expenseDate = { [Op.gte]: startDate };
  } else if (endDate) {
    saleWhere.saleDate = { [Op.lte]: endDate };
    purchaseWhere.purchaseDate = { [Op.lte]: endDate };
    expenseWhere.expenseDate = { [Op.lte]: endDate };
  }

  // Vehicle filter if provided
  if (vehicleId && !isNaN(parseInt(vehicleId, 10))) {
    const vId = parseInt(vehicleId, 10);
    saleWhere.vehicleId = vId;
    purchaseWhere.vehicleId = vId;
    expenseWhere.vehicleId = vId;
  }

  // Query Sales, Purchases, Expenses, and all Vehicles concurrently
  const [sales, purchases, expenses, allVehicles] = await Promise.all([
    Sale.findAll({
      where: saleWhere,
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'customerName', 'companyName'] },
        { model: Vehicle, as: 'vehicle', attributes: ['id', 'vehicleNumber'] },
      ],
      order: [['saleDate', 'DESC']],
    }),
    Purchase.findAll({
      where: purchaseWhere,
      include: [
        { model: Supplier, as: 'supplier', attributes: ['id', 'name'] },
        { model: Vehicle, as: 'vehicle', attributes: ['id', 'vehicleNumber'] },
      ],
      order: [['purchaseDate', 'DESC']],
    }),
    Expense.findAll({
      where: expenseWhere,
      include: [
        { model: Vehicle, as: 'vehicle', attributes: ['id', 'vehicleNumber'] },
      ],
      order: [['expenseDate', 'DESC']],
    }),
    Vehicle.findAll({
      attributes: ['id', 'vehicleNumber', 'chassisNumber'],
      order: [['vehicleNumber', 'ASC']],
    }),
  ]);

  // Overall aggregations
  let totalSales = 0;
  let salesCash = 0;
  let salesOnline = 0;
  let salesPaid = 0;
  let salesPending = 0;

  sales.forEach((s) => {
    const amt = parseFloat(s.totalAmount) || (parseFloat(s.quantity) * parseFloat(s.price)) || 0;
    totalSales += amt;
    if (s.paymentMode === 'Cash') salesCash += amt;
    else if (s.paymentMode === 'Online') salesOnline += amt;

    if (s.paymentStatus === 'Paid') salesPaid += amt;
    else salesPending += amt;
  });

  let totalPurchases = 0;
  let purchasesCash = 0;
  let purchasesOnline = 0;
  let purchasesPaid = 0;
  let purchasesPending = 0;

  purchases.forEach((p) => {
    const amt = parseFloat(p.totalAmount) || (parseFloat(p.quantity) * parseFloat(p.price)) || 0;
    totalPurchases += amt;
    if (p.paymentMode === 'Cash') purchasesCash += amt;
    else if (p.paymentMode === 'Online') purchasesOnline += amt;

    if (p.paymentStatus === 'Paid') purchasesPaid += amt;
    else purchasesPending += amt;
  });

  let totalExpenses = 0;
  let dieselTotal = 0;
  let driverTotal = 0;
  let maintenanceTotal = 0;

  expenses.forEach((e) => {
    const d = parseFloat(e.diesel) || 0;
    const dr = parseFloat(e.driver) || 0;
    const m = parseFloat(e.maintenance) || 0;
    const tot = parseFloat(e.totalAmount) || (d + dr + m);

    totalExpenses += tot;
    dieselTotal += d;
    driverTotal += dr;
    maintenanceTotal += m;
  });

  // Commercial formulas
  const grossProfit = parseFloat((totalSales - totalPurchases).toFixed(2));
  const netEarning = parseFloat((totalSales - totalPurchases - totalExpenses).toFixed(2));

  // Vehicle-wise statistics computation
  const vehicleStatsMap = {};

  // Initialize for all active vehicles
  allVehicles.forEach((v) => {
    vehicleStatsMap[v.id] = {
      vehicleId: v.id,
      vehicleNumber: v.vehicleNumber,
      chassisNumber: v.chassisNumber,
      salesAmount: 0,
      salesCount: 0,
      purchasesAmount: 0,
      purchasesCount: 0,
      dieselAmount: 0,
      driverAmount: 0,
      maintenanceAmount: 0,
      totalExpenses: 0,
      expensesCount: 0,
      netEarning: 0,
    };
  });

  // Tally Sales per vehicle
  sales.forEach((s) => {
    if (s.vehicleId && vehicleStatsMap[s.vehicleId]) {
      const amt = parseFloat(s.totalAmount) || 0;
      vehicleStatsMap[s.vehicleId].salesAmount += amt;
      vehicleStatsMap[s.vehicleId].salesCount += 1;
    }
  });

  // Tally Purchases per vehicle
  purchases.forEach((p) => {
    if (p.vehicleId && vehicleStatsMap[p.vehicleId]) {
      const amt = parseFloat(p.totalAmount) || 0;
      vehicleStatsMap[p.vehicleId].purchasesAmount += amt;
      vehicleStatsMap[p.vehicleId].purchasesCount += 1;
    }
  });

  // Tally Expenses per vehicle
  expenses.forEach((e) => {
    if (e.vehicleId && vehicleStatsMap[e.vehicleId]) {
      const d = parseFloat(e.diesel) || 0;
      const dr = parseFloat(e.driver) || 0;
      const m = parseFloat(e.maintenance) || 0;
      const tot = parseFloat(e.totalAmount) || (d + dr + m);

      vehicleStatsMap[e.vehicleId].dieselAmount += d;
      vehicleStatsMap[e.vehicleId].driverAmount += dr;
      vehicleStatsMap[e.vehicleId].maintenanceAmount += m;
      vehicleStatsMap[e.vehicleId].totalExpenses += tot;
      vehicleStatsMap[e.vehicleId].expensesCount += 1;
    }
  });

  // Compute Net Earning per vehicle
  const vehicleStatsList = Object.values(vehicleStatsMap).map((item) => {
    const net = item.salesAmount - item.purchasesAmount - item.totalExpenses;
    return {
      ...item,
      salesAmount: parseFloat(item.salesAmount.toFixed(2)),
      purchasesAmount: parseFloat(item.purchasesAmount.toFixed(2)),
      dieselAmount: parseFloat(item.dieselAmount.toFixed(2)),
      driverAmount: parseFloat(item.driverAmount.toFixed(2)),
      maintenanceAmount: parseFloat(item.maintenanceAmount.toFixed(2)),
      totalExpenses: parseFloat(item.totalExpenses.toFixed(2)),
      netEarning: parseFloat(net.toFixed(2)),
      isProfit: net >= 0,
    };
  });

  // Filter vehicle list if single vehicle filter is selected
  let filteredVehicleList = vehicleStatsList;
  if (vehicleId) {
    filteredVehicleList = vehicleStatsList.filter((v) => String(v.vehicleId) === String(vehicleId));
  }

  const result = {
    summary: {
      totalSales: parseFloat(totalSales.toFixed(2)),
      totalPurchases: parseFloat(totalPurchases.toFixed(2)),
      grossProfit,
      totalExpenses: parseFloat(totalExpenses.toFixed(2)),
      dieselTotal: parseFloat(dieselTotal.toFixed(2)),
      driverTotal: parseFloat(driverTotal.toFixed(2)),
      maintenanceTotal: parseFloat(maintenanceTotal.toFixed(2)),
      netEarning,
      isProfit: netEarning >= 0,
      salesCount: sales.length,
      purchasesCount: purchases.length,
      expensesCount: expenses.length,
      salesCash: parseFloat(salesCash.toFixed(2)),
      salesOnline: parseFloat(salesOnline.toFixed(2)),
      salesPaid: parseFloat(salesPaid.toFixed(2)),
      salesPending: parseFloat(salesPending.toFixed(2)),
      purchasesCash: parseFloat(purchasesCash.toFixed(2)),
      purchasesOnline: parseFloat(purchasesOnline.toFixed(2)),
      purchasesPaid: parseFloat(purchasesPaid.toFixed(2)),
      purchasesPending: parseFloat(purchasesPending.toFixed(2)),
    },
    vehicleStats: filteredVehicleList,
    filters: {
      startDate: startDate || null,
      endDate: endDate || null,
      vehicleId: vehicleId || null,
    },
  };

  return res.status(200).json(
    new ApiResponse(200, result, 'Earnings analytics fetched successfully')
  );
});
