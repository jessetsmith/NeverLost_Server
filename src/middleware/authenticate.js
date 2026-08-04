const jwt = require("jsonwebtoken");
const {getJwtSecret, assertJwtSecretConfigured} = require("../utils/jwtSecret");
const {JWT_ALGORITHM} = require("../utils/assetUrlSecurity");

try {
  assertJwtSecretConfigured();
} catch (err) {
  if (!process.env.K_SERVICE && !process.env.FUNCTION_TARGET) {
    console.warn(`⚠️  ${err.message} — auth routes will fail until JWT_SECRET is set.`);
  }
}

const authenticate = (req, res, next) => {
  const authHeader = req.header("Authorization");
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({error: "Access denied. No token provided."});
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret(), {algorithms: [JWT_ALGORITHM]});
    req.user = decoded;
    next();
  } catch (err) {
    if (err.message === "JWT_SECRET is not configured") {
      console.error("Authentication misconfiguration:", err.message);
      return res.status(503).json({error: "Authentication is not configured."});
    }
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({error: "Token expired. Please log in again."});
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({error: "Invalid token. Please log in again."});
    }
    return res.status(401).json({error: "Authentication failed."});
  }
};

module.exports = {authenticate};
