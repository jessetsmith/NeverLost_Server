const ACCEPTED_STATUS_FILTER = `(status == "accepted" || !defined(status))`;
const PENDING_STATUS_FILTER = `status == "pending"`;

async function isConnected(sanityClient, userId, connectedUserId) {
  const query = `count(*[_type == "connection" && ${ACCEPTED_STATUS_FILTER} && userId == $userId && connectedUserId == $connectedUserId])`;
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

  const pendingOutgoing = await sanityClient.fetch(
      `*[_type == "connection" && ${PENDING_STATUS_FILTER} && userId == $viewerId && connectedUserId == $otherUserId][0]._id`,
      {viewerId, otherUserId},
  );
  if (pendingOutgoing) {
    return "pending_outgoing";
  }

  const pendingIncoming = await sanityClient.fetch(
      `*[_type == "connection" && ${PENDING_STATUS_FILTER} && userId == $otherUserId && connectedUserId == $viewerId][0]._id`,
      {viewerId, otherUserId},
  );
  if (pendingIncoming) {
    return "pending_incoming";
  }

  return "none";
}

async function findConnectionBetween(sanityClient, userId, connectedUserId) {
  return sanityClient.fetch(
      `*[_type == "connection" && userId == $userId && connectedUserId == $connectedUserId][0]`,
      {userId, connectedUserId},
  );
}

async function getPublishedLayoutCount(sanityClient, ownerUserId) {
  const query = `count(*[_type == "layout" && visibility == "published" && userId == $ownerUserId])`;
  return sanityClient.fetch(query, {ownerUserId});
}

module.exports = {
  ACCEPTED_STATUS_FILTER,
  PENDING_STATUS_FILTER,
  isConnected,
  getConnectionStatus,
  findConnectionBetween,
  getPublishedLayoutCount,
};
