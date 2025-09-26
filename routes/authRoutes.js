const express = require("express");
const { signup, login, forgotPassword, resetPassword } = require("../controllers/authController");

const router = express.Router();

// signup
router.post("/signup", signup);

// login
router.post("/login", login);

// get all users
router.get("/users", getUsers);

// update user
router.put("/users/:id", updateUser);

// delete user
router.delete("/users/:id", deleteUser);

// forgot password
router.post("/forgot-password", forgotPassword);

// reset password
router.post("/reset-password", resetPassword);

module.exports = router;
