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

module.exports = {getJwtSecret, assertJwtSecretConfigured};
