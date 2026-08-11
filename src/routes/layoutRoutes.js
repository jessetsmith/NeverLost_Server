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
  uploadLayoutThumbnail,
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
const {invalidateStaleLayoutThumbnails} = require("../services/layoutThumbnailService");

router.get("/explore", authenticate, exploreLayouts);

router.post("/jobs/refresh-thumbnails", async (req, res) => {
  const secret = req.headers["x-cron-secret"];
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(403).json({error: "Forbidden"});
  }

  try {
    const result = await invalidateStaleLayoutThumbnails(req.sanityClient);
    return res.status(200).json(result);
  } catch (err) {
    console.error("Refresh layout thumbnails job failed:", err);
    return res.status(500).json({error: "Server error. Please try again later."});
  }
});

router.post("/", authenticate, createLayout);
router.get("/", authenticate, getAllLayouts);

router.post("/invites/:layoutId/accept", authenticate, acceptInvite);
router.post("/invites/:layoutId/decline", authenticate, declineInvite);

router.put("/:layoutId/publish", authenticate, publishLayout);
router.put("/:layoutId/unpublish", authenticate, unpublishLayout);
router.post("/:layoutId/thumbnail", authenticate, uploadLayoutThumbnail);
router.post("/:layoutId/invites", authenticate, inviteLimiter, inviteCollaborator);
router.get("/:layoutId/collaborators", authenticate, getCollaborators);
router.delete("/:layoutId/collaborators/:userId", authenticate, removeCollaborator);

router.get("/:layoutId", authenticate, getLayoutById);
router.put("/:layoutId", authenticate, updateLayout);
router.delete("/:layoutId", authenticate, deleteLayout);

module.exports = router;
