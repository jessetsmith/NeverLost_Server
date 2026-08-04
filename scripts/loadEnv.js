const path = require("path");
const dotenv = require("dotenv");

const ROOT = path.join(__dirname, "..");

/**
 * Load env files for local `npm start` / nodemon only.
 * Cloud Run / Firebase inject env via defineString + secrets — skip file loading.
 *
 * Switch profiles with NEVERLOST_PROFILE:
 *   local      → env/local.env      (localhost Sketchfab OAuth redirect)
 *   production → env/production.env (GitHub Pages Sketchfab OAuth redirect)
 *
 * Secrets always come from .env.local (gitignored).
 */
function loadLocalEnv() {
  if (process.env.FUNCTION_TARGET || process.env.K_SERVICE) {
    return {profile: "production", source: "cloud-run"};
  }

  const profile = process.env.NEVERLOST_PROFILE || "local";
  const profileFile = path.join(ROOT, "env", `${profile}.env`);

  dotenv.config({path: path.join(ROOT, ".env.local")});
  dotenv.config({path: profileFile, override: true});
  dotenv.config({path: path.join(ROOT, ".env"), override: true});

  return {profile, source: "files", profileFile};
}

module.exports = {loadLocalEnv};
