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

/** Access token lifetime — long enough to survive browser refreshes. */
const JWT_EXPIRES_IN = "7d";

module.exports = {getJwtSecret, assertJwtSecretConfigured, JWT_EXPIRES_IN};
