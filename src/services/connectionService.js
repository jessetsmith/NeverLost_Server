const ACCEPTED_STATUS_FILTER = `(status == "accepted" || !defined(status))`;
const PENDING_STATUS_FILTER = `status == "pending"`;

async function isConnected(sanityClient, userId, connectedUserId) {
  const query = [
    "count(*[_type == \"connection\"",
    `&& ${ACCEPTED_STATUS_FILTER}`,
    "&& userId == $userId && connectedUserId == $connectedUserId])",
  ].join(" ");
  const count = await sanityClient.fetch(query, {userId, connectedUserId});
  return count > 0;
}

async function getConnectionStatus(sanityClient, viewerId, otherUserId) {
  if (viewerId === otherUserId) {
    return "none";
  }

  if (await isConnected(sanityClient, viewerId, otherUserId)) {
    return "connected";
  }

  const pendingOutgoingQuery = [
    "*[_type == \"connection\"",
    `&& ${PENDING_STATUS_FILTER}`,
    "&& userId == $viewerId && connectedUserId == $otherUserId][0]._id",
  ].join(" ");
  const pendingOutgoing = await sanityClient.fetch(
      pendingOutgoingQuery,
      {viewerId, otherUserId},
  );
  if (pendingOutgoing) {
    return "pending_outgoing";
  }

  const pendingIncomingQuery = [
    "*[_type == \"connection\"",
    `&& ${PENDING_STATUS_FILTER}`,
    "&& userId == $otherUserId && connectedUserId == $viewerId][0]._id",
  ].join(" ");
  const pendingIncoming = await sanityClient.fetch(
      pendingIncomingQuery,
      {viewerId, otherUserId},
  );
  if (pendingIncoming) {
    return "pending_incoming";
  }

  return "none";
}

async function findConnectionBetween(sanityClient, userId, connectedUserId) {
  const query = [
    "*[_type == \"connection\"",
    "&& userId == $userId && connectedUserId == $connectedUserId][0]",
  ].join(" ");
  return sanityClient.fetch(query, {userId, connectedUserId});
}

async function getPublishedLayoutCount(sanityClient, ownerUserId) {
  const query = [
    "count(*[_type == \"layout\"",
    "&& visibility == \"published\" && userId == $ownerUserId])",
  ].join(" ");
  return sanityClient.fetch(query, {ownerUserId});
}

async function getConnectedUserIds(sanityClient, userId) {
  const query = [
    `*[_type == "connection" && userId == $userId && ${ACCEPTED_STATUS_FILTER}]`,
    "{ connectedUserId }",
  ].join(" ");
  const connections = await sanityClient.fetch(query, {userId});
  return connections.map((entry) => entry.connectedUserId);
}

module.exports = {
  ACCEPTED_STATUS_FILTER,
  PENDING_STATUS_FILTER,
  isConnected,
  getConnectionStatus,
  findConnectionBetween,
  getPublishedLayoutCount,
  getConnectedUserIds,
};
