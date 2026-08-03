const multer = require("multer");

const ALLOWED_EXTENSIONS = [".glb", ".gltf"];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

const uploadAsset = multer({
  storage: multer.memoryStorage(),
  limits: {fileSize: MAX_FILE_SIZE},
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf("."));
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error("Only .glb and .gltf files are allowed."));
    }
    cb(null, true);
  },
});

module.exports = {uploadAsset, MAX_FILE_SIZE};
