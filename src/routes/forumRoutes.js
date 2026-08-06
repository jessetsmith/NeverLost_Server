const express = require("express");
const router = express.Router();
const {
  listThreads,
  getThread,
  createThread,
  createPost,
} = require("../controllers/forumController");
const {authenticate} = require("../middleware/authenticate");
const {messageLimiter} = require("../middleware/security");

router.get("/threads", authenticate, listThreads);
router.get("/threads/:threadId", authenticate, getThread);
router.post("/threads", authenticate, messageLimiter, createThread);
router.post("/threads/:threadId/posts", authenticate, messageLimiter, createPost);

module.exports = router;
