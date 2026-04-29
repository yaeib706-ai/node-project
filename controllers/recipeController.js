const Recipe = require('../models/Recips');
const Category = require('../models/Categories');
const Joi = require('joi');

const addRecipeSchema = Joi.object({
  name: Joi.string().trim().required(),
  description: Joi.string().trim().required(),
  category: Joi.string().trim().required(),
  preparationTime: Joi.number().positive().required(),
  difficulty: Joi.string().trim().required(),
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
  preparationTime: Joi.number().positive(),
  difficulty: Joi.string().trim(),
  layers: Joi.array().min(1),
  preparationInstructions: Joi.array().min(1),
  image: Joi.string().trim(),
  privacy: Joi.alternatives().try(
    Joi.boolean(),
    Joi.string().trim().valid('public', 'private', 'PUBLIC', 'PRIVATE')
  )
})
  .min(1)
  .required();

const getAllRecipes = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
    const skip = (page - 1) * limit;
    const search = (req.query.search || '').trim();

    const visibilityFilter = req.user?.id
  ? { $or: [{ isPublic: true }, { isPublic: false, userId: req.user.id }] }
  : { isPublic: true };

    const searchFilter = search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
          ]
        }
      : {};

    const filter = {
      ...visibilityFilter,
      ...searchFilter
    };

    const [recipes, total] = await Promise.all([
      Recipe.find(filter).skip(skip).limit(limit),
      Recipe.countDocuments(filter)
    ]);

    return res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      recipes
    });
  } catch (err) {
    return res.status(500).json({
      message: 'Failed to fetch recipes',
      error: err.message
    });
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

    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const categoryDoc = await Category.findById(value.category);
    if (!categoryDoc) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const isPublic =
      typeof value.privacy === 'boolean'
        ? value.privacy
        : value.privacy.toLowerCase() === 'public';

    const recipe = await Recipe.create({
      ...value,
      user: req.user.id,
      isPublic
    });

    categoryDoc.recipes.push(recipe._id);
    categoryDoc.numberOfRecipes += 1;
    await categoryDoc.save();

    return res.status(201).json(recipe);
  } catch (err) {
    return res.status(500).json({
      message: 'Failed to create recipe',
      error: err.message
    });
  }
};

const getRecipeById = async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await Recipe.findById(id);

    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    const canViewRecipe =
      recipe.isPublic || (req.user?.id && recipe.user?.toString() === req.user.id);

    if (!canViewRecipe) {
      return res.status(403).json({ message: 'Forbidden: you do not have access to this recipe' });
    }

    return res.status(200).json(recipe);
  } catch (err) {
    return res.status(500).json({
      message: 'Failed to fetch recipe',
      error: err.message
    });
  }
};

const getRecipesByTime = async (req, res) => {
  try {
    const time = Number(req.params.minutes);

    if (!Number.isFinite(time) || time < 0) {
      return res.status(400).json({ message: 'minutes must be a non-negative number' });
    }

    const visibilityFilter = req.user?.id
      ? {
          $or: [{ isPublic: true }, { isPublic: false, user: req.user.id }]
        }
      : { isPublic: true };

    const recipes = await Recipe.find({
      ...visibilityFilter,
      preparationTime: { $lte: time }
    });

    return res.status(200).json(recipes);
  } catch (err) {
    return res.status(500).json({
      message: 'Failed to fetch recipes by preparation time',
      error: err.message
    });
  }
};

const updateRecipe = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const { error, value } = updateRecipeSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: error.details.map((item) => item.message)
      });
    }

    const recipe = await Recipe.findById(id);
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    if (recipe.user?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: only recipe owner can update' });
    }

    let targetCategory = null;
    if (value.category && value.category !== recipe.category?.toString()) {
      targetCategory = await Category.findById(value.category);
      if (!targetCategory) {
        return res.status(404).json({ message: 'Category not found' });
      }
    }

    if (Object.prototype.hasOwnProperty.call(value, 'privacy')) {
      value.isPublic =
        typeof value.privacy === 'boolean'
          ? value.privacy
          : value.privacy.toLowerCase() === 'public';
      delete value.privacy;
    }

    const previousCategoryId = recipe.category?.toString();
    Object.assign(recipe, value);
    await recipe.save();

    if (targetCategory) {
      const previousCategory = await Category.findById(previousCategoryId);
      if (previousCategory) {
        previousCategory.recipes = previousCategory.recipes.filter(
          (recipeId) => recipeId.toString() !== recipe._id.toString()
        );
        previousCategory.numberOfRecipes = Math.max((previousCategory.numberOfRecipes || 0) - 1, 0);
        await previousCategory.save();
      }

      targetCategory.recipes.push(recipe._id);
      targetCategory.numberOfRecipes = (targetCategory.numberOfRecipes || 0) + 1;
      await targetCategory.save();
    }

    return res.status(200).json(recipe);
  } catch (err) {
    return res.status(500).json({
      message: 'Failed to update recipe',
      error: err.message
    });
  }
};

const deleteRecipe = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const recipe = await Recipe.findById(id);
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    const isOwner = recipe.user?.toString() === req.user.id;
    const role = (req.user.role || '').toLowerCase();
    const isAdmin = role === 'admin' || role === 'manager';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden: only owner or admin can delete' });
    }

    await Recipe.findByIdAndDelete(id);

    const category = await Category.findById(recipe.category);
    if (category) {
      category.recipes = category.recipes.filter((recipeId) => recipeId.toString() !== id);
      category.numberOfRecipes = Math.max((category.numberOfRecipes || 0) - 1, 0);
      await category.save();
    }

    return res.status(200).json({ message: 'Recipe deleted successfully' });
  } catch (err) {
    return res.status(500).json({
      message: 'Failed to delete recipe',
      error: err.message
    });
  }
};

const getRecipesByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const isSelf = req.user?.id === userId;
    const filter = isSelf ? { user: userId } : { user: userId, isPublic: true };

    const recipes = await Recipe.find(filter);
    return res.status(200).json(recipes);
  } catch (err) {
    return res.status(500).json({
      message: 'Failed to fetch user recipes',
      error: err.message
    });
  }
};

module.exports = {
  getAllRecipes,
  addRecipe,
  getRecipeById,
  getRecipesByTime,
  updateRecipe,
  deleteRecipe,
  getRecipesByUser
};
