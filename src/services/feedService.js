const {getConnectedUserIds} = require("./connectionService");

function buildUserMap(users) {
  return Object.fromEntries(users.map((user) => [user._id, user]));
}

function formatActor(userMap, userId) {
  const user = userMap[userId];
  return {
    userId,
    username: user?.username || "Unknown",
    profileImageUrl: user?.profileImageUrl || "",
  };
}

async function fetchConnectionFeedItems(sanityClient, userId, {limit = 40} = {}) {
  const connectionIds = await getConnectedUserIds(sanityClient, userId);

  if (connectionIds.length === 0) {
    return [];
  }

  const publishedQuery = [
    "*[_type == \"layout\" && visibility == \"published\" && userId in $connectionIds]",
    "| order(publishedAt desc) [0...$limit] {",
    "_id, name, description, objects, userId, publishedAt",
    "}",
  ].join(" ");

  const sharedQuery = [
    "*[_type == \"layout\" && userId in $connectionIds",
    "&& count((collaborators[status == \"accepted\" && userId == $userId])) > 0]",
    "| order(_updatedAt desc) [0...$limit] {",
    "_id, name, description, objects, userId, collaborators, _updatedAt",
    "}",
  ].join(" ");

  const forumQuery = [
    "*[_type == \"forumThread\" && authorUserId in $connectionIds]",
    "| order(createdAt desc) [0...$limit] {",
    "_id, title, body, authorUserId, replyCount, createdAt, lastActivityAt",
    "}",
  ].join(" ");

  const params = {connectionIds, userId, limit};

  const [publishedLayouts, sharedLayouts, forumThreads] = await Promise.all([
    sanityClient.fetch(publishedQuery, params),
    sanityClient.fetch(sharedQuery, params),
    sanityClient.fetch(forumQuery, params),
  ]);

  const actorIds = new Set(connectionIds);
  sharedLayouts.forEach((layout) => actorIds.add(layout.userId));
  publishedLayouts.forEach((layout) => actorIds.add(layout.userId));
  forumThreads.forEach((thread) => actorIds.add(thread.authorUserId));

  const users = actorIds.size ?
    await sanityClient.fetch(
        "*[_type == \"user\" && _id in $actorIds]{ _id, username, profileImageUrl }",
        {actorIds: [...actorIds]},
    ) :
    [];

  const userMap = buildUserMap(users);
  const items = [];

  publishedLayouts.forEach((layout) => {
    items.push({
      id: `published-${layout._id}`,
      type: "layout_published",
      createdAt: layout.publishedAt || layout._updatedAt,
      actor: formatActor(userMap, layout.userId),
      layout: {
        layoutId: layout._id,
        name: layout.name,
        description: layout.description || "",
        objects: layout.objects || [],
      },
    });
  });

  sharedLayouts.forEach((layout) => {
    const collaborator = (layout.collaborators || []).find(
        (entry) => entry.userId === userId && entry.status === "accepted",
    );
    items.push({
      id: `shared-${layout._id}-${collaborator?.respondedAt || layout._updatedAt}`,
      type: "layout_shared",
      createdAt: collaborator?.respondedAt || collaborator?.invitedAt || layout._updatedAt,
      actor: formatActor(userMap, layout.userId),
      layout: {
        layoutId: layout._id,
        name: layout.name,
        description: layout.description || "",
        objects: layout.objects || [],
        role: collaborator?.role || "editor",
      },
    });
  });

  forumThreads.forEach((thread) => {
    items.push({
      id: `forum-${thread._id}`,
      type: "forum_thread",
      createdAt: thread.createdAt,
      actor: formatActor(userMap, thread.authorUserId),
      thread: {
        threadId: thread._id,
        title: thread.title,
        body: thread.body,
        replyCount: thread.replyCount || 0,
        lastActivityAt: thread.lastActivityAt || thread.createdAt,
      },
    });
  });

  return items
      .filter((item) => item.createdAt)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function getConnectionFeed(sanityClient, userId, {page = 1, limit = 20} = {}) {
  const safeLimit = Math.min(50, Math.max(1, limit));
  const safePage = Math.max(1, page);
  const allItems = await fetchConnectionFeedItems(sanityClient, userId, {limit: 120});
  const total = allItems.length;
  const start = (safePage - 1) * safeLimit;
  const end = start + safeLimit;

  return {
    items: allItems.slice(start, end),
    page: safePage,
    limit: safeLimit,
    total,
    totalPages: Math.ceil(total / safeLimit) || 1,
  };
}

module.exports = {
  getConnectionFeed,
};
