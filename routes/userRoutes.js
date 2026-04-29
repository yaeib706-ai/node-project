const express = require('express');

const router = express.Router();
const { signup, login, getAllUsers, deleteUser, updatePassword } = require('../controllers/userController');
const { verifyToken, isAdmin } = require('../middlewares/auth'); 

router.post('/signup', signup);
router.post('/login', login);
router.get('/', verifyToken, isAdmin, getAllUsers);

router.put('/password/:id', verifyToken, updatePassword);

router.delete('/:id', verifyToken, deleteUser);
module.exports = router;
