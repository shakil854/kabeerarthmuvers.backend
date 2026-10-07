import { Op } from 'sequelize';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import Driver from '../models/Driver.model.js';
import DriverAdvance from '../models/DriverAdvance.model.js';
import DriverLeave from '../models/DriverLeave.model.js';
import DriverSalary from '../models/DriverSalary.model.js';

/**
 * Helper to get days in month
 */
const getDaysInMonth = (year, month) => {
  return new Date(year, month, 0).getDate();
};

/**
 * @desc Get all drivers (with optional search filter & current month quick stats)
 * @route GET /api/v1/drivers
 * @access Public / Authenticated
 */
export const getDrivers = asyncHandler(async (req, res) => {
  const { search, month, year } = req.query;

  const now = new Date();
  const targetYear = parseInt(year, 10) || now.getFullYear();
  const targetMonth = parseInt(month, 10) || now.getMonth() + 1; // 1-12
  const monthStr = String(targetMonth).padStart(2, '0');
  const monthYearStr = `${targetYear}-${monthStr}`;

  // Start & End dates of target month
  const startDate = `${targetYear}-${monthStr}-01`;
  const totalDays = getDaysInMonth(targetYear, targetMonth);
  const endDate = `${targetYear}-${monthStr}-${String(totalDays).padStart(2, '0')}`;

  const whereClause = {};
  if (search && search.trim()) {
    whereClause.name = {
      [Op.like]: `%${search.trim()}%`,
    };
  }

  const drivers = await Driver.findAll({
    where: whereClause,
    include: [
      {
        model: DriverAdvance,
        as: 'advances',
        where: {
          date: {
            [Op.between]: [startDate, endDate],
          },
        },
        required: false,
        attributes: ['id', 'amount'],
      },
      {
        model: DriverLeave,
        as: 'leaves',
        where: {
          date: {
            [Op.between]: [startDate, endDate],
          },
        },
        required: false,
        attributes: ['id', 'leaveType'],
      },
      {
        model: DriverSalary,
        as: 'salaries',
        where: {
          monthYear: monthYearStr,
        },
        required: false,
        attributes: ['id', 'paymentStatus', 'netPayable', 'paidAmount'],
      },
    ],
    order: [['createdAt', 'DESC']],
  });

  // Attach quick computed stats to each driver
  const driversWithStats = drivers.map((driver) => {
    const raw = driver.toJSON();

    const currentMonthUpad = (raw.advances || []).reduce(
      (sum, adv) => sum + (parseFloat(adv.amount) || 0),
      0
    );

    const currentMonthLeaves = (raw.leaves || []).reduce((sum, lv) => {
      return sum + (lv.leaveType === 'half' ? 0.5 : 1.0);
    }, 0);

    const currentMonthSalary = (raw.salaries && raw.salaries[0]) || null;

    return {
      ...raw,
      stats: {
        month: targetMonth,
        year: targetYear,
        monthYear: monthYearStr,
        currentMonthUpad,
        currentMonthLeaves,
        salaryStatus: currentMonthSalary ? currentMonthSalary.paymentStatus : 'Unsettled',
        salarySettlement: currentMonthSalary,
      },
    };
  });

  return res.status(200).json(
    new ApiResponse(200, driversWithStats, 'Drivers fetched successfully')
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
  const {
    name,
    phone,
    salaryType,
    baseSalary,
    dailyAllowance,
    joiningDate,
    status,
    notes,
  } = req.body;

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

  const driver = await Driver.create({
    name: trimmedName,
    phone: phone ? phone.trim() : null,
    salaryType: salaryType === 'daily' ? 'daily' : 'monthly',
    baseSalary: parseFloat(baseSalary) || 0.0,
    dailyAllowance: parseFloat(dailyAllowance) || 0.0,
    joiningDate: joiningDate || null,
    status: status === 'inactive' ? 'inactive' : 'active',
    notes: notes ? notes.trim() : null,
  });

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
  const {
    name,
    phone,
    salaryType,
    baseSalary,
    dailyAllowance,
    joiningDate,
    status,
    notes,
  } = req.body;

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
  if (phone !== undefined) driver.phone = phone ? phone.trim() : null;
  if (salaryType !== undefined) driver.salaryType = salaryType === 'daily' ? 'daily' : 'monthly';
  if (baseSalary !== undefined) driver.baseSalary = parseFloat(baseSalary) || 0.0;
  if (dailyAllowance !== undefined) driver.dailyAllowance = parseFloat(dailyAllowance) || 0.0;
  if (joiningDate !== undefined) driver.joiningDate = joiningDate || null;
  if (status !== undefined) driver.status = status === 'inactive' ? 'inactive' : 'active';
  if (notes !== undefined) driver.notes = notes ? notes.trim() : null;

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

// ============================================================================
// 📊 DRIVER KHATA & PAYROLL (ઉપાડ, રજા & પગાર હિસાબ)
// ============================================================================

/**
 * @desc Get complete Driver Khata & Pagar overview for a given month/year
 * @route GET /api/v1/drivers/:id/khata
 * @access Public / Authenticated
 */
export const getDriverKhata = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const now = new Date();
  const targetYear = parseInt(req.query.year, 10) || now.getFullYear();
  const targetMonth = parseInt(req.query.month, 10) || now.getMonth() + 1; // 1-12
  const monthStr = String(targetMonth).padStart(2, '0');
  const monthYearStr = `${targetYear}-${monthStr}`;

  const driver = await Driver.findByPk(id);
  if (!driver) {
    throw new ApiError(404, 'Driver not found.');
  }

  const daysInMonth = getDaysInMonth(targetYear, targetMonth);
  const startDate = `${targetYear}-${monthStr}-01`;
  const endDate = `${targetYear}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`;

  // 1. Fetch all advances for this driver
  const allAdvances = await DriverAdvance.findAll({
    where: { driverId: id },
    order: [['date', 'DESC'], ['id', 'DESC']],
  });

  // Filter monthly advances
  const monthlyAdvances = allAdvances.filter((adv) => {
    return adv.date >= startDate && adv.date <= endDate;
  });

  const monthlyUpadTotal = monthlyAdvances.reduce(
    (sum, a) => sum + (parseFloat(a.amount) || 0),
    0
  );
  const allTimeUpadTotal = allAdvances.reduce(
    (sum, a) => sum + (parseFloat(a.amount) || 0),
    0
  );

  // 2. Fetch all leaves for this driver
  const allLeaves = await DriverLeave.findAll({
    where: { driverId: id },
    order: [['date', 'DESC'], ['id', 'DESC']],
  });

  // Filter monthly leaves
  const monthlyLeaves = allLeaves.filter((lv) => {
    return lv.date >= startDate && lv.date <= endDate;
  });

  const monthlyLeaveDays = monthlyLeaves.reduce((sum, lv) => {
    return sum + (lv.leaveType === 'half' ? 0.5 : 1.0);
  }, 0);

  // 3. Calculation breakdown
  const baseSalary = parseFloat(driver.baseSalary) || 0;
  const perDaySalary = daysInMonth > 0 ? baseSalary / daysInMonth : 0;
  const leaveDeduction = monthlyLeaveDays * perDaySalary;
  const workedDays = Math.max(0, daysInMonth - monthlyLeaveDays);
  const grossEarned = Math.max(0, baseSalary - leaveDeduction);
  const netPayable = Math.max(0, grossEarned - monthlyUpadTotal);

  // 4. Fetch Salary record for this month
  const monthlySalaryRecord = await DriverSalary.findOne({
    where: {
      driverId: id,
      monthYear: monthYearStr,
    },
  });

  // 5. Fetch all past salary settlements
  const allSalaryRecords = await DriverSalary.findAll({
    where: { driverId: id },
    order: [['year', 'DESC'], ['month', 'DESC']],
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        driver,
        period: {
          month: targetMonth,
          year: targetYear,
          monthYear: monthYearStr,
          daysInMonth,
          startDate,
          endDate,
        },
        calculation: {
          salaryType: driver.salaryType,
          baseSalary,
          daysInMonth,
          monthlyLeaveDays,
          workedDays,
          perDaySalary: parseFloat(perDaySalary.toFixed(2)),
          leaveDeduction: parseFloat(leaveDeduction.toFixed(2)),
          grossEarned: parseFloat(grossEarned.toFixed(2)),
          monthlyUpadTotal: parseFloat(monthlyUpadTotal.toFixed(2)),
          allTimeUpadTotal: parseFloat(allTimeUpadTotal.toFixed(2)),
          suggestedNetPayable: parseFloat(netPayable.toFixed(2)),
        },
        monthlyAdvances,
        allAdvances,
        monthlyLeaves,
        allLeaves,
        currentSalary: monthlySalaryRecord,
        pastSalaries: allSalaryRecords,
      },
      'Driver Khata fetched successfully'
    )
  );
});

// ============================================================================
// 💸 DRIVER ADVANCE (ઉપાડ) CRUD
// ============================================================================

/**
 * @desc Create new driver advance (Upad)
 * @route POST /api/v1/drivers/:id/advances
 * @access Authenticated
 */
export const addDriverAdvance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount, date, paymentMode, reason } = req.body;

  const driver = await Driver.findByPk(id);
  if (!driver) {
    throw new ApiError(404, 'Driver not found.');
  }

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new ApiError(400, 'Valid advance amount greater than 0 is required.');
  }

  const advance = await DriverAdvance.create({
    driverId: id,
    amount: numAmount,
    date: date || new Date().toISOString().split('T')[0],
    paymentMode: paymentMode || 'Cash',
    reason: reason ? reason.trim() : null,
  });

  return res.status(201).json(
    new ApiResponse(201, advance, 'Driver advance (Upad) added successfully')
  );
});

/**
 * @desc Update driver advance (Upad)
 * @route PUT /api/v1/drivers/advances/:advanceId
 * @access Authenticated
 */
export const updateDriverAdvance = asyncHandler(async (req, res) => {
  const { advanceId } = req.params;
  const { amount, date, paymentMode, reason } = req.body;

  const advance = await DriverAdvance.findByPk(advanceId);
  if (!advance) {
    throw new ApiError(404, 'Advance record not found.');
  }

  if (amount !== undefined) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new ApiError(400, 'Valid advance amount greater than 0 is required.');
    }
    advance.amount = numAmount;
  }

  if (date !== undefined) advance.date = date;
  if (paymentMode !== undefined) advance.paymentMode = paymentMode;
  if (reason !== undefined) advance.reason = reason ? reason.trim() : null;

  await advance.save();

  return res.status(200).json(
    new ApiResponse(200, advance, 'Driver advance updated successfully')
  );
});

/**
 * @desc Delete driver advance (Upad)
 * @route DELETE /api/v1/drivers/advances/:advanceId
 * @access Authenticated
 */
export const deleteDriverAdvance = asyncHandler(async (req, res) => {
  const { advanceId } = req.params;

  const advance = await DriverAdvance.findByPk(advanceId);
  if (!advance) {
    throw new ApiError(404, 'Advance record not found.');
  }

  await advance.destroy();

  return res.status(200).json(
    new ApiResponse(200, { id: Number(advanceId) }, 'Driver advance deleted successfully')
  );
});

// ============================================================================
// 📅 DRIVER LEAVE (રજા / હાજરી) CRUD
// ============================================================================

/**
 * @desc Mark driver leave (Raja)
 * @route POST /api/v1/drivers/:id/leaves
 * @access Authenticated
 */
export const addDriverLeave = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { date, leaveType, reason } = req.body;

  const driver = await Driver.findByPk(id);
  if (!driver) {
    throw new ApiError(404, 'Driver not found.');
  }

  if (!date) {
    throw new ApiError(400, 'Leave date is required.');
  }

  const leave = await DriverLeave.create({
    driverId: id,
    date,
    leaveType: leaveType === 'half' ? 'half' : 'full',
    reason: reason ? reason.trim() : null,
  });

  return res.status(201).json(
    new ApiResponse(201, leave, 'Driver leave (Raja) marked successfully')
  );
});

/**
 * @desc Update driver leave (Raja)
 * @route PUT /api/v1/drivers/leaves/:leaveId
 * @access Authenticated
 */
export const updateDriverLeave = asyncHandler(async (req, res) => {
  const { leaveId } = req.params;
  const { date, leaveType, reason } = req.body;

  const leave = await DriverLeave.findByPk(leaveId);
  if (!leave) {
    throw new ApiError(404, 'Leave record not found.');
  }

  if (date !== undefined) leave.date = date;
  if (leaveType !== undefined) leave.leaveType = leaveType === 'half' ? 'half' : 'full';
  if (reason !== undefined) leave.reason = reason ? reason.trim() : null;

  await leave.save();

  return res.status(200).json(
    new ApiResponse(200, leave, 'Driver leave updated successfully')
  );
});

/**
 * @desc Delete driver leave (Raja)
 * @route DELETE /api/v1/drivers/leaves/:leaveId
 * @access Authenticated
 */
export const deleteDriverLeave = asyncHandler(async (req, res) => {
  const { leaveId } = req.params;

  const leave = await DriverLeave.findByPk(leaveId);
  if (!leave) {
    throw new ApiError(404, 'Leave record not found.');
  }

  await leave.destroy();

  return res.status(200).json(
    new ApiResponse(200, { id: Number(leaveId) }, 'Driver leave deleted successfully')
  );
});

// ============================================================================
// 💰 DRIVER SALARY / PAGAR SETTLEMENT (પગાર ચુકવણી & સ્લિપ)
// ============================================================================

/**
 * @desc Settle / Pay driver salary for a specific month
 * @route POST /api/v1/drivers/:id/salaries
 * @access Authenticated
 */
export const settleDriverSalary = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    month,
    year,
    baseSalary,
    totalDays,
    leaveDays,
    workedDays,
    perDaySalary,
    leaveDeduction,
    grossEarned,
    totalUpadDeducted,
    bonusAmount,
    otherDeductions,
    netPayable,
    paidAmount,
    paymentDate,
    paymentMode,
    paymentStatus,
    note,
  } = req.body;

  const driver = await Driver.findByPk(id);
  if (!driver) {
    throw new ApiError(404, 'Driver not found.');
  }

  const numMonth = parseInt(month, 10);
  const numYear = parseInt(year, 10);
  if (isNaN(numMonth) || numMonth < 1 || numMonth > 12 || isNaN(numYear)) {
    throw new ApiError(400, 'Valid month (1-12) and year are required.');
  }

  const monthStr = String(numMonth).padStart(2, '0');
  const monthYearStr = `${numYear}-${monthStr}`;

  // Find existing or create new
  let salaryRecord = await DriverSalary.findOne({
    where: {
      driverId: id,
      monthYear: monthYearStr,
    },
  });

  const payload = {
    driverId: id,
    month: numMonth,
    year: numYear,
    monthYear: monthYearStr,
    baseSalary: parseFloat(baseSalary) || 0,
    totalDays: parseInt(totalDays, 10) || 30,
    leaveDays: parseFloat(leaveDays) || 0,
    workedDays: parseFloat(workedDays) || 30,
    perDaySalary: parseFloat(perDaySalary) || 0,
    leaveDeduction: parseFloat(leaveDeduction) || 0,
    grossEarned: parseFloat(grossEarned) || 0,
    totalUpadDeducted: parseFloat(totalUpadDeducted) || 0,
    bonusAmount: parseFloat(bonusAmount) || 0,
    otherDeductions: parseFloat(otherDeductions) || 0,
    netPayable: parseFloat(netPayable) || 0,
    paidAmount: parseFloat(paidAmount) || 0,
    paymentDate: paymentDate || new Date().toISOString().split('T')[0],
    paymentMode: paymentMode || 'Cash',
    paymentStatus: paymentStatus || 'Paid',
    note: note ? note.trim() : null,
  };

  if (salaryRecord) {
    await salaryRecord.update(payload);
  } else {
    salaryRecord = await DriverSalary.create(payload);
  }

  return res.status(200).json(
    new ApiResponse(200, salaryRecord, 'Driver salary settled successfully')
  );
});

/**
 * @desc Delete driver salary settlement
 * @route DELETE /api/v1/drivers/salaries/:salaryId
 * @access Authenticated
 */
export const deleteDriverSalary = asyncHandler(async (req, res) => {
  const { salaryId } = req.params;

  const salary = await DriverSalary.findByPk(salaryId);
  if (!salary) {
    throw new ApiError(404, 'Salary record not found.');
  }

  await salary.destroy();

  return res.status(200).json(
    new ApiResponse(200, { id: Number(salaryId) }, 'Driver salary record deleted successfully')
  );
});
