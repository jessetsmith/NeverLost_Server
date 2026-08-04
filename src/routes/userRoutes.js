const express = require("express");
const router = express.Router();
const {registerUser, loginUser} = require("../controllers/userController");
const {authLimiter} = require("../middleware/security");

router.post("/register", authLimiter, registerUser);
router.post("/login", authLimiter, loginUser);

module.exports = router;
