const fs = require("fs");
const path = require("path");
const {v4: uuidv4} = require("uuid");

const PROFILES_ROOT = path.join(__dirname, "../../uploads/profiles");

const CONTENT_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

function buildProfilePublicUrl(req, userId, filename) {
  const relativePath = `/uploads/profiles/${userId}/${filename}`;
  if (process.env.ASSET_BASE_URL) {
    return `${process.env.ASSET_BASE_URL.replace(/\/$/, "")}${relativePath}`;
  }
  return `${req.protocol}://${req.get("host")}${relativePath}`;
}

function saveLocalProfileImage(userId, buffer, filename) {
  const userDir = path.join(PROFILES_ROOT, String(userId));
  fs.mkdirSync(userDir, {recursive: true});
  const filePath = path.join(userDir, filename);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

function deleteLocalProfileImageIfOwned(userId, profileImageUrl) {
  if (!profileImageUrl || !profileImageUrl.includes("/uploads/profiles/")) {
    return;
  }

  const marker = `/uploads/profiles/${userId}/`;
  const index = profileImageUrl.indexOf(marker);
  if (index === -1) {
    return;
  }

  const filename = profileImageUrl.slice(index + marker.length);
  if (!filename || filename.includes("..") || filename.includes("/")) {
    return;
  }

  const filePath = path.join(PROFILES_ROOT, String(userId), filename);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.warn("Could not delete old profile image:", err.message);
  }
}

module.exports = {
  PROFILES_ROOT,
  CONTENT_TYPES,
  buildProfilePublicUrl,
  saveLocalProfileImage,
  deleteLocalProfileImageIfOwned,
};
