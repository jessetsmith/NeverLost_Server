const express = require("express");
const cors = require("cors");
const multer = require("multer");
const {loadLocalEnv} = require("../scripts/loadEnv");
const {createClient} = require("@sanity/client");
const layoutRoutes = require("./routes/layoutRoutes");
const userRoutes = require("./routes/userRoutes");
const assetRoutes = require("./routes/assetRoutes");
const sketchfabRoutes = require("./routes/sketchfabRoutes");
const userAssetRoutes = require("./routes/userAssetRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const messageRoutes = require("./routes/messageRoutes");
const connectionRoutes = require("./routes/connectionRoutes");
const feedRoutes = require("./routes/feedRoutes");
const forumRoutes = require("./routes/forumRoutes");
const {UPLOADS_ROOT, FLOORPLANS_ROOT} = require("./controllers/assetController");
const {PROFILES_ROOT} = require("./services/profileImageService");

// Load env profile (local vs production) + secrets from .env.local
const runtimeEnv = loadLocalEnv();

const {assertJwtSecretConfigured} = require("./utils/jwtSecret");
const {applyExpressSecurity} = require("./middleware/applyExpressSecurity");

// Validate required environment variables
if (!process.env.SANITY_PROJECT_ID) {
  console.error("❌ Error: SANITY_PROJECT_ID is required in .env file");
  process.exit(1);
}

if (!process.env.SANITY_DATASET) {
  console.error("❌ Error: SANITY_DATASET is required in .env file");
  process.exit(1);
}

try {
  assertJwtSecretConfigured();
  console.log("✅ JWT_SECRET loaded");
} catch (err) {
  console.error(`❌ Error: ${err.message} (set in .env.local for local dev)`);
  process.exit(1);
}

// Initialize Express app
const app = express();

// Configure CORS
app.use(
    cors({
      origin: "http://localhost:5173",
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    }),
);

applyExpressSecurity(app);
app.use(express.json({limit: "256kb"}));

// Initialize Sanity client
const sanityClientConfig = {
  // Find this in your Sanity.io manage project page
  projectId: process.env.SANITY_PROJECT_ID,
  apiVersion: "2021-08-31", // use a UTC date string
  dataset: process.env.SANITY_DATASET, // e.g., 'production'
  useCdn: false, // `false` if you want to ensure fresh data
};

// Add token if provided (required for write operations like registration)
// Get your token from: https://sanity.io/manage
// IMPORTANT: Token must have "Editor" or "Admin" role with write permissions
if (process.env.SANITY_TOKEN && process.env.SANITY_TOKEN.trim() !== "") {
  sanityClientConfig.token = process.env.SANITY_TOKEN;
  console.log("✅ Sanity token loaded (write operations enabled)");
} else {
  console.warn(
      "⚠️  Warning: SANITY_TOKEN not set. Write operations will fail.",
  );
  console.warn("   Get your token from: https://sanity.io/manage");
  console.warn(
      "   Make sure the token has 'Editor' or 'Admin' role",
  );
}

const sanityClient = createClient(sanityClientConfig);

// Optional: verify Sanity token can read project data (no test user documents)
if (process.env.SANITY_TOKEN && process.env.SANITY_TOKEN.trim() !== "") {
  (async () => {
    try {
      await sanityClient.fetch("*[_type == \"layout\"][0]._id");
      console.log("✅ Sanity token verified: API access confirmed");
    } catch (err) {
      if (err.statusCode === 403) {
        console.error("\n❌ ERROR: Sanity token lacks required permissions.");
      } else {
        console.warn("⚠️  Could not verify Sanity token:", err.message);
      }
    }
  })();
}

// Middleware to inject Sanity client into requests
app.use((req, res, next) => {
  req.sanityClient = sanityClient;
  next();
});

// Serve uploaded assets locally (fallback storage)
app.use("/uploads/assets", express.static(UPLOADS_ROOT, {
  setHeaders(res) {
    res.set("Access-Control-Allow-Origin", "http://localhost:5173");
    res.set("Cross-Origin-Resource-Policy", "cross-origin");
  },
}));

app.use("/uploads/floorplans", express.static(FLOORPLANS_ROOT, {
  setHeaders(res) {
    res.set("Access-Control-Allow-Origin", "http://localhost:5173");
    res.set("Cross-Origin-Resource-Policy", "cross-origin");
  },
}));

app.use("/uploads/profiles", express.static(PROFILES_ROOT, {
  setHeaders(res) {
    res.set("Access-Control-Allow-Origin", "http://localhost:5173");
    res.set("Cross-Origin-Resource-Policy", "cross-origin");
  },
}));

// Routes
app.use("/api/layouts", layoutRoutes);
app.use("/api/users", userRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/sketchfab", sketchfabRoutes);
app.use("/api/user-assets", userAssetRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/connections", connectionRoutes);
app.use("/api/feed", feedRoutes);
app.use("/api/forum", forumRoutes);

// Root Endpoint
app.get("/", (req, res) => {
  res.send("Welcome to the NeverLost Backend Server!");
});

// Global Error Handler
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({error: "File too large. Maximum size is 25 MB."});
    }
    return res.status(400).json({error: err.message});
  }
  if (err.message === "Only .glb and .gltf files are allowed.") {
    return res.status(400).json({error: err.message});
  }
  if (err.message === "Only PNG, JPG, and WebP floorplan images are allowed.") {
    return res.status(400).json({error: err.message});
  }
  if (err.message === "Only JPEG, PNG, GIF, and WebP images are allowed.") {
    return res.status(400).json({error: err.message});
  }
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Env profile: ${runtimeEnv.profile} (${runtimeEnv.source})`);
  if (process.env.SKETCHFAB_REDIRECT_URI) {
    console.log(`Sketchfab redirect: ${process.env.SKETCHFAB_REDIRECT_URI}`);
  }
  console.log(`User profile:  GET  /api/users/profile`);
  console.log(`Session refresh: POST /api/users/session/refresh`);
  console.log(`Asset uploads: POST /api/assets/upload`);
  console.log(`Floorplan uploads: POST /api/assets/upload-floorplan`);
  console.log(`Asset proxy:   GET  /api/assets/proxy?url=...`);
  const sketchfabSearch = Boolean(process.env.SKETCHFAB_API_TOKEN?.trim());
  const sketchfabOAuth = Boolean(
      process.env.SKETCHFAB_CLIENT_ID?.trim() && process.env.SKETCHFAB_CLIENT_SECRET?.trim(),
  );
  const searchStatus = sketchfabSearch ?
    "configured" :
    "NOT configured (set SKETCHFAB_API_TOKEN)";
  const oauthStatus = sketchfabOAuth ?
    "configured" :
    "NOT configured (set SKETCHFAB_CLIENT_ID/SECRET)";
  console.log(`Sketchfab search: ${searchStatus}`);
  console.log(`Sketchfab OAuth:  ${oauthStatus}`);
});
