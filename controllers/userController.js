const Joi = require('joi');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
console.log("User Model Check:", User);
const signupSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().email().required(),
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$'))
    .required()
    .messages({
      'string.pattern.base':
        'Password must include uppercase, lowercase, number, and special character.'
    }),
  address: Joi.string().trim().min(2).max(255).required(),
  role: Joi.string().valid('user', 'admin', 'manager').optional()
});

const loginSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().required()
});

const updatePasswordSchema = Joi.object({
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$'))
    .required()
    .messages({
      'string.pattern.base':
        'Password must include uppercase, lowercase, number, and special character.'
    })
});

const signup = async (req, res) => {
  try {
    const { error, value } = signupSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: error.details.map((item) => item.message)
      });
    }

    const existingUser = await User.findOne({ email: value.email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(value.password, saltRounds);

    const newUser = await User.create({
      ...value,
      email: value.email.toLowerCase(),
      password: hashedPassword
    });

    return res.status(201).json({
      message: 'User created successfully',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        address: newUser.address,
        role: newUser.role
      }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Signup failed', error: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: error.details.map((item) => item.message)
      });
    }

    const user = await User.findOne({ email: value.email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isPasswordMatch = await bcrypt.compare(value.password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'default_secret_change_me',
      { expiresIn: '1d' }
    );

    return res.status(200).json({
      message: 'Login successful',
      token
    });
  } catch (err) {
    return res.status(500).json({ message: 'Login failed', error: err.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userRole = (req.user.role || '').toLowerCase();
    if (userRole !== 'admin' && userRole !== 'manager') {
      return res.status(403).json({ message: 'Forbidden: admin or manager access required' });
    }

    const users = await User.find().select('-password');
    return res.status(200).json(users);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch users', error: err.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const isAdmin = ['admin', 'manager'].includes((req.user.role || '').toLowerCase());
    const isSelf = req.user.id === id;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ message: 'Forbidden: you can delete only your own user' });
    }

    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete user', error: err.message });
  }
};

const updatePassword = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const isAdmin = ['admin', 'manager'].includes((req.user.role || '').toLowerCase());
    const isSelf = req.user.id === id;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ message: 'Forbidden: you can update only your own password' });
    }

    const { error, value } = updatePasswordSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: error.details.map((item) => item.message)
      });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(value.password, saltRounds);

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { password: hashedPassword },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      message: 'Password updated successfully',
      user: updatedUser
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update password', error: err.message });
  }
};

module.exports = {
  signup,
  login,
  getAllUsers,
  deleteUser,
  updatePassword
};
