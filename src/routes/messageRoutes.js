const express = require("express");
const router = express.Router();
const {
  getConversations,
  getMessagesWithUser,
  sendMessage,
} = require("../controllers/messageController");
const {authenticate} = require("../middleware/authenticate");
const {messageLimiter} = require("../middleware/security");

router.get("/conversations", authenticate, getConversations);
router.get("/with/:userId", authenticate, getMessagesWithUser);
router.post("/", authenticate, messageLimiter, sendMessage);

module.exports = router;
