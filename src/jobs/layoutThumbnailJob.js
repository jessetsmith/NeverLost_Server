const {invalidateStaleLayoutThumbnails, ONE_DAY_MS} = require("../services/layoutThumbnailService");

function startLayoutThumbnailRefreshJob(sanityClient) {
  if (!sanityClient) {
    return;
  }

  const run = async () => {
    try {
      const result = await invalidateStaleLayoutThumbnails(sanityClient);
      if (result.cleared > 0) {
        console.log(`Cleared ${result.cleared} stale layout thumbnail(s).`);
      }
    } catch (err) {
      console.error("Layout thumbnail refresh job failed:", err.message);
    }
  };

  setTimeout(run, 30 * 1000);
  setInterval(run, ONE_DAY_MS);
}

module.exports = {
  startLayoutThumbnailRefreshJob,
};
