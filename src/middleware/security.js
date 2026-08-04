const rateLimit = require("express-rate-limit");

function shouldSkipGlobalRateLimit(req) {
  const path = req.path || "";
  return (
    path === "/api/users/login" ||
    path === "/api/users/register" ||
    path.endsWith("/users/login") ||
    path.endsWith("/users/register")
  );
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {error: "Too many attempts. Please try again later."},
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {error: "Too many uploads. Please try again later."},
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipGlobalRateLimit,
  message: {error: "Too many requests. Please try again later."},
});

const inviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {error: "Too many invites. Please try again later."},
});

const messageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {error: "Too many messages. Please try again later."},
});

const messagesReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {error: "Too many message requests. Please slow down."},
});

module.exports = {
  authLimiter,
  uploadLimiter,
  apiLimiter,
  inviteLimiter,
  messageLimiter,
  messagesReadLimiter,
};
