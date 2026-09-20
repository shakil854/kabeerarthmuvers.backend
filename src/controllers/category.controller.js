import { Op } from 'sequelize';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import Category from '../models/Category.model.js';

/**
 * @desc Get all categories (optional search filter)
 * @route GET /api/v1/categories
 * @access Public / Authenticated
 */
export const getCategories = asyncHandler(async (req, res) => {
  const { search } = req.query;

  const whereClause = {};
  if (search && search.trim()) {
    whereClause.name = {
      [Op.like]: `%${search.trim()}%`,
    };
  }

  const categories = await Category.findAll({
    where: whereClause,
    order: [['createdAt', 'DESC']],
  });

  return res.status(200).json(
    new ApiResponse(200, categories, 'Categories fetched successfully')
  );
});

/**
 * @desc Get category by ID
 * @route GET /api/v1/categories/:id
 * @access Public / Authenticated
 */
export const getCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await Category.findByPk(id);
  if (!category) {
    throw new ApiError(404, 'Category not found.');
  }

  return res.status(200).json(
    new ApiResponse(200, category, 'Category fetched successfully')
  );
});

/**
 * @desc Create a new category
 * @route POST /api/v1/categories
 * @access Authenticated
 */
export const createCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    throw new ApiError(400, 'Category name is required.');
  }

  const trimmedName = name.trim();

  // Check if category name already exists (case-insensitive)
  const existingCategory = await Category.findOne({
    where: {
      name: {
        [Op.like]: trimmedName,
      },
    },
  });

  if (existingCategory) {
    throw new ApiError(409, `Category "${trimmedName}" already exists.`);
  }

  const category = await Category.create({ name: trimmedName });

  return res.status(201).json(
    new ApiResponse(201, category, 'Category created successfully')
  );
});

/**
 * @desc Update a category by ID
 * @route PUT /api/v1/categories/:id
 * @access Authenticated
 */
export const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name || !name.trim()) {
    throw new ApiError(400, 'Category name is required.');
  }

  const trimmedName = name.trim();

  const category = await Category.findByPk(id);
  if (!category) {
    throw new ApiError(404, 'Category not found.');
  }

  // Check if another category already has this name
  const duplicate = await Category.findOne({
    where: {
      name: { [Op.like]: trimmedName },
      id: { [Op.ne]: id },
    },
  });

  if (duplicate) {
    throw new ApiError(409, `Another category with name "${trimmedName}" already exists.`);
  }

  category.name = trimmedName;
  await category.save();

  return res.status(200).json(
    new ApiResponse(200, category, 'Category updated successfully')
  );
});

/**
 * @desc Delete category by ID
 * @route DELETE /api/v1/categories/:id
 * @access Authenticated
 */
export const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await Category.findByPk(id);
  if (!category) {
    throw new ApiError(404, 'Category not found.');
  }

  await category.destroy();

  return res.status(200).json(
    new ApiResponse(200, { id: Number(id) }, 'Category deleted successfully')
  );
});
