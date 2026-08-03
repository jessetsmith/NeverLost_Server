const fs = require("fs");
const path = require("path");
const {v4: uuidv4} = require("uuid");

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

function isAllowedRemoteUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    const host = parsed.hostname.toLowerCase();
    const pathLower = parsed.pathname.toLowerCase();
    const full = url.toLowerCase();

    if (host === "localhost" || host === "127.0.0.1") return true;
    if (pathLower.includes(".glb") || pathLower.includes(".gltf")) return true;
    if (full.includes(".glb") || full.includes(".gltf")) return true;
    if (host.includes("drive.google.com")) return true;
    if (host.includes("cdn.sanity.io")) return true;
    if (host.includes("storage.googleapis.com")) return true;
    if (host.includes("firebasestorage.googleapis.com")) return true;
    if (host.endsWith(".amazonaws.com")) return true;
    return false;
  } catch {
    return false;
  }
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

  // Try Sanity CDN first when configured
  if (req.sanityClient && process.env.SANITY_TOKEN) {
    try {
      const asset = await req.sanityClient.assets.upload("file", req.file.buffer, {
        filename: safeName,
        contentType,
      });
      return res.status(201).json({
        url: asset.url,
        assetId: asset._id,
        originalName: req.file.originalname,
        storage: "sanity",
      });
    } catch (err) {
      console.warn("Sanity asset upload failed, using local storage:", err.message);
    }
  }

  // Local disk fallback — always available in dev
  try {
    saveLocalAsset(userId, req.file.buffer, safeName);
    const url = buildPublicUrl(req, userId, safeName);
    return res.status(201).json({
      url,
      originalName: req.file.originalname,
      storage: "local",
    });
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

  const normalized = normalizeAssetUrl(rawUrl);
  if (!isAllowedRemoteUrl(normalized)) {
    return res.status(400).json({
      error: "URL not allowed. Use a direct .glb/.gltf link or Google Drive share link.",
    });
  }

  try {
    const response = await fetch(normalized, {redirect: "follow"});
    if (!response.ok) {
      return res.status(502).json({
        error: `Could not fetch asset (HTTP ${response.status}). Use file upload for Google Drive files.`,
      });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") || "model/gltf-binary";

    res.set("Content-Type", contentType);
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Cache-Control", "public, max-age=3600");
    return res.send(buffer);
  } catch (err) {
    console.error("Asset proxy error:", err);
    return res.status(502).json({
      error: "Failed to fetch asset URL. Try uploading the file directly instead.",
    });
  }
};

module.exports = {
  uploadAsset,
  proxyAsset,
  normalizeAssetUrl,
  UPLOADS_ROOT,
};
