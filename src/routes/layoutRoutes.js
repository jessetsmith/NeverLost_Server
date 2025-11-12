const express = require("express");
const router = express.Router();
const {
  createLayout,
  getLayoutById,
  updateLayout,
  deleteLayout,
  getAllLayouts, // Add this import
} = require("../controllers/layoutController");

const {authenticate} = require("../middleware/authenticate");

// Create Layout Route
router.post("/", authenticate, createLayout);

// Get All Layouts Route
router.get("/", authenticate, getAllLayouts); // Add this route

// Get Layout by ID Route
router.get("/:layoutId", authenticate, getLayoutById);

// Update Layout Route
// Ensure this route is configured
router.put("/:layoutId", authenticate, updateLayout);

// Delete Layout Route
router.delete("/:layoutId", authenticate, deleteLayout);

module.exports = router;
