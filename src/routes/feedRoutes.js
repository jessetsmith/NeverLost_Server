const express = require("express");
const router = express.Router();
const {listFeed} = require("../controllers/feedController");
const {authenticate} = require("../middleware/authenticate");

router.get("/", authenticate, listFeed);

module.exports = router;
