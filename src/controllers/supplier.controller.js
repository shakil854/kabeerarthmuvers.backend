import { Op } from 'sequelize';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import Supplier from '../models/Supplier.model.js';
import Category from '../models/Category.model.js';
import User from '../models/User.model.js';

/**
 * @desc Get all suppliers (optional search query)
 * @route GET /api/v1/suppliers
 * @access Public / Authenticated
 */
export const getSuppliers = asyncHandler(async (req, res) => {
  const { search } = req.query;

  const whereClause = {};
  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    whereClause[Op.or] = [
      { name: { [Op.like]: term } },
      { mobile: { [Op.like]: term } },
      { address: { [Op.like]: term } },
      { '$category.name$': { [Op.like]: term } },
    ];
  }

  const suppliers = await Supplier.findAll({
    where: whereClause,
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name'],
        required: false,
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'mobile', 'email', 'role', 'createdAt'],
        required: false,
      },
    ],
    order: [['createdAt', 'DESC']],
  });

  return res.status(200).json(
    new ApiResponse(200, suppliers, 'Suppliers fetched successfully')
  );
});

/**
 * @desc Get supplier by ID
 * @route GET /api/v1/suppliers/:id
 * @access Public / Authenticated
 */
export const getSupplierById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const supplier = await Supplier.findByPk(id, {
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name'],
      },
    ],
  });

  if (!supplier) {
    throw new ApiError(404, 'Supplier not found.');
  }

  return res.status(200).json(
    new ApiResponse(200, supplier, 'Supplier fetched successfully')
  );
});

/**
 * @desc Create a new supplier
 * @route POST /api/v1/suppliers
 * @access Authenticated
 */
export const createSupplier = asyncHandler(async (req, res) => {
  const { name, mobile, categoryId, address } = req.body;

  if (!name || !name.trim()) {
    throw new ApiError(400, 'Supplier name is required.');
  }

  const trimmedName = name.trim();
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

  const newSupplier = await Supplier.create({
    name: trimmedName,
    mobile: trimmedMobile,
    categoryId: parsedCategoryId,
    address: trimmedAddress,
  });

  // Re-fetch with category details
  const supplierWithCategory = await Supplier.findByPk(newSupplier.id, {
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name'],
      },
    ],
  });

  return res.status(201).json(
    new ApiResponse(201, supplierWithCategory, 'Supplier created successfully')
  );
});

/**
 * @desc Update supplier by ID
 * @route PUT /api/v1/suppliers/:id
 * @access Authenticated
 */
export const updateSupplier = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, mobile, categoryId, address } = req.body;

  if (!name || !name.trim()) {
    throw new ApiError(400, 'Supplier name is required.');
  }

  const supplier = await Supplier.findByPk(id);
  if (!supplier) {
    throw new ApiError(404, 'Supplier not found.');
  }

  const trimmedName = name.trim();
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

  supplier.name = trimmedName;
  supplier.mobile = trimmedMobile;
  supplier.categoryId = parsedCategoryId;
  supplier.address = trimmedAddress;
  await supplier.save();

  // Re-fetch with category details
  const updatedSupplier = await Supplier.findByPk(id, {
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name'],
      },
    ],
  });

  return res.status(200).json(
    new ApiResponse(200, updatedSupplier, 'Supplier updated successfully')
  );
});

/**
 * @desc Delete supplier by ID
 * @route DELETE /api/v1/suppliers/:id
 * @access Authenticated
 */
export const deleteSupplier = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const supplier = await Supplier.findByPk(id);
  if (!supplier) {
    throw new ApiError(404, 'Supplier not found.');
  }

  await supplier.destroy();

  return res.status(200).json(
    new ApiResponse(200, { id: Number(id) }, 'Supplier deleted successfully')
  );
});

/**
 * @desc Create or reset user login for a supplier
 * @route POST /api/v1/suppliers/:id/create-login
 * @access Private (Admin only)
 */
export const createSupplierLogin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { password, mobile, email } = req.body;

  if (!password || password.length < 6) {
    throw new ApiError(400, 'Password is required and must be at least 6 characters long.');
  }

  const supplier = await Supplier.findByPk(id);
  if (!supplier) {
    throw new ApiError(404, 'Supplier not found.');
  }

  const targetMobile = (mobile || supplier.mobile || '').trim();
  if (!targetMobile) {
    throw new ApiError(400, 'Mobile number is required to create a login.');
  }

  const targetEmail = (email || `${targetMobile}@kabeer.app`).trim().toLowerCase();

  // Check if a user already exists for this supplier
  let user = await User.findOne({ where: { supplierId: supplier.id } });

  if (user) {
    user.password = password;
    user.mobile = targetMobile;
    user.email = targetEmail;
    await user.save();

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          id: user.id,
          name: user.name,
          mobile: user.mobile,
          email: user.email,
          role: user.role,
          supplierId: user.supplierId,
        },
        'Supplier login credentials updated successfully!'
      )
    );
  }

  // Check if mobile or email is already taken by another user
  const existingWithSameContact = await User.findOne({
    where: {
      [Op.or]: [{ mobile: targetMobile }, { email: targetEmail }],
    },
  });

  if (existingWithSameContact) {
    throw new ApiError(409, `An account with mobile '${targetMobile}' or email '${targetEmail}' already exists.`);
  }

  user = await User.create({
    name: supplier.name,
    mobile: targetMobile,
    email: targetEmail,
    password,
    role: 'customer',
    supplierId: supplier.id,
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        email: user.email,
        role: user.role,
        supplierId: user.supplierId,
      },
      'Supplier login created successfully! The supplier can now log in using this mobile number and password.'
    )
  );
});
