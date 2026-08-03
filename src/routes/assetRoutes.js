const express = require("express");
const router = express.Router();
const {uploadAsset: uploadAssetHandler, proxyAsset} = require("../controllers/assetController");
const {uploadAsset: uploadMiddleware} = require("../middleware/uploadAsset");
const {authenticate} = require("../middleware/authenticate");

router.post("/upload", authenticate, uploadMiddleware.single("file"), uploadAssetHandler);
router.get("/proxy", proxyAsset);

module.exports = router;
