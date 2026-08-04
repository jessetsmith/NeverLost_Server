const express = require("express");
const router = express.Router();
const {
  listConnections,
  listIncomingRequests,
  addConnection,
  acceptConnectionRequest,
  declineConnectionRequest,
  removeConnection,
} = require("../controllers/connectionController");
const {authenticate} = require("../middleware/authenticate");

router.get("/requests", authenticate, listIncomingRequests);
router.post("/requests/:requestId/accept", authenticate, acceptConnectionRequest);
router.post("/requests/:requestId/decline", authenticate, declineConnectionRequest);
router.get("/", authenticate, listConnections);
router.post("/", authenticate, addConnection);
router.delete("/:userId", authenticate, removeConnection);

module.exports = router;
