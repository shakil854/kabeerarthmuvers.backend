import { Op } from 'sequelize';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import Sale from '../models/Sale.model.js';
import Purchase from '../models/Purchase.model.js';
import Expense from '../models/Expense.model.js';
import Vehicle from '../models/Vehicle.model.js';
import Customer from '../models/Customer.model.js';
import Supplier from '../models/Supplier.model.js';
import Driver from '../models/Driver.model.js';
import DriverSalary from '../models/DriverSalary.model.js';
import DriverAdvance from '../models/DriverAdvance.model.js';

/**
 * @desc Get comprehensive earnings, profit & loss analytics
 * Formula: Net Earning = Total Sales - Total Purchases - Total Operating Expenses (Diesel + Driver Salary & Bhatta + Maintenance)
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
  const advanceWhere = {};
  const salaryWhere = {};

  // Date range filter
  if (startDate && endDate) {
    saleWhere.saleDate = { [Op.between]: [startDate, endDate] };
    purchaseWhere.purchaseDate = { [Op.between]: [startDate, endDate] };
    expenseWhere.expenseDate = { [Op.between]: [startDate, endDate] };
    advanceWhere.date = { [Op.between]: [startDate, endDate] };

    const startMY = startDate.substring(0, 7);
    const endMY = endDate.substring(0, 7);
    salaryWhere[Op.or] = [
      { paymentDate: { [Op.between]: [startDate, endDate] } },
      { monthYear: { [Op.between]: [startMY, endMY] } },
    ];
  } else if (startDate) {
    saleWhere.saleDate = { [Op.gte]: startDate };
    purchaseWhere.purchaseDate = { [Op.gte]: startDate };
    expenseWhere.expenseDate = { [Op.gte]: startDate };
    advanceWhere.date = { [Op.gte]: startDate };

    const startMY = startDate.substring(0, 7);
    salaryWhere[Op.or] = [
      { paymentDate: { [Op.gte]: startDate } },
      { monthYear: { [Op.gte]: startMY } },
    ];
  } else if (endDate) {
    saleWhere.saleDate = { [Op.lte]: endDate };
    purchaseWhere.purchaseDate = { [Op.lte]: endDate };
    expenseWhere.expenseDate = { [Op.lte]: endDate };
    advanceWhere.date = { [Op.lte]: endDate };

    const endMY = endDate.substring(0, 7);
    salaryWhere[Op.or] = [
      { paymentDate: { [Op.lte]: endDate } },
      { monthYear: { [Op.lte]: endMY } },
    ];
  }

  // Vehicle filter if provided
  const parsedVehicleId = vehicleId && !isNaN(parseInt(vehicleId, 10)) ? parseInt(vehicleId, 10) : null;
  if (parsedVehicleId) {
    saleWhere.vehicleId = parsedVehicleId;
    purchaseWhere.vehicleId = parsedVehicleId;
    expenseWhere.vehicleId = parsedVehicleId;
  }

  // Trip filter for period (to distribute driver salaries across vehicles proportionally)
  const periodTripWhere = {};
  if (startDate && endDate) {
    periodTripWhere.saleDate = { [Op.between]: [startDate, endDate] };
  } else if (startDate) {
    periodTripWhere.saleDate = { [Op.gte]: startDate };
  } else if (endDate) {
    periodTripWhere.saleDate = { [Op.lte]: endDate };
  }

  const periodPurchaseTripWhere = {};
  if (startDate && endDate) {
    periodPurchaseTripWhere.purchaseDate = { [Op.between]: [startDate, endDate] };
  } else if (startDate) {
    periodPurchaseTripWhere.purchaseDate = { [Op.gte]: startDate };
  } else if (endDate) {
    periodPurchaseTripWhere.purchaseDate = { [Op.lte]: endDate };
  }

  // Query Sales, Purchases, Expenses, Vehicles, Drivers, Salaries, Advances concurrently
  const [
    sales,
    purchases,
    expenses,
    allVehicles,
    allDrivers,
    driverSalaries,
    driverAdvances,
    allPeriodSales,
    allPeriodPurchases,
  ] = await Promise.all([
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
    Driver.findAll({
      order: [['name', 'ASC']],
    }),
    DriverSalary.findAll({
      where: salaryWhere,
      order: [['paymentDate', 'DESC']],
    }),
    DriverAdvance.findAll({
      where: advanceWhere,
      order: [['date', 'DESC']],
    }),
    Sale.findAll({
      where: periodTripWhere,
      attributes: ['id', 'vehicleId', 'driverId'],
    }),
    Purchase.findAll({
      where: periodPurchaseTripWhere,
      attributes: ['id', 'vehicleId', 'driverId'],
    }),
  ]);

  // Overall Sales aggregations
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

  // Overall Purchases aggregations
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

  // Vehicle-specific daily expenses aggregations (Diesel, Driver Bhatta, Maintenance)
  let dieselTotal = 0;
  let driverBhattaTotal = 0;
  let maintenanceTotal = 0;

  expenses.forEach((e) => {
    const d = parseFloat(e.diesel) || 0;
    const dr = parseFloat(e.driver) || 0;
    const m = parseFloat(e.maintenance) || 0;

    dieselTotal += d;
    driverBhattaTotal += dr;
    maintenanceTotal += m;
  });

  // --------------------------------------------------------------------------
  // 💰 DRIVER SALARIES & ADVANCES CALCULATION
  // --------------------------------------------------------------------------
  const driverVehicleTrips = {};
  allDrivers.forEach((d) => {
    driverVehicleTrips[d.id] = { total: 0, byVehicle: {} };
  });

  allPeriodSales.forEach((s) => {
    if (s.driverId && driverVehicleTrips[s.driverId]) {
      driverVehicleTrips[s.driverId].total += 1;
      if (s.vehicleId) {
        driverVehicleTrips[s.driverId].byVehicle[s.vehicleId] =
          (driverVehicleTrips[s.driverId].byVehicle[s.vehicleId] || 0) + 1;
      }
    }
  });

  allPeriodPurchases.forEach((p) => {
    if (p.driverId && driverVehicleTrips[p.driverId]) {
      driverVehicleTrips[p.driverId].total += 1;
      if (p.vehicleId) {
        driverVehicleTrips[p.driverId].byVehicle[p.vehicleId] =
          (driverVehicleTrips[p.driverId].byVehicle[p.vehicleId] || 0) + 1;
      }
    }
  });

  const isSingleDayOrShort = Boolean(startDate && endDate && startDate === endDate);
  const driverSalaryBreakdown = [];
  let totalCompanyDriverSalary = 0;
  const vehicleDriverSalaryMap = {};
  allVehicles.forEach((v) => {
    vehicleDriverSalaryMap[v.id] = 0;
  });

  allDrivers.forEach((d) => {
    const dSalaries = driverSalaries.filter((s) => s.driverId === d.id);
    const dAdvances = driverAdvances.filter((a) => a.driverId === d.id);

    let effectiveSalary = 0;
    let settledAmount = 0;
    let advanceAmount = 0;
    let isSettled = false;

    dAdvances.forEach((a) => {
      advanceAmount += parseFloat(a.amount) || 0;
    });

    if (dSalaries.length > 0) {
      isSettled = true;
      dSalaries.forEach((s) => {
        const amt =
          parseFloat(s.grossEarned) ||
          (parseFloat(s.paidAmount) || 0) + (parseFloat(s.totalUpadDeducted) || 0) ||
          parseFloat(s.paidAmount) ||
          0;
        settledAmount += amt;
      });
      const unsettledAdv = dAdvances
        .filter((a) => !a.isSettled)
        .reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
      effectiveSalary = settledAmount + unsettledAdv;
    } else {
      const baseSal = parseFloat(d.baseSalary) || 0;
      if (isSingleDayOrShort) {
        effectiveSalary = advanceAmount;
      } else {
        if (baseSal > 0) {
          effectiveSalary = Math.max(baseSal, advanceAmount);
        } else {
          effectiveSalary = advanceAmount;
        }
      }
    }

    effectiveSalary = parseFloat(effectiveSalary.toFixed(2));
    totalCompanyDriverSalary += effectiveSalary;

    // Distribute this driver's salary to vehicles
    const tripInfo = driverVehicleTrips[d.id];
    const assignedVehicleNames = [];

    if (tripInfo && tripInfo.total > 0 && effectiveSalary > 0) {
      Object.entries(tripInfo.byVehicle).forEach(([vId, count]) => {
        const fraction = count / tripInfo.total;
        const allocated = effectiveSalary * fraction;
        if (vehicleDriverSalaryMap[vId] !== undefined) {
          vehicleDriverSalaryMap[vId] += allocated;
        }
        const vehObj = allVehicles.find((v) => String(v.id) === String(vId));
        if (vehObj) assignedVehicleNames.push(`${vehObj.vehicleNumber} (${count})`);
      });
    } else if (allVehicles.length > 0 && effectiveSalary > 0) {
      const equalShare = effectiveSalary / allVehicles.length;
      allVehicles.forEach((v) => {
        vehicleDriverSalaryMap[v.id] += equalShare;
      });
    }

    if (effectiveSalary > 0 || parseFloat(d.baseSalary) > 0 || advanceAmount > 0) {
      driverSalaryBreakdown.push({
        driverId: d.id,
        driverName: d.name,
        salaryType: d.salaryType,
        baseSalary: parseFloat((parseFloat(d.baseSalary) || 0).toFixed(2)),
        settledAmount: parseFloat(settledAmount.toFixed(2)),
        advanceAmount: parseFloat(advanceAmount.toFixed(2)),
        effectiveSalary,
        isSettled,
        tripsCount: tripInfo ? tripInfo.total : 0,
        assignedVehicles: assignedVehicleNames,
      });
    }
  });

  totalCompanyDriverSalary = parseFloat(totalCompanyDriverSalary.toFixed(2));

  // Determine driver salary applicable for current view
  const driverSalaryTotal = parsedVehicleId
    ? parseFloat((vehicleDriverSalaryMap[parsedVehicleId] || 0).toFixed(2))
    : totalCompanyDriverSalary;

  // Combined Driver Total (Salary + Daily Bhatta)
  const combinedDriverTotal = parseFloat((driverBhattaTotal + driverSalaryTotal).toFixed(2));

  // Total Expenses = Diesel + Maintenance + Driver (Salary + Bhatta)
  const totalExpenses = parseFloat((dieselTotal + maintenanceTotal + combinedDriverTotal).toFixed(2));

  // Commercial Formulas
  const grossProfit = parseFloat((totalSales - totalPurchases).toFixed(2));
  const netEarning = parseFloat((totalSales - totalPurchases - totalExpenses).toFixed(2));

  // --------------------------------------------------------------------------
  // 🚛 VEHICLE-WISE PERFORMANCE COMPUTATION
  // --------------------------------------------------------------------------
  const vehicleStatsMap = {};

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
      driverBhattaAmount: 0,
      driverSalaryAmount: parseFloat((vehicleDriverSalaryMap[v.id] || 0).toFixed(2)),
      driverAmount: 0,
      maintenanceAmount: 0,
      totalExpenses: 0,
      expensesCount: 0,
      netEarning: 0,
      isProfit: true,
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

  // Tally Daily Expenses per vehicle
  expenses.forEach((e) => {
    if (e.vehicleId && vehicleStatsMap[e.vehicleId]) {
      const d = parseFloat(e.diesel) || 0;
      const dr = parseFloat(e.driver) || 0;
      const m = parseFloat(e.maintenance) || 0;

      vehicleStatsMap[e.vehicleId].dieselAmount += d;
      vehicleStatsMap[e.vehicleId].driverBhattaAmount += dr;
      vehicleStatsMap[e.vehicleId].maintenanceAmount += m;
      vehicleStatsMap[e.vehicleId].expensesCount += 1;
    }
  });

  // Compute final Net Earning per vehicle
  const vehicleStatsList = Object.values(vehicleStatsMap).map((item) => {
    const vDriverTotal = parseFloat((item.driverBhattaAmount + item.driverSalaryAmount).toFixed(2));
    const vTotalExp = parseFloat(
      (item.dieselAmount + vDriverTotal + item.maintenanceAmount).toFixed(2)
    );
    const vNet = parseFloat((item.salesAmount - item.purchasesAmount - vTotalExp).toFixed(2));

    return {
      ...item,
      salesAmount: parseFloat(item.salesAmount.toFixed(2)),
      purchasesAmount: parseFloat(item.purchasesAmount.toFixed(2)),
      dieselAmount: parseFloat(item.dieselAmount.toFixed(2)),
      driverBhattaAmount: parseFloat(item.driverBhattaAmount.toFixed(2)),
      driverSalaryAmount: parseFloat(item.driverSalaryAmount.toFixed(2)),
      driverAmount: vDriverTotal,
      maintenanceAmount: parseFloat(item.maintenanceAmount.toFixed(2)),
      totalExpenses: vTotalExp,
      netEarning: vNet,
      isProfit: vNet >= 0,
    };
  });

  let filteredVehicleList = vehicleStatsList;
  if (parsedVehicleId) {
    filteredVehicleList = vehicleStatsList.filter((v) => String(v.vehicleId) === String(parsedVehicleId));
  }

  const result = {
    summary: {
      totalSales: parseFloat(totalSales.toFixed(2)),
      totalPurchases: parseFloat(totalPurchases.toFixed(2)),
      grossProfit,
      totalExpenses,
      dieselTotal: parseFloat(dieselTotal.toFixed(2)),
      driverBhattaTotal: parseFloat(driverBhattaTotal.toFixed(2)),
      driverSalaryTotal: parseFloat(driverSalaryTotal.toFixed(2)),
      driverTotal: combinedDriverTotal,
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
    driverSalaryBreakdown,
    vehicleStats: filteredVehicleList,
    filters: {
      startDate: startDate || null,
      endDate: endDate || null,
      vehicleId: parsedVehicleId ? String(parsedVehicleId) : null,
    },
  };

  return res.status(200).json(
    new ApiResponse(200, result, 'Earnings analytics fetched successfully')
  );
});
