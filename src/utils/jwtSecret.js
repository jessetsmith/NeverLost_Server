/** Returns JWT secret or throws if missing — never use a hardcoded fallback. */
function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return secret;
}

function assertJwtSecretConfigured() {
  getJwtSecret();
}

/** Access token lifetime — matches 24-hour browser session storage. */
const JWT_EXPIRES_IN = "24h";

module.exports = {getJwtSecret, assertJwtSecretConfigured, JWT_EXPIRES_IN};
