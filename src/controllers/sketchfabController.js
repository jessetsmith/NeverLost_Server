const {
  searchModels,
  buildOAuthUrl,
  exchangeOAuthCode,
  refreshOAuthToken,
  importModelToStorage,
  fetchModelMetadata,
  getApiToken,
  getOAuthConfig,
} = require("../services/sketchfabService");
const {assertValidSketchfabUid} = require("../utils/pathSecurity");
const {
  createUserAsset,
  findBySketchfabUid,
  addAssetToLayout,
  normalizeAsset,
} = require("../services/userAssetService");

const search = async (req, res) => {
  try {
    if (!getApiToken()) {
      return res.status(503).json({
        error: "Sketchfab search is not configured. " +
          "Add SKETCHFAB_API_TOKEN to the server environment.",
      });
    }

    const {q = "", cursor} = req.query;
    const data = await searchModels({query: q, cursor});
    res.status(200).json(data);
  } catch (err) {
    console.error("Sketchfab search error:", err);
    res.status(502).json({error: err.message || "Sketchfab search failed."});
  }
};

const oauthUrl = (req, res) => {
  try {
    const redirectUri = req.query.redirectUri;
    if (!redirectUri) {
      return res.status(400).json({error: "redirectUri query parameter is required."});
    }

    const state = `${req.user.id}-${Date.now()}`;
    const {url, redirectUri: resolvedRedirectUri} = buildOAuthUrl(state, redirectUri);
    res.status(200).json({url, state, redirectUri: resolvedRedirectUri});
  } catch (err) {
    res.status(503).json({error: err.message});
  }
};

const oauthExchange = async (req, res) => {
  try {
    const {code, redirectUri} = req.body;
    if (!code) {
      return res.status(400).json({error: "Authorization code is required."});
    }
    if (!redirectUri) {
      return res.status(400).json({error: "redirectUri is required."});
    }

    const tokens = await exchangeOAuthCode(code, redirectUri);
    res.status(200).json({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
    });
  } catch (err) {
    console.error("Sketchfab OAuth error:", err);
    res.status(502).json({error: err.message || "Failed to connect Sketchfab account."});
  }
};

const oauthRefresh = async (req, res) => {
  try {
    const {refreshToken} = req.body;
    if (!refreshToken) {
      return res.status(400).json({error: "refreshToken is required."});
    }

    const tokens = await refreshOAuthToken(refreshToken);
    res.status(200).json({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
    });
  } catch (err) {
    console.error("Sketchfab OAuth refresh error:", err);
    res.status(401).json({error: err.message || "Failed to refresh Sketchfab session."});
  }
};

const oauthStatus = (req, res) => {
  res.status(200).json({
    searchConfigured: Boolean(getApiToken()),
    oauthConfigured: Boolean(getOAuthConfig().clientId && getOAuthConfig().clientSecret),
  });
};

async function resolveSketchfabUserAsset({
  sanityClient,
  userId,
  modelUid,
  modelName,
  sketchfabToken,
  thumbnailUrl,
  req,
}) {
  let userAsset = await findBySketchfabUid(sanityClient, userId, modelUid);
  let sketchfabCredit = null;

  try {
    sketchfabCredit = await fetchModelMetadata(modelUid, sketchfabToken);
  } catch (err) {
    console.warn("Could not fetch Sketchfab attribution metadata:", err.message);
  }

  if (!userAsset) {
    const stored = await importModelToStorage({
      modelUid,
      accessToken: sketchfabToken,
      userId,
      req,
      sanityClient,
    });

    userAsset = await createUserAsset(sanityClient, {
      userId,
      name: modelName || sketchfabCredit?.modelName || "Sketchfab Asset",
      assetUrl: stored.url,
      source: "sketchfab",
      thumbnailUrl: thumbnailUrl || null,
      sketchfabUid: modelUid,
      sketchfabCredit,
    });
  } else if (sketchfabCredit && !userAsset.sketchfabCredit) {
    const updated = await sanityClient
        .patch(userAsset._id)
        .set({sketchfabCredit})
        .commit();
    userAsset = normalizeAsset(updated);
  }

  return userAsset;
}

const saveModel = async (req, res) => {
  const {modelUid, modelName, sketchfabToken, thumbnailUrl} = req.body;
  const userId = req.user.id;

  if (!modelUid) {
    return res.status(400).json({error: "modelUid is required."});
  }

  try {
    assertValidSketchfabUid(modelUid);
  } catch {
    return res.status(400).json({error: "Invalid Sketchfab model UID."});
  }

  if (!sketchfabToken) {
    return res.status(401).json({
      error: "Sketchfab account required. Connect your Sketchfab account to download models.",
    });
  }

  try {
    const userAsset = await resolveSketchfabUserAsset({
      sanityClient: req.sanityClient,
      userId,
      modelUid,
      modelName,
      sketchfabToken,
      thumbnailUrl,
      req,
    });

    res.status(201).json({userAsset, saved: true});
  } catch (err) {
    console.error("Sketchfab save error:", err);
    res.status(502).json({error: "Failed to save Sketchfab model."});
  }
};

const importModel = async (req, res) => {
  const {layoutId} = req.params;
  const {modelUid, modelName, sketchfabToken, position, thumbnailUrl} = req.body;
  const userId = req.user.id;

  if (!modelUid) {
    return res.status(400).json({error: "modelUid is required."});
  }

  try {
    assertValidSketchfabUid(modelUid);
  } catch {
    return res.status(400).json({error: "Invalid Sketchfab model UID."});
  }

  if (!sketchfabToken) {
    return res.status(401).json({
      error: "Sketchfab account required. Connect your Sketchfab account to download models.",
    });
  }

  try {
    const sanityClient = req.sanityClient;
    const userAsset = await resolveSketchfabUserAsset({
      sanityClient,
      userId,
      modelUid,
      modelName,
      sketchfabToken,
      thumbnailUrl,
      req,
    });

    const layout = await sanityClient.getDocument(layoutId);
    if (!layout || layout.userId !== userId) {
      return res.status(404).json({error: "Layout not found or access denied."});
    }

    const result = await addAssetToLayout(
        sanityClient,
        userId,
        userAsset._id,
        layoutId,
        {name: modelName, position},
    );

    res.status(201).json({
      layoutId,
      object: result.object,
      userAsset: result.asset,
      assetUrl: userAsset.assetUrl,
    });
  } catch (err) {
    console.error("Sketchfab import error:", err);
    res.status(502).json({error: "Failed to import Sketchfab model."});
  }
};

module.exports = {
  search,
  oauthUrl,
  oauthExchange,
  oauthRefresh,
  oauthStatus,
  saveModel,
  importModel,
};
