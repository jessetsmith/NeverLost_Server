const {v4: uuidv4} = require("uuid");

async function createNotification(sanityClient, {
  recipientUserId,
  type,
  title,
  body,
  payload = {},
}) {
  return sanityClient.create({
    _id: uuidv4(),
    _type: "notification",
    recipientUserId,
    type,
    title,
    body,
    payload: JSON.stringify(payload),
    read: false,
    createdAt: new Date().toISOString(),
  });
}

function parseNotificationPayload(notification) {
  if (!notification?.payload) {
    return {};
  }

  if (typeof notification.payload === "object") {
    return notification.payload;
  }

  try {
    return JSON.parse(notification.payload);
  } catch {
    return {};
  }
}

function formatNotification(notification) {
  return {
    id: notification._id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    payload: parseNotificationPayload(notification),
    read: Boolean(notification.read),
    createdAt: notification.createdAt,
  };
}

module.exports = {
  createNotification,
  parseNotificationPayload,
  formatNotification,
};
