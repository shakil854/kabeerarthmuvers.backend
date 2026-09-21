import { Op } from 'sequelize';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import Customer from '../models/Customer.model.js';
import Category from '../models/Category.model.js';

/**
 * @desc Get all customers (optional search query)
 * @route GET /api/v1/customers
 * @access Public / Authenticated
 */
export const getCustomers = asyncHandler(async (req, res) => {
  const { search } = req.query;

  const whereClause = {};
  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    whereClause[Op.or] = [
      { customerName: { [Op.like]: term } },
      { companyName: { [Op.like]: term } },
      { mobile: { [Op.like]: term } },
      { address: { [Op.like]: term } },
      { '$category.name$': { [Op.like]: term } },
    ];
  }

  const customers = await Customer.findAll({
    where: whereClause,
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name'],
        required: false,
      },
    ],
    order: [['createdAt', 'DESC']],
  });

  return res.status(200).json(
    new ApiResponse(200, customers, 'Customers fetched successfully')
  );
});

/**
 * @desc Get customer by ID
 * @route GET /api/v1/customers/:id
 * @access Public / Authenticated
 */
export const getCustomerById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const customer = await Customer.findByPk(id, {
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name'],
      },
    ],
  });

  if (!customer) {
    throw new ApiError(404, 'Customer not found.');
  }

  return res.status(200).json(
    new ApiResponse(200, customer, 'Customer fetched successfully')
  );
});

/**
 * @desc Create a new customer
 * @route POST /api/v1/customers
 * @access Authenticated
 */
export const createCustomer = asyncHandler(async (req, res) => {
  const { customerName, companyName, mobile, categoryId, address } = req.body;

  if (!customerName || !customerName.trim()) {
    throw new ApiError(400, 'Customer name is required.');
  }

  const trimmedCustomerName = customerName.trim();
  const trimmedCompanyName = companyName && companyName.trim() ? companyName.trim() : null;
  const trimmedMobile = mobile && mobile.trim() ? mobile.trim() : null;
  const trimmedAddress = address && address.trim() ? address.trim() : null;
  const parsedCategoryId = categoryId ? parseInt(categoryId, 10) : null;

  // If categoryId provided, verify it exists
  if (parsedCategoryId) {
    const categoryExists = await Category.findByPk(parsedCategoryId);
    if (!categoryExists) {
      throw new ApiError(400, 'Selected category does not exist.');
    }
  }

  const newCustomer = await Customer.create({
    customerName: trimmedCustomerName,
    companyName: trimmedCompanyName,
    mobile: trimmedMobile,
    categoryId: parsedCategoryId,
    address: trimmedAddress,
  });

  // Re-fetch with category details
  const customerWithCategory = await Customer.findByPk(newCustomer.id, {
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name'],
      },
    ],
  });

  return res.status(201).json(
    new ApiResponse(201, customerWithCategory, 'Customer created successfully')
  );
});

/**
 * @desc Update customer by ID
 * @route PUT /api/v1/customers/:id
 * @access Authenticated
 */
export const updateCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { customerName, companyName, mobile, categoryId, address } = req.body;

  if (!customerName || !customerName.trim()) {
    throw new ApiError(400, 'Customer name is required.');
  }

  const customer = await Customer.findByPk(id);
  if (!customer) {
    throw new ApiError(404, 'Customer not found.');
  }

  const trimmedCustomerName = customerName.trim();
  const trimmedCompanyName = companyName && companyName.trim() ? companyName.trim() : null;
  const trimmedMobile = mobile && mobile.trim() ? mobile.trim() : null;
  const trimmedAddress = address && address.trim() ? address.trim() : null;
  const parsedCategoryId = categoryId ? parseInt(categoryId, 10) : null;

  // If categoryId provided, verify it exists
  if (parsedCategoryId) {
    const categoryExists = await Category.findByPk(parsedCategoryId);
    if (!categoryExists) {
      throw new ApiError(400, 'Selected category does not exist.');
    }
  }

  customer.customerName = trimmedCustomerName;
  customer.companyName = trimmedCompanyName;
  customer.mobile = trimmedMobile;
  customer.categoryId = parsedCategoryId;
  customer.address = trimmedAddress;
  await customer.save();

  // Re-fetch with category details
  const updatedCustomer = await Customer.findByPk(id, {
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name'],
      },
    ],
  });

  return res.status(200).json(
    new ApiResponse(200, updatedCustomer, 'Customer updated successfully')
  );
});

/**
 * @desc Delete customer by ID
 * @route DELETE /api/v1/customers/:id
 * @access Authenticated
 */
export const deleteCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const customer = await Customer.findByPk(id);
  if (!customer) {
    throw new ApiError(404, 'Customer not found.');
  }

  await customer.destroy();

  return res.status(200).json(
    new ApiResponse(200, { id: Number(id) }, 'Customer deleted successfully')
  );
});
