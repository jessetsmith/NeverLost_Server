const Joi = require("joi");
const {
  listUserAssetsWithSync,
  createUserAsset,
  deleteUserAsset,
  updateUserAsset,
  addAssetToLayout,
} = require("../services/userAssetService");

const listAssets = async (req, res) => {
  try {
    const assets = await listUserAssetsWithSync(req.sanityClient, req.user.id);
    res.status(200).json(assets);
  } catch (err) {
    console.error("List user assets error:", err);
    res.status(500).json({error: "Failed to load saved assets."});
  }
};

const registerAsset = async (req, res) => {
  const schema = Joi.object({
    name: Joi.string().max(120).allow(""),
    assetUrl: Joi.string().uri().required(),
    source: Joi.string().valid("upload", "sketchfab", "url").default("url"),
    thumbnailUrl: Joi.string().uri().allow(null, ""),
    sketchfabUid: Joi.string().allow(null, ""),
    originalName: Joi.string().allow(null, ""),
  });

  const {error, value} = schema.validate(req.body);
  if (error) {
    return res.status(400).json({error: error.details[0].message});
  }

  try {
    const asset = await createUserAsset(req.sanityClient, {
      userId: req.user.id,
      ...value,
    });
    res.status(201).json(asset);
  } catch (err) {
    console.error("Register user asset error:", err);
    res.status(500).json({error: err.message || "Failed to save asset."});
  }
};

const removeAsset = async (req, res) => {
  try {
    const removed = await deleteUserAsset(req.sanityClient, req.user.id, req.params.assetId);
    if (!removed) {
      return res.status(404).json({error: "Asset not found or access denied."});
    }
    res.status(200).json(removed);
  } catch (err) {
    console.error("Delete user asset error:", err);
    res.status(500).json({error: "Failed to delete asset."});
  }
};

const renameAsset = async (req, res) => {
  const schema = Joi.object({
    name: Joi.string().max(120).required(),
  });

  const {error, value} = schema.validate(req.body);
  if (error) {
    return res.status(400).json({error: error.details[0].message});
  }

  try {
    const updated = await updateUserAsset(
        req.sanityClient,
        req.user.id,
        req.params.assetId,
        value,
    );
    if (!updated) {
      return res.status(404).json({error: "Asset not found or access denied."});
    }
    res.status(200).json(updated);
  } catch (err) {
    console.error("Rename user asset error:", err);
    res.status(400).json({error: err.message || "Failed to rename asset."});
  }
};

const addToLayout = async (req, res) => {
  const {assetId, layoutId} = req.params;
  const {name, position} = req.body || {};

  try {
    const result = await addAssetToLayout(
        req.sanityClient,
        req.user.id,
        assetId,
        layoutId,
        {name, position},
    );
    res.status(201).json(result);
  } catch (err) {
    console.error("Add asset to layout error:", err);
    const status = err.message.includes("not found") ? 404 : 500;
    res.status(status).json({error: err.message || "Failed to add asset to layout."});
  }
};

module.exports = {
  listAssets,
  registerAsset,
  removeAsset,
  renameAsset,
  addToLayout,
};
