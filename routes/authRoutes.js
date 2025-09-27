const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// ========== AUTH ROUTES ==========

// Signup
router.post('/signup', authController.signup);

// Login
router.post('/login', authController.login);

// Forgot password (send email with token)
router.post('/forgot-password', authController.forgotPassword);

// Reset password (with token from email)
router.patch('/reset-password/:token', authController.resetPassword);

// Change password (user must be logged in)
router.patch('/change-password', protect, authController.changePassword);

// ========== CRUD USER ROUTES ==========

// Get all users (protected)
router.get('/', protect, authController.getAllUsers);

// Get user by ID
router.get('/:id', protect, authController.getUser);

// Update user (name, email, phone)
router.put('/:id', protect, authController.updateUser);

// Delete user
router.delete('/:id', protect, authController.deleteUser);

module.exports = router;

const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');