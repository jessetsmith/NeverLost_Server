const {v4: uuidv4} = require("uuid");
const {findUserByEmailOrUsername, getUserSummary} = require("../services/userLookup");
const {createNotification} = require("../services/notificationService");
const {
  ACCEPTED_STATUS_FILTER,
  PENDING_STATUS_FILTER,
  getConnectionStatus,
  findConnectionBetween,
} = require("../services/connectionService");

const formatConnectionEntry = (entry, userMap) => ({
  id: entry._id,
  userId: entry.connectedUserId,
  username: userMap[entry.connectedUserId]?.username || "Unknown",
  email: userMap[entry.connectedUserId]?.email || null,
  profileImageUrl: userMap[entry.connectedUserId]?.profileImageUrl || null,
  status: entry.status || "accepted",
  createdAt: entry.createdAt,
});

const formatRequestEntry = (entry, userMap) => ({
  id: entry._id,
  userId: entry.userId,
  username: userMap[entry.userId]?.username || "Unknown",
  email: userMap[entry.userId]?.email || null,
  status: entry.status,
  createdAt: entry.createdAt,
});

const listConnections = async (req, res) => {
  const userId = req.user.id;

  try {
    const sanityClient = req.sanityClient;
    const query = [
      `*[_type == "connection" && userId == $userId && ${ACCEPTED_STATUS_FILTER}]`,
      "| order(createdAt desc)",
    ].join(" ");
    const connections = await sanityClient.fetch(query, {userId});

    const connectedUserIds = connections.map((entry) => entry.connectedUserId);
    const users = connectedUserIds.length ?
      await sanityClient.fetch(
          `*[_type == "user" && _id in $connectedUserIds]{ _id, username, email, profileImageUrl }`,
          {connectedUserIds},
      ) :
      [];

    const userMap = Object.fromEntries(users.map((user) => [user._id, user]));

    res.status(200).json({
      connections: connections.map((entry) => formatConnectionEntry(entry, userMap)),
    });
  } catch (err) {
    console.error("List Connections Error:", err);
    res.status(500).json({error: "Server error. Please try again later."});
  }
};

const listIncomingRequests = async (req, res) => {
  const userId = req.user.id;

  try {
    const sanityClient = req.sanityClient;
    const query = [
      `*[_type == "connection" && connectedUserId == $userId && ${PENDING_STATUS_FILTER}]`,
      "| order(createdAt desc)",
    ].join(" ");
    const requests = await sanityClient.fetch(query, {userId});

    const requesterIds = requests.map((entry) => entry.userId);
    const users = requesterIds.length ?
      await sanityClient.fetch(
          `*[_type == "user" && _id in $requesterIds]{ _id, username, email }`,
          {requesterIds},
      ) :
      [];

    const userMap = Object.fromEntries(users.map((user) => [user._id, user]));

    res.status(200).json({
      requests: requests.map((entry) => formatRequestEntry(entry, userMap)),
    });
  } catch (err) {
    console.error("List Connection Requests Error:", err);
    res.status(500).json({error: "Server error. Please try again later."});
  }
};

const addConnection = async (req, res) => {
  const userId = req.user.id;
  const {userId: targetUserId, email, username} = req.body;

  try {
    const sanityClient = req.sanityClient;
    let target = null;

    if (targetUserId) {
      target = await getUserSummary(sanityClient, targetUserId);
    } else if (email || username) {
      target = await findUserByEmailOrUsername(sanityClient, {email, username});
    } else {
      return res.status(400).json({error: "User ID, email, or username is required."});
    }

    if (!target) {
      return res.status(404).json({error: "User not found."});
    }

    if (target._id === userId) {
      return res.status(400).json({error: "You cannot add yourself as a connection."});
    }

    const status = await getConnectionStatus(sanityClient, userId, target._id);

    if (status === "connected") {
      return res.status(400).json({error: "This user is already in your connections."});
    }

    if (status === "pending_outgoing") {
      return res.status(400).json({error: "Connection request already sent."});
    }

    if (status === "pending_incoming") {
      return res.status(400).json({
        error: "This user already sent you a connection request.",
        connectionStatus: status,
      });
    }

    const existing = await findConnectionBetween(sanityClient, userId, target._id);
    if (existing?.status === "declined") {
      await sanityClient.delete(existing._id);
    }

    const requester = await getUserSummary(sanityClient, userId);
    const createdAt = new Date().toISOString();
    const connectionId = uuidv4();

    await sanityClient.create({
      _id: connectionId,
      _type: "connection",
      userId,
      connectedUserId: target._id,
      status: "pending",
      createdAt,
    });

    await createNotification(sanityClient, {
      recipientUserId: target._id,
      type: "connection_request",
      title: "Connection request",
      body: `${requester?.username || "Someone"} wants to connect with you.`,
      payload: {
        fromUserId: userId,
        fromUsername: requester?.username || null,
        connectionId,
      },
    });

    res.status(201).json({
      message: "Connection request sent.",
      connectionStatus: "pending_outgoing",
      connection: {
        id: connectionId,
        userId: target._id,
        username: target.username,
        email: target.email,
        status: "pending",
        createdAt,
      },
    });
  } catch (err) {
    console.error("Add Connection Error:", err);
    res.status(500).json({error: "Server error. Please try again later."});
  }
};

const acceptConnectionRequest = async (req, res) => {
  const userId = req.user.id;
  const {requestId} = req.params;

  try {
    const sanityClient = req.sanityClient;
    const request = await sanityClient.getDocument(requestId);

    if (!request || request._type !== "connection") {
      return res.status(404).json({error: "Connection request not found."});
    }

    if (request.connectedUserId !== userId) {
      return res.status(403).json({error: "You cannot accept this connection request."});
    }

    if (request.status !== "pending") {
      return res.status(400).json({error: "This connection request is no longer pending."});
    }

    const respondedAt = new Date().toISOString();
    await sanityClient
        .patch(requestId)
        .set({status: "accepted", respondedAt})
        .commit();

    const reverseExists = await findConnectionBetween(sanityClient, userId, request.userId);
    if (!reverseExists) {
      await sanityClient.create({
        _id: uuidv4(),
        _type: "connection",
        userId,
        connectedUserId: request.userId,
        status: "accepted",
        createdAt: respondedAt,
        respondedAt,
      });
    } else if (reverseExists.status !== "accepted") {
      await sanityClient
          .patch(reverseExists._id)
          .set({status: "accepted", respondedAt})
          .commit();
    }

    const accepter = await getUserSummary(sanityClient, userId);
    const requester = await getUserSummary(sanityClient, request.userId);

    await createNotification(sanityClient, {
      recipientUserId: request.userId,
      type: "connection_accepted",
      title: "Connection accepted",
      body: `${accepter?.username || "Someone"} accepted your connection request.`,
      payload: {
        fromUserId: userId,
        fromUsername: accepter?.username || null,
      },
    });

    res.status(200).json({
      message: "Connection request accepted.",
      connectionStatus: "connected",
      connection: {
        userId: request.userId,
        username: requester?.username || "Unknown",
        email: requester?.email || null,
      },
    });
  } catch (err) {
    console.error("Accept Connection Request Error:", err);
    res.status(500).json({error: "Server error. Please try again later."});
  }
};

const declineConnectionRequest = async (req, res) => {
  const userId = req.user.id;
  const {requestId} = req.params;

  try {
    const sanityClient = req.sanityClient;
    const request = await sanityClient.getDocument(requestId);

    if (!request || request._type !== "connection") {
      return res.status(404).json({error: "Connection request not found."});
    }

    if (request.connectedUserId !== userId) {
      return res.status(403).json({error: "You cannot decline this connection request."});
    }

    if (request.status !== "pending") {
      return res.status(400).json({error: "This connection request is no longer pending."});
    }

    const respondedAt = new Date().toISOString();
    await sanityClient
        .patch(requestId)
        .set({status: "declined", respondedAt})
        .commit();

    res.status(200).json({
      message: "Connection request declined.",
      connectionStatus: "none",
      requestId,
    });
  } catch (err) {
    console.error("Decline Connection Request Error:", err);
    res.status(500).json({error: "Server error. Please try again later."});
  }
};

const removeConnection = async (req, res) => {
  const userId = req.user.id;
  const {userId: targetUserId} = req.params;

  try {
    const sanityClient = req.sanityClient;
    const forwardQuery = [
      "*[_type == \"connection\" && userId == $userId && connectedUserId == $targetUserId][0]._id",
    ].join("");
    const forwardId = await sanityClient.fetch(forwardQuery, {userId, targetUserId});

    const reverseQuery = [
      "*[_type == \"connection\" && userId == $targetUserId && connectedUserId == $userId][0]._id",
    ].join("");
    const reverseId = await sanityClient.fetch(reverseQuery, {userId, targetUserId});

    if (!forwardId && !reverseId) {
      return res.status(404).json({error: "Connection not found."});
    }

    const transaction = sanityClient.transaction();
    if (forwardId) {
      transaction.delete(forwardId);
    }
    if (reverseId) {
      transaction.delete(reverseId);
    }
    await transaction.commit();

    res.status(200).json({
      message: "Connection removed.",
      userId: targetUserId,
      connectionStatus: "none",
    });
  } catch (err) {
    console.error("Remove Connection Error:", err);
    res.status(500).json({error: "Server error. Please try again later."});
  }
};

module.exports = {
  listConnections,
  listIncomingRequests,
  addConnection,
  acceptConnectionRequest,
  declineConnectionRequest,
  removeConnection,
};
