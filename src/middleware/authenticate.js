const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
  const authHeader = req.header("Authorization");
  const token = authHeader && authHeader.split(" ")[1]; // Expected format: Bearer <token>

  if (!token) {
    return res.status(401).json({error: "Access denied. No token provided."});
  }

  try {
    // Support both Firebase Functions v2 secrets and process.env
    let jwtSecret = process.env.JWT_SECRET;

    // Try to get from Firebase Functions v2 secrets if not in process.env
    if (!jwtSecret) {
      try {
        // In Firebase Functions v2, secrets are passed via process.env
        // The defineSecret automatically makes them available as env vars
        jwtSecret = process.env.JWT_SECRET;
      } catch (e) {
        // Not running in Firebase environment, that's okay
      }
    }

    jwtSecret = jwtSecret || "fallback-secret-key";
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded; // This will contain { id, email } from the JWT payload
    next();
  } catch (err) {
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
