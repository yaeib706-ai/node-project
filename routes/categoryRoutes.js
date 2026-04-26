const express = require('express');
const {
  getAllCategories,
  getCategoryById,
  addCategory
} = require('../controllers/categoryController');
const { verifyToken, isAdmin } = require('../middlewares/auth');

const router = express.Router();

router.get('/', getAllCategories);
router.get('/:id', getCategoryById);
router.post('/', verifyToken, isAdmin, addCategory);

module.exports = router;
