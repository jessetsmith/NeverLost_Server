const express = require("express");
const router = express.Router();
const {uploadAsset: uploadAssetHandler, proxyAsset} = require("../controllers/assetController");
const {uploadAsset: uploadMiddleware} = require("../middleware/uploadAsset");
const {authenticate} = require("../middleware/authenticate");
const {uploadLimiter} = require("../middleware/security");

router.post(
    "/upload",
    authenticate,
    uploadLimiter,
    uploadMiddleware.single("file"),
    uploadAssetHandler,
);
router.get("/proxy", authenticate, proxyAsset);

module.exports = router;
