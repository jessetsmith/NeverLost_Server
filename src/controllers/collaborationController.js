const {createNotification} = require("../services/notificationService");
const {findUserByEmailOrUsername, getUserSummary} = require("../services/userLookup");
const {
  canManageCollaborators,
  getCollaborator,
  getLayoutRole,
} = require("../utils/layoutAccess");

async function getLayoutOr404(sanityClient, layoutId) {
  const layout = await sanityClient.getDocument(layoutId);
  if (!layout || layout._type !== "layout") {
    return null;
  }
  return layout;
}

const inviteCollaborator = async (req, res) => {
  const {layoutId} = req.params;
  const userId = req.user.id;
  const {email, username, role} = req.body;

  if (!email && !username) {
    return res.status(400).json({error: "Email or username is required."});
  }

  const inviteRole = role === "viewer" ? "viewer" : "editor";

  try {
    const sanityClient = req.sanityClient;
    const layout = await getLayoutOr404(sanityClient, layoutId);

    if (!layout) {
      return res.status(404).json({error: "Layout not found."});
    }

    if (!canManageCollaborators(layout, userId)) {
      return res.status(403).json({error: "Only the owner can invite collaborators."});
    }

    const invitee = await findUserByEmailOrUsername(sanityClient, {email, username});
    if (!invitee) {
      return res.status(404).json({error: "User not found. They must have a NeverLost account."});
    }

    if (invitee._id === userId) {
      return res.status(400).json({error: "You cannot invite yourself."});
    }

    const collaborators = [...(layout.collaborators || [])];
    const existing = collaborators.find((entry) => entry.userId === invitee._id);

    if (existing && (existing.status === "pending" || existing.status === "accepted")) {
      return res.status(400).json({error: "This user already has a pending or accepted invite."});
    }

    const invitedAt = new Date().toISOString();
    const newEntry = {
      userId: invitee._id,
      role: inviteRole,
      status: "pending",
      invitedBy: userId,
      invitedAt,
    };

    if (existing) {
      const index = collaborators.findIndex((entry) => entry.userId === invitee._id);
      collaborators[index] = {...existing, ...newEntry, respondedAt: null};
    } else {
      collaborators.push(newEntry);
    }

    await sanityClient.patch(layoutId).set({collaborators}).commit();

    const owner = await getUserSummary(sanityClient, userId);
    const permissionLabel = inviteRole === "viewer" ? "view" : "edit";
    await createNotification(sanityClient, {
      recipientUserId: invitee._id,
      type: "layout_invite",
      title: "Layout collaboration invite",
      body: `${owner?.username || "Someone"} invited you to ${permissionLabel} "${layout.name}".`,
      payload: {layoutId, layoutName: layout.name, invitedBy: userId, role: inviteRole},
    });

    res.status(201).json({
      message: "Invite sent.",
      collaborator: {
        userId: invitee._id,
        username: invitee.username,
        email: invitee.email,
        role: inviteRole,
        status: "pending",
        invitedAt,
      },
    });
  } catch (err) {
    console.error("Invite Collaborator Error:", err);
    res.status(500).json({error: "Server error. Please try again later."});
  }
};

const acceptInvite = async (req, res) => {
  const {layoutId} = req.params;
  const userId = req.user.id;

  try {
    const sanityClient = req.sanityClient;
    const layout = await getLayoutOr404(sanityClient, layoutId);

    if (!layout) {
      return res.status(404).json({error: "Layout not found."});
    }

    const collaborator = getCollaborator(layout, userId);
    if (!collaborator || collaborator.status !== "pending") {
      return res.status(400).json({error: "No pending invite found for this layout."});
    }

    const respondedAt = new Date().toISOString();
    const collaborators = (layout.collaborators || []).map((entry) =>
      entry.userId === userId ?
        {...entry, status: "accepted", respondedAt} :
        entry,
    );

    await sanityClient.patch(layoutId).set({collaborators}).commit();

    const invitee = await getUserSummary(sanityClient, userId);
    const permissionLabel = collaborator.role === "viewer" ? "view" : "edit";
    await createNotification(sanityClient, {
      recipientUserId: layout.userId,
      type: "invite_accepted",
      title: "Invite accepted",
      body: `${invitee?.username || "A user"} accepted your invite to ${permissionLabel} "${layout.name}".`,
      payload: {layoutId, layoutName: layout.name, userId, role: collaborator.role || "editor"},
    });

    res.status(200).json({message: "Invite accepted.", layoutId});
  } catch (err) {
    console.error("Accept Invite Error:", err);
    res.status(500).json({error: "Server error. Please try again later."});
  }
};

const declineInvite = async (req, res) => {
  const {layoutId} = req.params;
  const userId = req.user.id;

  try {
    const sanityClient = req.sanityClient;
    const layout = await getLayoutOr404(sanityClient, layoutId);

    if (!layout) {
      return res.status(404).json({error: "Layout not found."});
    }

    const collaborator = getCollaborator(layout, userId);
    if (!collaborator || collaborator.status !== "pending") {
      return res.status(400).json({error: "No pending invite found for this layout."});
    }

    const respondedAt = new Date().toISOString();
    const collaborators = (layout.collaborators || []).map((entry) =>
      entry.userId === userId ?
        {...entry, status: "declined", respondedAt} :
        entry,
    );

    await sanityClient.patch(layoutId).set({collaborators}).commit();

    const invitee = await getUserSummary(sanityClient, userId);
    await createNotification(sanityClient, {
      recipientUserId: layout.userId,
      type: "invite_declined",
      title: "Invite declined",
      body: `${invitee?.username || "A user"} declined your invite to edit "${layout.name}".`,
      payload: {layoutId, layoutName: layout.name, userId},
    });

    res.status(200).json({message: "Invite declined.", layoutId});
  } catch (err) {
    console.error("Decline Invite Error:", err);
    res.status(500).json({error: "Server error. Please try again later."});
  }
};

const removeCollaborator = async (req, res) => {
  const {layoutId, userId: targetUserId} = req.params;
  const userId = req.user.id;

  try {
    const sanityClient = req.sanityClient;
    const layout = await getLayoutOr404(sanityClient, layoutId);

    if (!layout) {
      return res.status(404).json({error: "Layout not found."});
    }

    if (!canManageCollaborators(layout, userId)) {
      return res.status(403).json({error: "Only the owner can remove collaborators."});
    }

    const collaborators = (layout.collaborators || []).filter(
        (entry) => entry.userId !== targetUserId,
    );

    await sanityClient.patch(layoutId).set({collaborators}).commit();

    await createNotification(sanityClient, {
      recipientUserId: targetUserId,
      type: "editor_removed",
      title: "Removed from layout",
      body: `You were removed as an editor from "${layout.name}".`,
      payload: {layoutId, layoutName: layout.name},
    });

    res.status(200).json({message: "Collaborator removed.", userId: targetUserId});
  } catch (err) {
    console.error("Remove Collaborator Error:", err);
    res.status(500).json({error: "Server error. Please try again later."});
  }
};

const getCollaborators = async (req, res) => {
  const {layoutId} = req.params;
  const userId = req.user.id;

  try {
    const sanityClient = req.sanityClient;
    const layout = await getLayoutOr404(sanityClient, layoutId);

    if (!layout) {
      return res.status(404).json({error: "Layout not found."});
    }

    const isOwner = layout.userId === userId;
    const userRole = getLayoutRole(layout, userId);
    const canViewCollaborators = isOwner || userRole === "editor";

    if (!canViewCollaborators) {
      return res.status(403).json({error: "Access denied."});
    }

    let collaborators = layout.collaborators || [];
    if (!isOwner) {
      collaborators = collaborators.filter((entry) => entry.status === "accepted");
    }

    const userIds = collaborators.map((entry) => entry.userId);
    const users = userIds.length ?
      await sanityClient.fetch(
          `*[_type == "user" && _id in $userIds]{ _id, username, email }`,
          {userIds},
      ) :
      [];

    const userMap = Object.fromEntries(users.map((user) => [user._id, user]));

    res.status(200).json({
      collaborators: collaborators.map((entry) => ({
        ...entry,
        username: userMap[entry.userId]?.username || null,
        email: userMap[entry.userId]?.email || null,
      })),
    });
  } catch (err) {
    console.error("Get Collaborators Error:", err);
    res.status(500).json({error: "Server error. Please try again later."});
  }
};

module.exports = {
  inviteCollaborator,
  acceptInvite,
  declineInvite,
  removeCollaborator,
  getCollaborators,
};
