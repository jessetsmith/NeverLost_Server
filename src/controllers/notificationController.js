const {formatNotification} = require("../services/notificationService");

const getNotifications = async (req, res) => {
  const userId = req.user.id;
  const since = req.query.since;
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));

  try {
    const sanityClient = req.sanityClient;

    let query = `*[_type == "notification" && recipientUserId == $userId`;
    const params = {userId, limit};

    if (since) {
      query += ` && createdAt > $since`;
      params.since = since;
    }

    query += `] | order(createdAt desc) [0...$limit]`;

    const notifications = await sanityClient.fetch(query, params);
    res.status(200).json({
      notifications: notifications.map(formatNotification),
    });
  } catch (err) {
    console.error("Get Notifications Error:", err);
    res.status(500).json({error: "Server error. Please try again later."});
  }
};

const getUnreadCount = async (req, res) => {
  const userId = req.user.id;

  try {
    const sanityClient = req.sanityClient;
    const query = `count(*[_type == "notification" && recipientUserId == $userId && read != true])`;
    const count = await sanityClient.fetch(query, {userId});
    res.status(200).json({count});
  } catch (err) {
    console.error("Get Unread Count Error:", err);
    res.status(500).json({error: "Server error. Please try again later."});
  }
};

const markNotificationRead = async (req, res) => {
  const userId = req.user.id;
  const {id} = req.params;

  try {
    const sanityClient = req.sanityClient;
    const notification = await sanityClient.getDocument(id);

    if (!notification || notification._type !== "notification") {
      return res.status(404).json({error: "Notification not found."});
    }

    if (notification.recipientUserId !== userId) {
      return res.status(403).json({error: "Access denied."});
    }

    await sanityClient.patch(id).set({read: true}).commit();
    res.status(200).json({message: "Notification marked as read.", id});
  } catch (err) {
    console.error("Mark Notification Read Error:", err);
    res.status(500).json({error: "Server error. Please try again later."});
  }
};

const markAllNotificationsRead = async (req, res) => {
  const userId = req.user.id;

  try {
    const sanityClient = req.sanityClient;
    const query = `*[_type == "notification" && recipientUserId == $userId && read != true]._id`;
    const ids = await sanityClient.fetch(query, {userId});

    if (ids.length === 0) {
      return res.status(200).json({message: "No unread notifications.", updated: 0});
    }

    const transaction = sanityClient.transaction();
    ids.forEach((notificationId) => {
      transaction.patch(notificationId, {set: {read: true}});
    });
    await transaction.commit();

    res.status(200).json({message: "All notifications marked as read.", updated: ids.length});
  } catch (err) {
    console.error("Mark All Notifications Read Error:", err);
    res.status(500).json({error: "Server error. Please try again later."});
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
};
