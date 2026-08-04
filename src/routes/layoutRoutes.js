const express = require("express");
const router = express.Router();
const {
  createLayout,
  getLayoutById,
  updateLayout,
  deleteLayout,
  getAllLayouts,
  exploreLayouts,
  publishLayout,
  unpublishLayout,
} = require("../controllers/layoutController");
const {
  inviteCollaborator,
  acceptInvite,
  declineInvite,
  removeCollaborator,
  getCollaborators,
} = require("../controllers/collaborationController");
const {authenticate} = require("../middleware/authenticate");
const {inviteLimiter} = require("../middleware/security");

router.get("/explore", authenticate, exploreLayouts);

router.post("/", authenticate, createLayout);
router.get("/", authenticate, getAllLayouts);

router.post("/invites/:layoutId/accept", authenticate, acceptInvite);
router.post("/invites/:layoutId/decline", authenticate, declineInvite);

router.put("/:layoutId/publish", authenticate, publishLayout);
router.put("/:layoutId/unpublish", authenticate, unpublishLayout);
router.post("/:layoutId/invites", authenticate, inviteLimiter, inviteCollaborator);
router.get("/:layoutId/collaborators", authenticate, getCollaborators);
router.delete("/:layoutId/collaborators/:userId", authenticate, removeCollaborator);

router.get("/:layoutId", authenticate, getLayoutById);
router.put("/:layoutId", authenticate, updateLayout);
router.delete("/:layoutId", authenticate, deleteLayout);

module.exports = router;
