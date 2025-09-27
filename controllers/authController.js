const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/userModel');
const sendEmail = require('../utils/sendEmail');


const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

// Signup
exports.signup = async (req, res) => {
    try {
        const { name, email, phone, password, confirmPassword } = req.body;
        if (!name || !email || !phone || !password || !confirmPassword) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match' });


        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ error: 'Email already in use' });


        const user = await User.create({ name, email, phone, password });
        const token = signToken(user._id);
        res.status(201).json({ status: 'success', token, data: { user: { id: user._id, name: user.name, email: user.email, phone: user.phone } } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// Login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Please provide email and password' });


        const user = await User.findOne({ email }).select('+password');
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ error: 'Incorrect email or password' });
        }


        const token = signToken(user._id);
        res.json({ status: 'success', token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get all users
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password -resetPasswordToken -resetPasswordExpires');
        res.json({ status: 'success', results: users.length, data: users });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Get user by id
exports.getUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ status: 'success', data: user });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Update user (name, email, phone)
exports.updateUser = async (req, res) => {
    try {
        const allowed = ['name', 'email', 'phone'];
        const updates = {};
        allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });


        const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ status: 'success', data: user });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Delete user
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ status: 'success', message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Change password (authenticated)
exports.changePassword = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('+password');
        const { currentPassword, newPassword, confirmNewPassword } = req.body;
        if (!currentPassword || !newPassword || !confirmNewPassword) return res.status(400).json({ error: 'All fields required' });
        if (!(await user.comparePassword(currentPassword))) return res.status(401).json({ error: 'Current password incorrect' });
        if (newPassword !== confirmNewPassword) return res.status(400).json({ error: 'Passwords do not match' });


        user.password = newPassword;
        user.passwordChangedAt = Date.now();
        await user.save();


        const token = signToken(user._id);
        res.json({ status: 'success', token });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Forgot password
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Provide email' });


        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ error: 'User not found' });


        const resetToken = user.createPasswordResetToken();
        await user.save({ validateBeforeSave: false });


        const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
        const message = `You requested a password reset. Submit a PATCH request with your new password to: ${resetURL}\nIf you didn't request, ignore.`;


        try {
            await sendEmail({ to: user.email, subject: 'Password reset', text: message });
            res.json({ status: 'success', message: 'Token sent to email' });
        } catch (err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save({ validateBeforeSave: false });
            return res.status(500).json({ error: 'Error sending email' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Reset password (via token)
exports.resetPassword = async (req, res) => {
    try {
        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
        const user = await User.findOne({ resetPasswordToken: hashedToken, resetPasswordExpires: { $gt: Date.now() } }).select('+password');
        if (!user) return res.status(400).json({ error: 'Token is invalid or has expired' });


        const { newPassword, confirmNewPassword } = req.body;
        if (!newPassword || !confirmNewPassword) return res.status(400).json({ error: 'Provide new passwords' });
        if (newPassword !== confirmNewPassword) return res.status(400).json({ error: 'Passwords do not match' });


        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        user.passwordChangedAt = Date.now();
        await user.save();


        const token = signToken(user._id);
        res.json({ status: 'success', token });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Get all users (admin)
exports.getUsers = async (req, res) => {
    try {
        const users = await User.find();
        res.json({ status: 'success', data: users });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};
// Update user by id (admin)
exports.updateUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ status: 'success', data: user });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};
// Delete user by id (admin)
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ status: 'success', message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};