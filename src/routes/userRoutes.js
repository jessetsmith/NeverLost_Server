const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  getProfile,
  refreshSession,
  updateProfile,
  uploadProfileImage,
  changePassword,
  getPublicProfile,
} = require("../controllers/userController");
const {authenticate} = require("../middleware/authenticate");
const {authLimiter, uploadLimiter} = require("../middleware/security");
const {
  uploadProfileImage: uploadProfileImageMiddleware,
} = require("../middleware/uploadProfileImage");

router.post("/register", authLimiter, registerUser);
router.post("/login", authLimiter, loginUser);
router.post("/session/refresh", authenticate, refreshSession);
router.get("/profile", authenticate, getProfile);
router.put("/profile", authenticate, updateProfile);
router.post(
    "/profile/avatar",
    authenticate,
    uploadLimiter,
    uploadProfileImageMiddleware.single("file"),
    uploadProfileImage,
);
router.get("/:userId/public", authenticate, getPublicProfile);
router.put("/password", authenticate, authLimiter, changePassword);

module.exports = router;
