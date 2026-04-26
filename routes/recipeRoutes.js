const express = require('express');
const {
  getAllRecipes,
  addRecipe,
  getRecipeById,
  getRecipesByTime,
  updateRecipe,
  deleteRecipe,
  getRecipesByUser
} = require('../controllers/recipeController');
const { verifyToken, isAdmin } = require('../middlewares/auth');

const router = express.Router();

// נתיבי GET נשארים ציבוריים כדי לאפשר גישה גם לאורחים.
// הלוגיקה של פרטיות המתכון כבר מטופלת בתוך ה-Controller לפי משתמש מחובר או אורח.
router.get('/', getAllRecipes);
router.get('/time/:minutes', getRecipesByTime);
router.get('/user/:userId', getRecipesByUser);
router.get('/:id', getRecipeById);

router.post('/', verifyToken, addRecipe);
router.put('/:id', verifyToken, updateRecipe);
router.delete('/:id', verifyToken, deleteRecipe);

module.exports = router;
