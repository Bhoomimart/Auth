const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect MongoDB
connectDB();

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cookieParser());

// Routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/v1/auth', authRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.send('Auth API running...');
});

// Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
