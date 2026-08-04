const express = require("express");
const router = express.Router();
const {
  listAssets,
  registerAsset,
  removeAsset,
  renameAsset,
  addToLayout,
} = require("../controllers/userAssetController");
const {authenticate} = require("../middleware/authenticate");

router.get("/", authenticate, listAssets);
router.post("/", authenticate, registerAsset);
router.put("/:assetId", authenticate, renameAsset);
router.delete("/:assetId", authenticate, removeAsset);
router.post("/:assetId/add-to-layout/:layoutId", authenticate, addToLayout);

module.exports = router;
