const express = require("express");
const router = express.Router();
const {
  getConversations,
  getMessagesWithUser,
  sendMessage,
} = require("../controllers/messageController");
const {authenticate} = require("../middleware/authenticate");
const {messageLimiter, messagesReadLimiter} = require("../middleware/security");

router.get("/conversations", authenticate, messagesReadLimiter, getConversations);
router.get("/with/:userId", authenticate, messagesReadLimiter, getMessagesWithUser);
router.post("/", authenticate, messageLimiter, sendMessage);

module.exports = router;
