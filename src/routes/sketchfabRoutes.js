const express = require("express");
const router = express.Router();
const {
  search,
  oauthUrl,
  oauthExchange,
  oauthRefresh,
  oauthStatus,
  saveModel,
  importModel,
} = require("../controllers/sketchfabController");
const {authenticate} = require("../middleware/authenticate");

router.get("/status", authenticate, oauthStatus);
router.get("/search", authenticate, search);
router.get("/oauth/url", authenticate, oauthUrl);
router.post("/oauth/exchange", authenticate, oauthExchange);
router.post("/oauth/refresh", authenticate, oauthRefresh);
router.post("/save", authenticate, saveModel);
router.post("/import/:layoutId", authenticate, importModel);

module.exports = router;
