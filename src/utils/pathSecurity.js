const path = require("path");

/** Sketchfab model UIDs are 32-char hex strings. */
function assertValidSketchfabUid(modelUid) {
  if (!/^[a-f0-9]{32}$/i.test(String(modelUid || ""))) {
    throw new Error("Invalid Sketchfab model UID.");
  }
}

/** Ensure resolved path stays inside baseDir (prevents path traversal). */
function resolvePathUnder(baseDir, ...segments) {
  const base = path.resolve(baseDir);
  const resolved = path.resolve(base, ...segments);
  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    throw new Error("Invalid file path.");
  }
  return resolved;
}

module.exports = {assertValidSketchfabUid, resolvePathUnder};
