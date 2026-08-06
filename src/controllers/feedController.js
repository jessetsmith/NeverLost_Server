const {getConnectionFeed} = require("../services/feedService");

const listFeed = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const userId = req.user.id;

  try {
    const feed = await getConnectionFeed(req.sanityClient, userId, {page, limit});
    res.status(200).json(feed);
  } catch (err) {
    console.error("List Feed Error:", err);
    res.status(500).json({error: "Server error. Please try again later."});
  }
};

module.exports = {
  listFeed,
};
