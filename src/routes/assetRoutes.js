const express = require("express");
const router = express.Router();
const {uploadAsset: uploadAssetHandler, uploadFloorplan: uploadFloorplanHandler, proxyAsset} = require("../controllers/assetController");
const {uploadAsset: uploadMiddleware} = require("../middleware/uploadAsset");
const {uploadFloorplan: uploadFloorplanMiddleware} = require("../middleware/uploadFloorplan");
const {authenticate} = require("../middleware/authenticate");
const {uploadLimiter} = require("../middleware/security");

router.post(
    "/upload",
    authenticate,
    uploadLimiter,
    uploadMiddleware.single("file"),
    uploadAssetHandler,
);
router.post(
    "/upload-floorplan",
    authenticate,
    uploadLimiter,
    uploadFloorplanMiddleware.single("file"),
    uploadFloorplanHandler,
);
router.get("/proxy", authenticate, proxyAsset);

module.exports = router;
