const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
  const authHeader = req.header("Authorization");
  const token = authHeader?.split(" ")[1]; // Expected format: Bearer <token>
  
  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || "fallback-secret-key";
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded; // This will contain { id, email } from the JWT payload
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired. Please log in again." });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token. Please log in again." });
    }
    return res.status(401).json({ error: "Authentication failed." });
  }
};

module.exports = { authenticate };
