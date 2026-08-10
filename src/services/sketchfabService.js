const AdmZip = require("adm-zip");
const {v4: uuidv4} = require("uuid");
const fs = require("fs");
const path = require("path");
const {UPLOADS_ROOT, buildPublicUrl} = require("../controllers/assetController");
const {assertValidSketchfabUid, resolvePathUnder} = require("../utils/pathSecurity");

const SKETCHFAB_API = "https://api.sketchfab.com/v3";

function getApiToken() {
  return process.env.SKETCHFAB_API_TOKEN?.trim() || "";
}

function getOAuthConfig() {
  return {
    clientId: process.env.SKETCHFAB_CLIENT_ID?.trim() || "",
    clientSecret: process.env.SKETCHFAB_CLIENT_SECRET?.trim() || "",
    redirectUri: process.env.SKETCHFAB_REDIRECT_URI?.trim() || "",
  };
}

function normalizeRedirectUri(uri) {
  const parsed = new URL(uri);
  return `${parsed.origin}${parsed.pathname.replace(/\/$/, "")}`;
}

function isAllowedRedirectUri(uri) {
  try {
    const parsed = new URL(uri);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    if (!parsed.pathname.endsWith("/library")) return false;

    const normalized = normalizeRedirectUri(uri);
    const configured = getOAuthConfig().redirectUri;
    if (configured && normalized === normalizeRedirectUri(configured)) return true;

    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      return true;
    }

    const allowedOrigins = (process.env.SKETCHFAB_ALLOWED_ORIGINS || "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);

    return allowedOrigins.some((origin) => normalized === normalizeRedirectUri(origin));
  } catch {
    return false;
  }
}

function resolveRedirectUri(redirectUri) {
  const configured = getOAuthConfig().redirectUri;
  if (redirectUri && isAllowedRedirectUri(redirectUri)) {
    return redirectUri;
  }
  if (configured && isAllowedRedirectUri(configured)) {
    return configured;
  }
  return null;
}

function sketchfabHeaders(token, type = "api") {
  if (type === "oauth") {
    return {Authorization: `Bearer ${token}`};
  }
  return {Authorization: `Token ${token}`};
}

async function searchModels({query, cursor, count = 24}) {
  const token = getApiToken();
  if (!token) {
    throw new Error("SKETCHFAB_API_TOKEN is not configured on the server.");
  }

  const params = new URLSearchParams({
    type: "models",
    q: query || "",
    downloadable: "true",
    sort_by: "-likeCount",
    count: String(count),
  });
  if (cursor) params.set("cursor", cursor);

  const response = await fetch(`${SKETCHFAB_API}/search?${params}`, {
    headers: sketchfabHeaders(token, "api"),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Sketchfab search failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  return {
    results: (data.results || []).map(normalizeSearchResult),
    nextCursor: data.cursors?.next || null,
  };
}

function normalizeSearchResult(model) {
  const thumb = model.thumbnails?.images?.find((img) => img.width >= 200) ||
    model.thumbnails?.images?.[0];

  return {
    uid: model.uid,
    name: model.name,
    viewerUrl: model.viewerUrl,
    thumbnailUrl: thumb?.url || null,
    author: model.user?.displayName || model.user?.username || "Unknown",
    authorUrl: model.user?.profileUrl || null,
    license: model.license?.label || null,
    licenseUrl: model.license?.url || null,
    faceCount: model.faceCount,
    vertexCount: model.vertexCount,
  };
}

function buildSketchfabCredit(metadata) {
  if (!metadata) return null;

  const modelName = metadata.modelName || metadata.name;
  const modelUrl = metadata.modelUrl || metadata.viewerUrl;
  const authorName = metadata.authorName ||
    metadata.user?.displayName ||
    metadata.user?.username;
  const authorUrl = metadata.authorUrl || metadata.user?.profileUrl;
  const licenseLabel = metadata.licenseLabel || metadata.license?.label;
  const licenseUrl = metadata.licenseUrl || metadata.license?.url;

  if (!modelName || !authorName) return null;

  return {
    modelName,
    modelUrl: modelUrl || null,
    authorName,
    authorUrl: authorUrl || null,
    licenseLabel: licenseLabel || null,
    licenseUrl: licenseUrl || null,
  };
}

async function fetchModelMetadata(modelUid, accessToken) {
  const response = await fetch(`${SKETCHFAB_API}/models/${modelUid}`, {
    headers: sketchfabHeaders(accessToken, "oauth"),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Sketchfab model metadata failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  return buildSketchfabCredit({
    modelName: data.name,
    modelUrl: data.viewerUrl,
    authorName: data.user?.displayName || data.user?.username,
    authorUrl: data.user?.profileUrl,
    licenseLabel: data.license?.label,
    licenseUrl: data.license?.url,
  });
}

function buildOAuthUrl(state, redirectUri) {
  const {clientId} = getOAuthConfig();
  if (!clientId) {
    throw new Error("SKETCHFAB_CLIENT_ID is not configured on the server.");
  }

  const resolvedRedirectUri = resolveRedirectUri(redirectUri);
  if (!resolvedRedirectUri) {
    throw new Error("A valid redirect URI is required.");
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: resolvedRedirectUri,
    state,
  });

  return {url: `https://sketchfab.com/oauth2/authorize/?${params}`, redirectUri: resolvedRedirectUri};
}

async function exchangeOAuthCode(code, redirectUri) {
  const {clientId, clientSecret} = getOAuthConfig();
  if (!clientId || !clientSecret) {
    throw new Error("Sketchfab OAuth is not configured on the server.");
  }

  const resolvedRedirectUri = resolveRedirectUri(redirectUri);
  if (!resolvedRedirectUri) {
    throw new Error("A valid redirect URI is required.");
  }

  const response = await fetch("https://sketchfab.com/oauth2/token/", {
    method: "POST",
    headers: {"Content-Type": "application/x-www-form-urlencoded"},
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: resolvedRedirectUri,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Sketchfab OAuth exchange failed (${response.status}): ${body}`);
  }

  return response.json();
}

async function refreshOAuthToken(refreshToken) {
  const {clientId, clientSecret} = getOAuthConfig();
  if (!clientId || !clientSecret) {
    throw new Error("Sketchfab OAuth is not configured on the server.");
  }

  if (!refreshToken) {
    throw new Error("Refresh token is required.");
  }

  const response = await fetch("https://sketchfab.com/oauth2/token/", {
    method: "POST",
    headers: {"Content-Type": "application/x-www-form-urlencoded"},
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Sketchfab OAuth refresh failed (${response.status}): ${body}`);
  }

  return response.json();
}

async function getDownloadLinks(modelUid, accessToken) {
  const response = await fetch(`${SKETCHFAB_API}/models/${modelUid}/download`, {
    headers: sketchfabHeaders(accessToken, "oauth"),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Sketchfab download request failed (${response.status}): ${body}`);
  }

  return response.json();
}

async function downloadArchive(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download Sketchfab archive (${response.status}).`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function saveExtractedModel(userId, modelUid, zipBuffer, req) {
  assertValidSketchfabUid(modelUid);

  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries().filter((entry) => !entry.isDirectory);

  const userDir = resolvePathUnder(UPLOADS_ROOT, String(userId));
  fs.mkdirSync(userDir, {recursive: true});

  const glbEntry = entries.find((entry) => entry.entryName.toLowerCase().endsWith(".glb"));
  if (glbEntry) {
    const filename = `${modelUid}-${uuidv4().slice(0, 8)}.glb`;
    const filePath = resolvePathUnder(userDir, filename);
    fs.writeFileSync(filePath, glbEntry.getData());
    return {
      url: buildPublicUrl(req, userId, filename),
      format: "glb",
      filePath,
    };
  }

  const gltfEntry = entries.find((entry) => entry.entryName.toLowerCase().endsWith(".gltf"));
  if (!gltfEntry) {
    throw new Error("Sketchfab archive did not contain a GLB or glTF file.");
  }

  const extractDirName = `sketchfab-${modelUid}-${uuidv4().slice(0, 8)}`;
  const extractDir = resolvePathUnder(userDir, extractDirName);
  fs.mkdirSync(extractDir, {recursive: true});

  for (const entry of entries) {
    const entryPath = resolvePathUnder(extractDir, entry.entryName);
    fs.mkdirSync(path.dirname(entryPath), {recursive: true});
    fs.writeFileSync(entryPath, entry.getData());
  }

  const gltfFile = findFileRecursive(extractDir, ".gltf");
  if (!gltfFile) {
    throw new Error("Could not locate glTF file after extraction.");
  }

  const relativePath = path.relative(UPLOADS_ROOT, gltfFile).split(path.sep).join("/");
  const baseUrl = process.env.ASSET_BASE_URL || `${req.protocol}://${req.get("host")}`;
  return {
    url: `${baseUrl.replace(/\/$/, "")}/uploads/assets/${relativePath}`,
    format: "gltf",
  };
}

function findFileRecursive(dir, ext) {
  const entries = fs.readdirSync(dir, {withFileTypes: true});
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findFileRecursive(fullPath, ext);
      if (found) return found;
    } else if (entry.name.toLowerCase().endsWith(ext)) {
      return fullPath;
    }
  }
  return null;
}

async function importModelToStorage({modelUid, accessToken, userId, req, sanityClient}) {
  assertValidSketchfabUid(modelUid);
  const downloadInfo = await getDownloadLinks(modelUid, accessToken);
  const gltfArchive = downloadInfo.gltf;
  if (!gltfArchive?.url) {
    throw new Error("This model is not available for download.");
  }

  const zipBuffer = await downloadArchive(gltfArchive.url);
  const localAsset = saveExtractedModel(userId, modelUid, zipBuffer, req);

  if (
    sanityClient &&
    process.env.SANITY_TOKEN &&
    localAsset.format === "glb" &&
    localAsset.filePath
  ) {
    try {
      const asset = await sanityClient.assets.upload("file", fs.readFileSync(localAsset.filePath), {
        filename: `${modelUid}.glb`,
        contentType: "model/gltf-binary",
      });
      return {url: asset.url, storage: "sanity", format: localAsset.format};
    } catch (err) {
      console.warn("Sanity upload failed for Sketchfab import, using local storage:", err.message);
    }
  }

  return {...localAsset, storage: "local"};
}

module.exports = {
  searchModels,
  buildOAuthUrl,
  exchangeOAuthCode,
  refreshOAuthToken,
  importModelToStorage,
  fetchModelMetadata,
  buildSketchfabCredit,
  getApiToken,
  getOAuthConfig,
  isAllowedRedirectUri,
  resolveRedirectUri,
};
