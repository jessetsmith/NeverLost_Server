const {v4: uuidv4} = require("uuid");
const {createLayoutSchema, updateLayoutSchema} = require("../utils/layoutValidation");
const {findUserByEmailOrUsername, getUserSummary} = require("../services/userLookup");
const {createNotification} = require("../services/notificationService");
const {getUserSummary} = require("../services/userLookup");
const {getConnectionStatus, getPublishedLayoutCount, getConnectedUserIds} = require("../services/connectionService");
const {
  canReadLayout,
  canEditLayout,
  canPublish,
  getLayoutRole,
  formatLayoutResponse,
  formatLayoutSummary,
} = require("../utils/layoutAccess");

const createLayout = async (req, res) => {
  const {error} = createLayoutSchema.validate(req.body);
  if (error) {
    return res.status(400).json({error: error.details[0].message});
  }

  const {name, description, objects} = req.body;
  const userId = req.user && req.user.id;

  if (!userId) {
    return res.status(401).json({error: "User ID not found in token. Please log in again."});
  }

  try {
    const sanityClient = req.sanityClient;

    const newLayout = {
      _id: uuidv4(),
      _type: "layout",
      name,
      description,
      userId,
      objects,
      visibility: "private",
      collaborators: [],
    };

    const createdLayout = await sanityClient.create(newLayout);

    res.status(201).json({layoutId: createdLayout._id || newLayout._id});
  } catch (err) {
    console.error("Create Layout Error:", err);

    if (err.statusCode === 403 || (err.details && err.details.type === "mutationError")) {
      return res.status(403).json({
        error: "Insufficient permissions to save layout.",
      });
    }

    if (err.statusCode === 400) {
      return res.status(400).json({
        error: "Invalid layout data.",
      });
    }

    res.status(500).json({error: "Server error. Please try again later."});
  }
};

const getLayoutById = async (req, res) => {
  const {layoutId} = req.params;
  const userId = req.user.id;

  try {
    const sanityClient = req.sanityClient;
    const layout = await sanityClient.getDocument(layoutId);

    if (!layout || layout._type !== "layout") {
      return res.status(404).json({error: "Layout not found."});
    }

    const role = getLayoutRole(layout, userId);
    if (!canReadLayout(layout, userId)) {
      return res.status(404).json({error: "Layout not found or access denied."});
    }

    const owner = await getUserSummary(sanityClient, layout.userId);
    const response = formatLayoutResponse(layout, role);
    response.owner = owner ? {
      userId: owner._id,
      username: owner.username,
      title: owner.title || "",
      profileImageUrl: owner.profileImageUrl || "",
    } : null;

    res.status(200).json(response);
  } catch (err) {
    console.error("Get Layout By ID Error:", err);
    res.status(500).json({error: "Server error. Please try again later."});
  }
};

const updateLayout = async (req, res) => {
  const {layoutId} = req.params;
  const userId = req.user.id;

  const {error} = updateLayoutSchema.validate(req.body);
  if (error) {
    return res.status(400).json({error: error.details[0].message});
  }

  const {objects, name, description} = req.body;

  try {
    const sanityClient = req.sanityClient;

    const existingLayout = await sanityClient.getDocument(layoutId);
    if (!existingLayout || existingLayout._type !== "layout") {
      return res.status(404).json({error: "Layout not found."});
    }

    if (!canEditLayout(existingLayout, userId)) {
      return res.status(403).json({error: "You do not have permission to edit this layout."});
    }

    const patch = {};

    if (objects !== undefined) {
      patch.objects = objects;
    }

    if (typeof name === "string" && name.trim()) {
      patch.name = name.trim();
    }

    if (typeof description === "string") {
      patch.description = description.trim();
    }

    await sanityClient.patch(layoutId).set(patch).commit();

    const role = getLayoutRole(existingLayout, userId);
    res.status(200).json(formatLayoutResponse({...existingLayout, ...patch}, role));
  } catch (err) {
    console.error("Update Layout Error:", err);
    res.status(500).json({error: "Server error. Please try again later."});
  }
};

const deleteLayout = async (req, res) => {
  const {layoutId} = req.params;
  const userId = req.user.id;

  try {
    const sanityClient = req.sanityClient;
    const existingLayout = await sanityClient.getDocument(layoutId);

    if (!existingLayout || existingLayout._type !== "layout") {
      return res.status(404).json({error: "Layout not found."});
    }

    if (existingLayout.userId !== userId) {
      return res.status(403).json({error: "Only the owner can delete this layout."});
    }

    await sanityClient.delete(layoutId);
    res.status(200).json({message: "Layout deleted.", layoutId});
  } catch (err) {
    console.error("Delete Layout Error:", err);
    res.status(500).json({error: "Server error. Please try again later."});
  }
};

const getAllLayouts = async (req, res) => {
  const userId = req.user.id;

  try {
    const sanityClient = req.sanityClient;

    const ownedQuery = "*[_type == \"layout\" && userId == $userId] | order(_createdAt desc)";
    const sharedQuery = [
      "*[_type == \"layout\" && userId != $userId",
      "&& count(collaborators[userId == $userId && status == \"accepted\"]) > 0]",
      "| order(_createdAt desc)",
    ].join(" ");

    const [ownedLayouts, sharedLayouts] = await Promise.all([
      sanityClient.fetch(ownedQuery, {userId}),
      sanityClient.fetch(sharedQuery, {userId}),
    ]);

    res.status(200).json({
      owned: ownedLayouts.map((layout) => formatLayoutSummary(layout, "owner")),
      shared: sharedLayouts.map((layout) => (
        formatLayoutSummary(layout, getLayoutRole(layout, userId))
      )),
    });
  } catch (err) {
    console.error("Get All Layouts Error:", err);
    res.status(500).json({error: "Server error. Please try again later."});
  }
};

const exploreLayouts = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const start = (page - 1) * limit;
  const end = start + limit;
  const email = typeof req.query.email === "string" ? req.query.email.trim().toLowerCase() : "";
  const username = typeof req.query.username === "string" ? req.query.username.trim() : "";
  const currentUserId = req.user.id;

  if (email && username) {
    return res.status(400).json({error: "Provide email or username, not both."});
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({error: "Please enter a valid email address."});
  }

  if (username && username.length < 3) {
    return res.status(400).json({error: "Username must be at least 3 characters."});
  }

  try {
    const sanityClient = req.sanityClient;

    let ownerUserId = null;
    let ownerUsername = null;
    let ownerRecord = null;

    if (email || username) {
      ownerRecord = await findUserByEmailOrUsername(sanityClient, {email, username});
      if (!ownerRecord) {
        return res.status(200).json({
          layouts: [],
          page,
          limit,
          total: 0,
          totalPages: 1,
          email: email || null,
          username: username || null,
          owner: null,
          isConnected: false,
          connectionStatus: "none",
        });
      }
      ownerUserId = ownerRecord._id;
      ownerUsername = ownerRecord.username;
    }

    const filter = ownerUserId ?
      `_type == "layout" && visibility == "published" && userId == $ownerUserId` :
      `_type == "layout" && visibility == "published"`;

    const countQuery = `count(*[${filter}])`;
    const layoutsQuery = `*[${filter}] | order(publishedAt desc) [$start...$end] {
      _id,
      name,
      description,
      objects,
      userId,
      visibility,
      publishedAt,
      "ownerUsername": *[_type == "user" && _id == ^.userId][0].username
    }`;

    const params = ownerUserId ? {start, end, ownerUserId} : {start, end};

    const [total, layouts] = await Promise.all([
      sanityClient.fetch(countQuery, params),
      sanityClient.fetch(layoutsQuery, params),
    ]);

    let owner = null;
    let connectionStatus = "none";
    let pendingRequestId = null;

    if (ownerRecord) {
      const publishedLayoutCount = await getPublishedLayoutCount(sanityClient, ownerUserId);
      connectionStatus = await getConnectionStatus(sanityClient, currentUserId, ownerUserId);
      if (connectionStatus === "pending_incoming") {
        const pendingQuery = [
          "*[_type == \"connection\" && status == \"pending\"",
          "&& userId == $ownerUserId && connectedUserId == $currentUserId][0]._id",
        ].join(" ");
        pendingRequestId = await sanityClient.fetch(
            pendingQuery,
            {ownerUserId, currentUserId},
        );
      }
      const ownerSummary = await getUserSummary(sanityClient, ownerUserId);
      owner = {
        userId: ownerUserId,
        username: ownerRecord.username,
        profileImageUrl: ownerSummary?.profileImageUrl || "",
        publishedLayoutCount,
        pendingRequestId,
        ...(connectionStatus === "connected" && ownerSummary?.email ?
          {email: ownerSummary.email} :
          {}),
      };
    }

    res.status(200).json({
      layouts: layouts.map((layout) => ({
        _id: layout._id,
        layoutId: layout._id,
        name: layout.name,
        description: layout.description,
        objects: layout.objects || [],
        userId: layout.userId,
        ownerUsername: layout.ownerUsername || "Unknown",
        visibility: layout.visibility,
        publishedAt: layout.publishedAt,
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      email: email || null,
      username: username || null,
      ownerUsername: ownerUsername || null,
      owner,
      isConnected: connectionStatus === "connected",
      connectionStatus,
    });
  } catch (err) {
    console.error("Explore Layouts Error:", err);
    res.status(500).json({error: "Server error. Please try again later."});
  }
};

const publishLayout = async (req, res) => {
  const {layoutId} = req.params;
  const userId = req.user.id;

  try {
    const sanityClient = req.sanityClient;
    const layout = await sanityClient.getDocument(layoutId);

    if (!layout || layout._type !== "layout") {
      return res.status(404).json({error: "Layout not found."});
    }

    if (!canPublish(layout, userId)) {
      return res.status(403).json({error: "Only the owner can publish this layout."});
    }

    const publishedAt = new Date().toISOString();
    await sanityClient.patch(layoutId).set({
      visibility: "published",
      publishedAt,
    }).commit();

    const publisher = await getUserSummary(sanityClient, userId);
    const connectionIds = await getConnectedUserIds(sanityClient, userId);

    await Promise.all(connectionIds.map((recipientUserId) =>
      createNotification(sanityClient, {
        recipientUserId,
        type: "layout_published",
        title: "New published layout",
        body: `${publisher?.username || "A connection"} published "${layout.name || "a layout"}"`,
        payload: {layoutId, fromUserId: userId},
      }),
    ));

    res.status(200).json({
      layoutId,
      visibility: "published",
      publishedAt,
    });
  } catch (err) {
    console.error("Publish Layout Error:", err);
    res.status(500).json({error: "Server error. Please try again later."});
  }
};

const unpublishLayout = async (req, res) => {
  const {layoutId} = req.params;
  const userId = req.user.id;

  try {
    const sanityClient = req.sanityClient;
    const layout = await sanityClient.getDocument(layoutId);

    if (!layout || layout._type !== "layout") {
      return res.status(404).json({error: "Layout not found."});
    }

    if (!canPublish(layout, userId)) {
      return res.status(403).json({error: "Only the owner can unpublish this layout."});
    }

    await sanityClient.patch(layoutId).set({
      visibility: "private",
    }).commit();

    res.status(200).json({
      layoutId,
      visibility: "private",
    });
  } catch (err) {
    console.error("Unpublish Layout Error:", err);
    res.status(500).json({error: "Server error. Please try again later."});
  }
};

module.exports = {
  createLayout,
  getLayoutById,
  updateLayout,
  deleteLayout,
  getAllLayouts,
  exploreLayouts,
  publishLayout,
  unpublishLayout,
};
