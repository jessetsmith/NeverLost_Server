const multer = require("multer");

const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const uploadFloorplan = multer({
  storage: multer.memoryStorage(),
  limits: {fileSize: MAX_FILE_SIZE},
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf("."));
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error("Only PNG, JPG, and WebP floorplan images are allowed."));
    }
    cb(null, true);
  },
});

module.exports = {uploadFloorplan, MAX_FLOORPLAN_SIZE: MAX_FILE_SIZE};
