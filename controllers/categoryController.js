const Joi = require('joi');
const Category = require('../models/Categories');

const addCategorySchema = Joi.object({
  name: Joi.string().trim().required(),
  description: Joi.string().trim().required()
});

const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    return res.status(200).json(categories);
  } catch (err) {
    return res.status(500).json({
      message: 'Failed to fetch categories',
      error: err.message
    });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    return res.status(200).json(category);
  } catch (err) {
    return res.status(500).json({
      message: 'Failed to fetch category',
      error: err.message
    });
  }
};

const addCategory = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userRole = (req.user.role || '').toLowerCase();
    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: admin access required' });
    }

    const { error, value } = addCategorySchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: error.details.map((item) => item.message)
      });
    }

    const category = await Category.create({
      ...value,
      numberOfRecipes: 0,
      recipes: []
    });

    return res.status(201).json(category);
  } catch (err) {
    return res.status(500).json({
      message: 'Failed to create category',
      error: err.message
    });
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  addCategory
};
