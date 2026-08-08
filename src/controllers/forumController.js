const {v4: uuidv4} = require("uuid");
const Joi = require("joi");
const {createNotification} = require("../services/notificationService");
const {getUserSummary} = require("../services/userLookup");
const {getConnectedUserIds, isConnected, getConnectionStatusesForUsers} = require("../services/connectionService");

const createThreadSchema = Joi.object({
  title: Joi.string().trim().min(3).max(120).required(),
  body: Joi.string().trim().min(1).max(5000).required(),
});

const createPostSchema = Joi.object({
  body: Joi.string().trim().min(1).max(5000).required(),
});

function formatThreadSummary(thread, userMap, connectionMap = {}) {
  const author = userMap[thread.authorUserId];
  const connection = connectionMap[thread.authorUserId] || {};
  return {
    id: thread._id,
    title: thread.title,
    body: thread.body,
    authorUserId: thread.authorUserId,
    authorUsername: author?.username || "Unknown",
    authorProfileImageUrl: author?.profileImageUrl || "",
    connectionStatus: connection.connectionStatus || "none",
    pendingRequestId: connection.pendingRequestId || null,
    replyCount: thread.replyCount || 0,
    createdAt: thread.createdAt,
    lastActivityAt: thread.lastActivityAt || thread.createdAt,
  };
}

function formatPost(post, userMap, connectionMap = {}) {
  const author = userMap[post.authorUserId];
  const connection = connectionMap[post.authorUserId] || {};
  return {
    id: post._id,
    threadId: post.threadId,
    body: post.body,
    authorUserId: post.authorUserId,
    authorUsername: author?.username || "Unknown",
    authorProfileImageUrl: author?.profileImageUrl || "",
    connectionStatus: connection.connectionStatus || "none",
    pendingRequestId: connection.pendingRequestId || null,
    createdAt: post.createdAt,
    editedAt: post.editedAt || null,
  };
}

const listThreads = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const start = (page - 1) * limit;
  const end = start + limit;

  try {
    const sanityClient = req.sanityClient;
    const countQuery = "count(*[_type == \"forumThread\"])";
    const threadsQuery = [
      "*[_type == \"forumThread\"] | order(lastActivityAt desc) [$start...$end] {",
      "_id, title, body, authorUserId, replyCount, createdAt, lastActivityAt",
      "}",
    ].join(" ");

    const [total, threads] = await Promise.all([
      sanityClient.fetch(countQuery),
      sanityClient.fetch(threadsQuery, {start, end}),
    ]);

    const authorIds = [...new Set(threads.map((thread) => thread.authorUserId))];
    const users = authorIds.length ?
      await sanityClient.fetch(
          "*[_type == \"user\" && _id in $authorIds]{ _id, username, profileImageUrl }",
          {authorIds},
      ) :
      [];
    const userMap = Object.fromEntries(users.map((user) => [user._id, user]));
    const connectionMap = await getConnectionStatusesForUsers(
        sanityClient,
        req.user.id,
        authorIds,
    );

    res.status(200).json({
      threads: threads.map((thread) => formatThreadSummary(thread, userMap, connectionMap)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    console.error("List Forum Threads Error:", err);
    res.status(500).json({error: "Server error. Please try again later."});
  }
};

const getThread = async (req, res) => {
  const {threadId} = req.params;

  try {
    const sanityClient = req.sanityClient;
    const thread = await sanityClient.fetch(
        "*[_type == \"forumThread\" && _id == $threadId][0]",
        {threadId},
    );

    if (!thread) {
      return res.status(404).json({error: "Thread not found."});
    }

    const posts = await sanityClient.fetch(
        "*[_type == \"forumPost\" && threadId == $threadId] | order(createdAt asc)",
        {threadId},
    );

    const authorIds = new Set([thread.authorUserId, ...posts.map((post) => post.authorUserId)]);
    const users = authorIds.size ?
      await sanityClient.fetch(
          "*[_type == \"user\" && _id in $authorIds]{ _id, username, profileImageUrl }",
          {authorIds: [...authorIds]},
      ) :
      [];
    const userMap = Object.fromEntries(users.map((user) => [user._id, user]));
    const connectionMap = await getConnectionStatusesForUsers(
        sanityClient,
        req.user.id,
        [...authorIds],
    );

    res.status(200).json({
      thread: formatThreadSummary(thread, userMap, connectionMap),
      posts: posts.map((post) => formatPost(post, userMap, connectionMap)),
    });
  } catch (err) {
    console.error("Get Forum Thread Error:", err);
    res.status(500).json({error: "Server error. Please try again later."});
  }
};

const createThread = async (req, res) => {
  const {error, value} = createThreadSchema.validate(req.body);
  if (error) {
    return res.status(400).json({error: error.details[0].message});
  }

  const userId = req.user.id;
  const now = new Date().toISOString();

  try {
    const sanityClient = req.sanityClient;
    const threadId = uuidv4();

    const thread = await sanityClient.create({
      _id: threadId,
      _type: "forumThread",
      authorUserId: userId,
      title: value.title,
      body: value.body,
      replyCount: 0,
      createdAt: now,
      lastActivityAt: now,
    });

    const author = await getUserSummary(sanityClient, userId);
    const connectionIds = await getConnectedUserIds(sanityClient, userId);

    await Promise.all(connectionIds.map((recipientUserId) =>
      createNotification(sanityClient, {
        recipientUserId,
        type: "forum_thread",
        title: "New forum discussion",
        body: `${author?.username || "A connection"} started "${value.title}"`,
        payload: {threadId, fromUserId: userId},
      }),
    ));

    res.status(201).json({
      thread: {
        id: thread._id,
        title: thread.title,
        body: thread.body,
        authorUserId: userId,
        authorUsername: author?.username || "Unknown",
        authorProfileImageUrl: author?.profileImageUrl || "",
        replyCount: 0,
        createdAt: thread.createdAt,
        lastActivityAt: thread.lastActivityAt,
      },
    });
  } catch (err) {
    console.error("Create Forum Thread Error:", err);
    res.status(500).json({error: "Server error. Please try again later."});
  }
};

const createPost = async (req, res) => {
  const {threadId} = req.params;
  const {error, value} = createPostSchema.validate(req.body);
  if (error) {
    return res.status(400).json({error: error.details[0].message});
  }

  const userId = req.user.id;
  const now = new Date().toISOString();

  try {
    const sanityClient = req.sanityClient;
    const thread = await sanityClient.getDocument(threadId);

    if (!thread || thread._type !== "forumThread") {
      return res.status(404).json({error: "Thread not found."});
    }

    const postId = uuidv4();
    const post = await sanityClient.create({
      _id: postId,
      _type: "forumPost",
      threadId,
      authorUserId: userId,
      body: value.body,
      createdAt: now,
    });

    await sanityClient.patch(threadId).set({
      replyCount: (thread.replyCount || 0) + 1,
      lastActivityAt: now,
    }).commit();

    const author = await getUserSummary(sanityClient, userId);

    if (thread.authorUserId !== userId) {
      await createNotification(sanityClient, {
        recipientUserId: thread.authorUserId,
        type: "forum_reply",
        title: "New forum reply",
        body: `${author?.username || "Someone"} replied in "${thread.title}"`,
        payload: {threadId, postId, fromUserId: userId},
      });
    }

    const participants = await sanityClient.fetch(
        "array::unique(*[_type == \"forumPost\" && threadId == $threadId].authorUserId)",
        {threadId},
    );

    await Promise.all(participants
        .filter((participantId) => (
          participantId !== userId && participantId !== thread.authorUserId
        ))
        .map(async (participantId) => {
          const connected = await isConnected(sanityClient, participantId, userId);
          if (!connected) {
            return null;
          }
          return createNotification(sanityClient, {
            recipientUserId: participantId,
            type: "forum_reply",
            title: "New forum reply",
            body: `${author?.username || "Someone"} replied in "${thread.title}"`,
            payload: {threadId, postId, fromUserId: userId},
          });
        }));

    res.status(201).json({
      post: {
        id: post._id,
        threadId,
        body: post.body,
        authorUserId: userId,
        authorUsername: author?.username || "Unknown",
        authorProfileImageUrl: author?.profileImageUrl || "",
        createdAt: post.createdAt,
        editedAt: null,
      },
    });
  } catch (err) {
    console.error("Create Forum Post Error:", err);
    res.status(500).json({error: "Server error. Please try again later."});
  }
};

module.exports = {
  listThreads,
  getThread,
  createThread,
  createPost,
};
