const {v4: uuidv4} = require("uuid");
const {createNotification} = require("../services/notificationService");
const {getUserSummary} = require("../services/userLookup");

function formatMessage(message) {
  return {
    id: message._id,
    fromUserId: message.fromUserId,
    toUserId: message.toUserId,
    body: message.body,
    layoutId: message.layoutId || null,
    readAt: message.readAt || null,
    createdAt: message.createdAt,
  };
}

const getConversations = async (req, res) => {
  const userId = req.user.id;

  try {
    const sanityClient = req.sanityClient;
    const query = [
      "*[_type == \"message\" && (fromUserId == $userId || toUserId == $userId)]",
      "| order(createdAt desc)",
    ].join(" ");
    const messages = await sanityClient.fetch(query, {userId});

    const threadMap = new Map();

    for (const message of messages) {
      const otherUserId = message.fromUserId === userId ?
        message.toUserId :
        message.fromUserId;

      if (!threadMap.has(otherUserId)) {
        const unread = message.toUserId === userId && !message.readAt ? 1 : 0;
        threadMap.set(otherUserId, {
          userId: otherUserId,
          lastMessage: formatMessage(message),
          unreadCount: unread,
        });
      } else if (message.toUserId === userId && !message.readAt) {
        const thread = threadMap.get(otherUserId);
        thread.unreadCount += 1;
      }
    }

    const userIds = [...threadMap.keys()];
    const users = userIds.length ?
      await sanityClient.fetch(
          `*[_type == "user" && _id in $userIds]{ _id, username }`,
          {userIds},
      ) :
      [];

    const userMap = Object.fromEntries(users.map((user) => [user._id, user]));

    const conversations = [...threadMap.values()].map((thread) => ({
      ...thread,
      username: userMap[thread.userId]?.username || "Unknown",
    }));

    res.status(200).json({conversations});
  } catch (err) {
    console.error("Get Conversations Error:", err);
    res.status(500).json({error: "Server error. Please try again later."});
  }
};

const getMessagesWithUser = async (req, res) => {
  const userId = req.user.id;
  const {userId: otherUserId} = req.params;
  const since = req.query.since;

  if (!otherUserId) {
    return res.status(400).json({error: "User ID is required."});
  }

  try {
    const sanityClient = req.sanityClient;

    let query = `*[_type == "message" && (
      (fromUserId == $userId && toUserId == $otherUserId) ||
      (fromUserId == $otherUserId && toUserId == $userId)
    )`;
    const params = {userId, otherUserId};

    if (since) {
      query += ` && createdAt > $since`;
      params.since = since;
    }

    query += `] | order(createdAt asc)`;

    const messages = await sanityClient.fetch(query, params);
    const otherUser = await getUserSummary(sanityClient, otherUserId);

    if (!otherUser) {
      return res.status(404).json({error: "User not found."});
    }

    const unreadIds = messages
        .filter((message) => message.toUserId === userId && !message.readAt)
        .map((message) => message._id);

    if (unreadIds.length > 0) {
      const transaction = sanityClient.transaction();
      const readAt = new Date().toISOString();
      unreadIds.forEach((messageId) => {
        transaction.patch(messageId, {set: {readAt}});
      });
      await transaction.commit();
    }

    res.status(200).json({
      messages: messages.map(formatMessage),
      otherUser: {
        userId: otherUser._id,
        username: otherUser.username,
      },
    });
  } catch (err) {
    console.error("Get Messages With User Error:", err);
    res.status(500).json({error: "Server error. Please try again later."});
  }
};

const sendMessage = async (req, res) => {
  const userId = req.user.id;
  const {toUserId, body, layoutId} = req.body;

  if (!toUserId || !body || !body.trim()) {
    return res.status(400).json({error: "Recipient and message body are required."});
  }

  if (toUserId === userId) {
    return res.status(400).json({error: "You cannot message yourself."});
  }

  try {
    const sanityClient = req.sanityClient;
    const recipient = await getUserSummary(sanityClient, toUserId);

    if (!recipient) {
      return res.status(404).json({error: "Recipient not found."});
    }

    const sender = await getUserSummary(sanityClient, userId);
    const createdAt = new Date().toISOString();

    const message = await sanityClient.create({
      _id: uuidv4(),
      _type: "message",
      fromUserId: userId,
      toUserId,
      body: body.trim(),
      layoutId: layoutId || null,
      readAt: null,
      createdAt,
    });

    await createNotification(sanityClient, {
      recipientUserId: toUserId,
      type: "new_message",
      title: "New message",
      body: `${sender?.username || "Someone"} sent you a message.`,
      payload: {
        fromUserId: userId,
        messageId: message._id,
        layoutId: layoutId || null,
      },
    });

    res.status(201).json(formatMessage(message));
  } catch (err) {
    console.error("Send Message Error:", err);
    res.status(500).json({error: "Server error. Please try again later."});
  }
};

module.exports = {
  getConversations,
  getMessagesWithUser,
  sendMessage,
};
