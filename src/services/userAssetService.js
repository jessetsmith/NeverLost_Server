const {v4: uuidv4} = require("uuid");

function normalizeAsset(doc) {
  return {
    _id: doc._id,
    name: doc.name,
    assetUrl: doc.assetUrl,
    source: doc.source || "upload",
    thumbnailUrl: doc.thumbnailUrl || null,
    sketchfabUid: doc.sketchfabUid || null,
    originalName: doc.originalName || null,
    createdAt: doc.createdAt || null,
  };
}

async function listUserAssets(sanityClient, userId) {
  const query = `*[_type == "userAsset" && userId == $userId] | order(createdAt desc) {
    _id, name, assetUrl, source, thumbnailUrl, sketchfabUid, originalName, createdAt
  }`;
  const docs = await sanityClient.fetch(query, {userId});
  return docs.map(normalizeAsset);
}

async function findBySketchfabUid(sanityClient, userId, sketchfabUid) {
  const query = `*[_type == "userAsset" && userId == $userId && sketchfabUid == $sketchfabUid][0] {
    _id, name, assetUrl, source, thumbnailUrl, sketchfabUid, originalName, createdAt
  }`;
  const doc = await sanityClient.fetch(query, {userId, sketchfabUid});
  return doc ? normalizeAsset(doc) : null;
}

async function createUserAsset(sanityClient, {
  userId,
  name,
  assetUrl,
  source = "upload",
  thumbnailUrl = null,
  sketchfabUid = null,
  originalName = null,
}) {
  if (!assetUrl?.trim()) {
    throw new Error("assetUrl is required.");
  }

  if (sketchfabUid) {
    const existing = await findBySketchfabUid(sanityClient, userId, sketchfabUid);
    if (existing) return existing;
  }

  const trimmedUrl = assetUrl.trim();
  const existingByUrl = await sanityClient.fetch(
      `*[_type == "userAsset" && userId == $userId && assetUrl == $assetUrl][0] {
        _id, name, assetUrl, source, thumbnailUrl, sketchfabUid, originalName, createdAt
      }`,
      {userId, assetUrl: trimmedUrl},
  );
  if (existingByUrl) return normalizeAsset(existingByUrl);

  const doc = {
    _id: uuidv4(),
    _type: "userAsset",
    userId,
    name: name?.trim() || originalName?.trim() || "Untitled Asset",
    assetUrl: trimmedUrl,
    source,
    thumbnailUrl,
    sketchfabUid,
    originalName,
    createdAt: new Date().toISOString(),
  };

  const created = await sanityClient.create(doc);
  return normalizeAsset(created);
}

async function deleteUserAsset(sanityClient, userId, assetId) {
  const doc = await sanityClient.getDocument(assetId);
  if (!doc || doc._type !== "userAsset" || String(doc.userId) !== String(userId)) {
    return null;
  }
  await sanityClient.delete(assetId);
  return normalizeAsset(doc);
}

async function updateUserAsset(sanityClient, userId, assetId, {name}) {
  const doc = await sanityClient.getDocument(assetId);
  if (!doc || doc._type !== "userAsset" || String(doc.userId) !== String(userId)) {
    return null;
  }

  const trimmedName = name?.trim();
  if (!trimmedName) {
    throw new Error("Asset name is required.");
  }

  const updated = await sanityClient
      .patch(assetId)
      .set({name: trimmedName})
      .commit();

  return normalizeAsset(updated);
}

async function addAssetToLayout(sanityClient, userId, assetId, layoutId, options = {}) {
  const asset = await sanityClient.getDocument(assetId);
  if (!asset || asset._type !== "userAsset" || String(asset.userId) !== String(userId)) {
    throw new Error("Asset not found or access denied.");
  }

  const layout = await sanityClient.getDocument(layoutId);
  if (!layout || String(layout.userId) !== String(userId)) {
    throw new Error("Layout not found or access denied.");
  }

  const newObject = {
    id: String(Date.now()),
    type: "asset",
    name: options.name || asset.name || "Asset",
    assetUrl: asset.assetUrl,
    color: "#ffffff",
    opacity: 1,
    position: options.position || {x: 0, y: 0.5, z: 0},
    rotation: {x: 0, y: 0, z: 0},
    scale: {x: 1, y: 1, z: 1},
  };

  const updatedObjects = [...(layout.objects || []), newObject];
  await sanityClient.patch(layoutId).set({objects: updatedObjects}).commit();

  return {layoutId, object: newObject, asset: normalizeAsset(asset)};
}

async function syncAssetsFromLayouts(sanityClient, userId) {
  const layouts = await sanityClient.fetch(
      `*[_type == "layout" && userId == $userId]{ objects }`,
      {userId},
  );

  for (const layout of layouts) {
    for (const obj of layout.objects || []) {
      if (obj.type !== "asset" || !obj.assetUrl?.trim()) continue;

      await createUserAsset(sanityClient, {
        userId,
        name: obj.name || "Layout Asset",
        assetUrl: obj.assetUrl,
        source: "upload",
      });
    }
  }
}

async function listUserAssetsWithSync(sanityClient, userId) {
  await syncAssetsFromLayouts(sanityClient, userId);
  return listUserAssets(sanityClient, userId);
}

module.exports = {
  listUserAssets,
  listUserAssetsWithSync,
  findBySketchfabUid,
  createUserAsset,
  deleteUserAsset,
  updateUserAsset,
  addAssetToLayout,
  syncAssetsFromLayouts,
  normalizeAsset,
};
