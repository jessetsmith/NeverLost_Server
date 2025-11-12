const express = require("express");
const router = express.Router();
const {registerUser, loginUser} = require("../controllers/userController");

// Registration Route
router.post("/register", registerUser);

// Login Route
router.post("/login", loginUser);

// Add other user-related routes here

module.exports = router;
