const multer = require("multer");

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const uploadProfileImage = multer({
  storage: multer.memoryStorage(),
  limits: {fileSize: MAX_FILE_SIZE},
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf("."));
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error("Only JPEG, PNG, GIF, and WebP images are allowed."));
    }
    cb(null, true);
  },
});

module.exports = {uploadProfileImage, MAX_PROFILE_IMAGE_SIZE: MAX_FILE_SIZE};
