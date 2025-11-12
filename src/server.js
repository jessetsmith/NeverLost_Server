const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { createClient } = require("@sanity/client");
const layoutRoutes = require("./routes/layoutRoutes");
const userRoutes = require("./routes/userRoutes");

// Load environment variables from .env file
dotenv.config();

// Validate required environment variables
if (!process.env.SANITY_PROJECT_ID) {
  console.error("❌ Error: SANITY_PROJECT_ID is required in .env file");
  process.exit(1);
}

if (!process.env.SANITY_DATASET) {
  console.error("❌ Error: SANITY_DATASET is required in .env file");
  process.exit(1);
}

// Initialize Express app
const app = express();

// Configure CORS
app.use(
  cors({
    origin: "http://localhost:5173", // Allow requests from this origin
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);

app.use(express.json());

// Initialize Sanity client
const sanityClientConfig = {
  projectId: process.env.SANITY_PROJECT_ID, // Find this in your Sanity.io manage project page
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
  console.warn("⚠️  Warning: SANITY_TOKEN not set. Write operations (registration) will fail.");
  console.warn("   Get your token from: https://sanity.io/manage");
  console.warn("   Make sure the token has 'Editor' or 'Admin' role with write permissions");
}

const sanityClient = createClient(sanityClientConfig);

// Verify token has write permissions on startup (only if token is provided)
if (process.env.SANITY_TOKEN && process.env.SANITY_TOKEN.trim() !== "") {
  (async () => {
    try {
      // Try to create a test document to verify write permissions
      const testDoc = {
        _type: "user",
        username: "__token_test__",
        email: "__test@neverlost.io__",
        password: "test",
      };
      const created = await sanityClient.create(testDoc);
      // Clean up test document immediately
      if (created && created._id) {
        try {
          await sanityClient.delete(created._id);
        } catch (deleteErr) {
          // Ignore delete errors, test doc will be cleaned up later
        }
      }
      console.log("✅ Sanity token verified: Write permissions confirmed");
    } catch (err) {
      if (err.statusCode === 403 || (err.details && err.details.type === "mutationError")) {
        console.error("\n❌ ERROR: Sanity token is read-only!");
        console.error("   Your token does not have write permissions.");
        console.error("   Please create a new token with 'Editor' or 'Admin' role:");
        console.error("   1. Go to https://sanity.io/manage");
        console.error("   2. Select your project: " + process.env.SANITY_PROJECT_ID);
        console.error("   3. Go to API → Tokens");
        console.error("   4. Click 'Add API token'");
        console.error("   5. Name it 'Server Token' or similar");
        console.error("   6. Select 'Editor' or 'Admin' role (NOT 'Viewer')");
        console.error("   7. Copy the token and update SANITY_TOKEN in your .env file");
        console.error("   8. Restart the server");
        console.error("   Registration and other write operations will fail until this is fixed.\n");
      } else {
        // Other errors might be schema-related, don't block startup
        console.warn("⚠️  Could not verify token permissions:", err.message);
        console.warn("   If registration fails, check your token has 'Editor' or 'Admin' role");
      }
    }
  })();
}

// Middleware to inject Sanity client into requests
app.use((req, res, next) => {
  req.sanityClient = sanityClient;
  next();
});

// Routes
app.use("/api/layouts", layoutRoutes);
app.use("/api/users", userRoutes);

// Root Endpoint
app.get("/", (req, res) => {
  res.send("Welcome to the NeverLost Backend Server!");
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
