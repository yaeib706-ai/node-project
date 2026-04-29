const Recipe = require('../models/Recips');
const Category = require('../models/Categories');
const Joi = require('joi');

// 1. Schemas להוספה ועדכון
const addRecipeSchema = Joi.object({
  name: Joi.string().trim().required(),
  description: Joi.string().trim().required(),
  category: Joi.string().trim().required(),
  userId: Joi.string().trim().required(), 
  timeToPrepare: Joi.number().positive().required(),
  levelOfDifficulty: Joi.string().trim().required(),
  layers: Joi.array().min(1).required(),
  preparationInstructions: Joi.array().min(1).required(),
  image: Joi.string().trim().required(),
  privacy: Joi.alternatives()
    .try(
      Joi.boolean(),
      Joi.string().trim().valid('public', 'private', 'PUBLIC', 'PRIVATE')
    )
    .required()
});

const updateRecipeSchema = Joi.object({
  name: Joi.string().trim(),
  description: Joi.string().trim(),
  category: Joi.string().trim(),
  userId: Joi.string(),
  timeToPrepare: Joi.number().positive(),
  levelOfDifficulty: Joi.string().trim(),
  layers: Joi.array().min(1),
  preparationInstructions: Joi.array().min(1),
  image: Joi.string().trim(),
  privacy: Joi.alternatives().try(
    Joi.boolean(),
    Joi.string().trim().valid('public', 'private', 'PUBLIC', 'PRIVATE')
  )
}).min(1).required();

// 2. פונקציות ה-Controller
const getAllRecipes = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
    const skip = (page - 1) * limit;
    const search = (req.query.search || '').trim();

    const visibilityFilter = req.user?.id
      ? { $or: [{ isPublic: true }, { isPublic: false, user: req.user.id }] }
      : { isPublic: true };

    const searchFilter = search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
          ]
        }
      : {};

    const filter = { ...visibilityFilter, ...searchFilter };

    const [recipes, total] = await Promise.all([
      Recipe.find(filter).skip(skip).limit(limit),
      Recipe.countDocuments(filter)
    ]);

    return res.status(200).json({
      page, limit, total,
      totalPages: Math.ceil(total / limit),
      recipes
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch recipes', error: err.message });
  }
};

const addRecipe = async (req, res) => {
  try {
    const { error, value } = addRecipeSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: error.details.map((item) => item.message)
      });
    }

    const categoryDoc = await Category.findById(value.category);
    if (!categoryDoc) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const isPublic = typeof value.privacy === 'boolean'
        ? value.privacy
        : value.privacy.toLowerCase() === 'public';

    const recipe = await Recipe.create({
      ...value,
      user: value.userId, // שימוש ב-userId שנשלח ב-Body
      isPublic
    });

    categoryDoc.recipes.push(recipe._id);
    categoryDoc.numberOfRecipes = (categoryDoc.numberOfRecipes || 0) + 1;
    await categoryDoc.save();

    return res.status(201).json(recipe);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to create recipe', error: err.message });
  }
};

const getRecipeById = async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await Recipe.findById(id);
    if (!recipe) return res.status(404).json({ message: 'Recipe not found' });

    const canViewRecipe = recipe.isPublic || (req.user?.id && recipe.user?.toString() === req.user.id);
    if (!canViewRecipe) return res.status(403).json({ message: 'Forbidden' });

    return res.status(200).json(recipe);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch recipe', error: err.message });
  }
};

const getRecipesByTime = async (req, res) => {
  try {
    const time = Number(req.params.minutes);
    if (isNaN(time) || time < 0) return res.status(400).json({ message: 'Invalid time' });

    const recipes = await Recipe.find({ timeToPrepare: { $lte: time }, isPublic: true });
    return res.status(200).json(recipes);
  } catch (err) {
    return res.status(500).json({ message: 'Error', error: err.message });
  }
};

const updateRecipe = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = updateRecipeSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const recipe = await Recipe.findByIdAndUpdate(id, value, { new: true });
    return res.status(200).json(recipe);
  } catch (err) {
    return res.status(500).json({ message: 'Update failed', error: err.message });
  }
};

const deleteRecipe = async (req, res) => {
  try {
    const { id } = req.params;
    await Recipe.findByIdAndDelete(id);
    return res.status(200).json({ message: 'Deleted successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Delete failed', error: err.message });
  }
};

const getRecipesByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const recipes = await Recipe.find({ user: userId });
    return res.status(200).json(recipes);
  } catch (err) {
    return res.status(500).json({ message: 'Error', error: err.message });
  }
};

// 3. הייצוא - חייב להיות מחוץ לכל הפונקציות
module.exports = {
  getAllRecipes,
  addRecipe,
  getRecipeById,
  getRecipesByTime,
  updateRecipe,
  deleteRecipe,
  getRecipesByUser
};