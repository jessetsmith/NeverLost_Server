const express = require("express");
const router = express.Router();
const {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} = require("../controllers/notificationController");
const {authenticate} = require("../middleware/authenticate");

router.get("/", authenticate, getNotifications);
router.get("/unread-count", authenticate, getUnreadCount);
router.put("/read-all", authenticate, markAllNotificationsRead);
router.put("/:id/read", authenticate, markNotificationRead);

module.exports = router;
