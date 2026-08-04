const fs = require("fs");
const path = require("path");
const {v4: uuidv4} = require("uuid");
const {createUserAsset} = require("../services/userAssetService");
const {isAllowedRemoteUrl, fetchAllowedAsset} = require("../utils/assetUrlSecurity");

const CONTENT_TYPES = {
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
};

const UPLOADS_ROOT = path.join(__dirname, "../../uploads/assets");

/** Convert share links (e.g. Google Drive) to a fetchable download URL. */
function normalizeAssetUrl(url) {
  const trimmed = url.trim();
  const driveFileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if (driveFileMatch) {
    return `https://drive.google.com/uc?export=download&id=${driveFileMatch[1]}`;
  }
  const driveOpenMatch = trimmed.match(/[?&]id=([^&]+)/i);
  if (trimmed.includes("drive.google.com") && driveOpenMatch) {
    return `https://drive.google.com/uc?export=download&id=${driveOpenMatch[1]}`;
  }
  return trimmed;
}

function saveLocalAsset(userId, buffer, filename) {
  const userDir = path.join(UPLOADS_ROOT, String(userId));
  fs.mkdirSync(userDir, {recursive: true});
  const filePath = path.join(userDir, filename);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

function buildPublicUrl(req, userId, filename) {
  if (process.env.ASSET_BASE_URL) {
    return `${process.env.ASSET_BASE_URL.replace(/\/$/, "")}/uploads/assets/${userId}/${filename}`;
  }
  return `${req.protocol}://${req.get("host")}/uploads/assets/${userId}/${filename}`;
}

function buildUploadResponse({url, storage, originalName, assetId, userAsset}) {
  return {
    url,
    storage,
    originalName,
    ...(assetId ? {assetId} : {}),
    ...(userAsset ? {userAsset} : {}),
  };
}

async function saveToUserLibrary(req, {url, originalName, source = "upload"}) {
  if (!req.sanityClient || !req.user?.id) return null;
  try {
    const baseName = originalName?.replace(/\.(glb|gltf)$/i, "") || "Uploaded Asset";
    return await createUserAsset(req.sanityClient, {
      userId: req.user.id,
      name: baseName,
      assetUrl: url,
      source,
      originalName,
    });
  } catch (err) {
    console.warn("Could not save asset to user library:", err.message);
    return null;
  }
}

const uploadAsset = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({error: "No file uploaded."});
  }

  const ext = req.file.originalname.toLowerCase().slice(req.file.originalname.lastIndexOf("."));
  if (!CONTENT_TYPES[ext]) {
    return res.status(400).json({error: "Only .glb and .gltf files are allowed."});
  }

  const contentType = CONTENT_TYPES[ext];
  const safeName = `${uuidv4()}${ext}`;
  const userId = req.user?.id || "anonymous";

  if (req.sanityClient && process.env.SANITY_TOKEN) {
    try {
      const asset = await req.sanityClient.assets.upload("file", req.file.buffer, {
        filename: safeName,
        contentType,
      });
      const userAsset = await saveToUserLibrary(req, {
        url: asset.url,
        originalName: req.file.originalname,
        source: "upload",
      });
      return res.status(201).json(buildUploadResponse({
        url: asset.url,
        assetId: asset._id,
        originalName: req.file.originalname,
        storage: "sanity",
        userAsset,
      }));
    } catch (err) {
      console.warn("Sanity asset upload failed, using local storage:", err.message);
    }
  }

  try {
    saveLocalAsset(userId, req.file.buffer, safeName);
    const url = buildPublicUrl(req, userId, safeName);
    const userAsset = await saveToUserLibrary(req, {
      url,
      originalName: req.file.originalname,
      source: "upload",
    });
    return res.status(201).json(buildUploadResponse({
      url,
      originalName: req.file.originalname,
      storage: "local",
      userAsset,
    }));
  } catch (err) {
    console.error("Local asset upload error:", err);
    return res.status(500).json({error: "Failed to save asset. Please try again."});
  }
};

/** Proxy remote GLB/GLTF URLs so Three.js can load them (CORS / Google Drive). */
const proxyAsset = async (req, res) => {
  const rawUrl = req.query.url;
  if (!rawUrl) {
    return res.status(400).json({error: "URL query parameter is required."});
  }

  const normalized = normalizeAssetUrl(String(rawUrl));
  if (!isAllowedRemoteUrl(normalized)) {
    return res.status(400).json({
      error: "URL not allowed. Use HTTPS links from approved hosts or direct .glb/.gltf files.",
    });
  }

  try {
    const {response, buffer} = await fetchAllowedAsset(normalized);
    const contentType = response.headers.get("content-type") || "model/gltf-binary";

    res.set("Content-Type", contentType);
    res.set("Cache-Control", "private, max-age=3600");
    return res.send(buffer);
  } catch (err) {
    console.error("Asset proxy error:", err.message);
    if (err.message === "Asset too large") {
      return res.status(413).json({error: "Asset file is too large."});
    }
    if (err.message === "URL not allowed") {
      return res.status(400).json({error: "URL not allowed."});
    }
    return res.status(502).json({
      error: "Failed to fetch asset URL. Try uploading the file directly instead.",
    });
  }
};

module.exports = {
  uploadAsset,
  proxyAsset,
  normalizeAssetUrl,
  buildPublicUrl,
  UPLOADS_ROOT,
  isAllowedRemoteUrl,
};
