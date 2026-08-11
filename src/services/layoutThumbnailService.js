const fs = require("fs");
const path = require("path");
const {v4: uuidv4} = require("uuid");

const THUMBNAILS_ROOT = path.join(__dirname, "../../uploads/thumbnails");
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function buildThumbnailPublicUrl(req, layoutId, filename) {
  const relativePath = `/uploads/thumbnails/${layoutId}/${filename}`;
  if (process.env.ASSET_BASE_URL) {
    return `${process.env.ASSET_BASE_URL.replace(/\/$/, "")}${relativePath}`;
  }
  return `${req.protocol}://${req.get("host")}${relativePath}`;
}

function saveLocalThumbnail(layoutId, buffer, filename) {
  const layoutDir = path.join(THUMBNAILS_ROOT, String(layoutId));
  fs.mkdirSync(layoutDir, {recursive: true});
  const filePath = path.join(layoutDir, filename);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

function deleteLocalThumbnailIfOwned(layoutId, thumbnailUrl) {
  if (!thumbnailUrl || !thumbnailUrl.includes("/uploads/thumbnails/")) {
    return;
  }

  const marker = `/uploads/thumbnails/${layoutId}/`;
  const index = thumbnailUrl.indexOf(marker);
  if (index === -1) {
    return;
  }

  const filename = thumbnailUrl.slice(index + marker.length);
  if (!filename || filename.includes("..") || filename.includes("/")) {
    return;
  }

  const filePath = path.join(THUMBNAILS_ROOT, String(layoutId), filename);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.warn("Could not delete old layout thumbnail:", err.message);
  }
}

function parseLayoutThumbnailDataUrl(imageData) {
  if (typeof imageData !== "string") {
    throw new Error("Thumbnail image data is required.");
  }

  const match = imageData.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  if (!match) {
    throw new Error("Thumbnail must be a PNG, JPEG, or WebP data URL.");
  }

  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length === 0) {
    throw new Error("Thumbnail image is empty.");
  }
  if (buffer.length > 600 * 1024) {
    throw new Error("Thumbnail image is too large.");
  }

  const ext = match[1] === "image/png" ?
    ".png" :
    match[1] === "image/webp" ?
      ".webp" :
      ".jpg";

  return {
    buffer,
    contentType: match[1],
    ext,
  };
}

async function uploadLayoutThumbnailImage(req, layoutId, imageData) {
  const {buffer, contentType, ext} = parseLayoutThumbnailDataUrl(imageData);
  const safeName = `${uuidv4()}${ext}`;

  if (req.sanityClient && process.env.SANITY_TOKEN) {
    try {
      const asset = await req.sanityClient.assets.upload("image", buffer, {
        filename: safeName,
        contentType,
      });
      return {
        url: asset.url,
        storage: "sanity",
      };
    } catch (err) {
      console.warn("Sanity layout thumbnail upload failed, using local storage:", err.message);
    }
  }

  saveLocalThumbnail(layoutId, buffer, safeName);
  return {
    url: buildThumbnailPublicUrl(req, layoutId, safeName),
    storage: "local",
  };
}

async function saveLayoutThumbnail(req, layout, imageData) {
  const layoutId = layout._id;
  const upload = await uploadLayoutThumbnailImage(req, layoutId, imageData);
  const thumbnailUpdatedAt = new Date().toISOString();

  deleteLocalThumbnailIfOwned(layoutId, layout.thumbnailUrl);

  await req.sanityClient.patch(layoutId).set({
    thumbnailUrl: upload.url,
    thumbnailUpdatedAt,
  }).commit();

  return {
    thumbnailUrl: upload.url,
    thumbnailUpdatedAt,
    storage: upload.storage,
  };
}

async function invalidateStaleLayoutThumbnails(sanityClient) {
  const cutoff = new Date(Date.now() - ONE_DAY_MS).toISOString();
  const staleLayouts = await sanityClient.fetch(
      [
        "*[_type == \"layout\" && visibility == \"published\" && defined(thumbnailUrl) && (",
        "!defined(thumbnailUpdatedAt) || thumbnailUpdatedAt < $cutoff ||",
        "_updatedAt > thumbnailUpdatedAt",
        ")]{ _id }",
      ].join(" "),
      {cutoff},
  );

  if (!staleLayouts.length) {
    return {cleared: 0};
  }

  await Promise.all(staleLayouts.map((layout) =>
    sanityClient.patch(layout._id).set({thumbnailUrl: null}).commit(),
  ));

  return {cleared: staleLayouts.length};
}

module.exports = {
  THUMBNAILS_ROOT,
  ONE_DAY_MS,
  parseLayoutThumbnailDataUrl,
  saveLayoutThumbnail,
  invalidateStaleLayoutThumbnails,
};
