/**
 * Firebase Functions v2 - NeverLost Backend API
 * Uses defineSecret and defineString for environment variables
 * (replaces deprecated functions.config())
 */

// Core Firebase Functions imports - must be first
const {onRequest} = require("firebase-functions/v2/https");
const {defineString, defineSecret} = require("firebase-functions/params");

// Express and middleware
const express = require("express");
const cors = require("cors");

// Environment configuration
const dotenv = require("dotenv");

// Sanity client
const {createClient} = require("@sanity/client");

// Routes - load with error handling
let layoutRoutes;
let userRoutes;
try {
  layoutRoutes = require("./src/routes/layoutRoutes");
  userRoutes = require("./src/routes/userRoutes");
} catch (error) {
  console.error("Error loading routes:", error);
  // Create empty routers as fallback
  const express = require("express");
  layoutRoutes = express.Router();
  userRoutes = express.Router();
}

// Load .env file for local development only
// Note: PORT, SANITY_TOKEN, and JWT_SECRET should NOT be in .env
// - PORT is reserved by Firebase Functions/Cloud Run (must be 8080)
// - SANITY_TOKEN and JWT_SECRET are defined as secrets and will conflict
// For local dev, use .env.local file (not tracked by git) for secrets
// IMPORTANT: Do this BEFORE defining Firebase parameters to avoid conflicts
if (process.env.NODE_ENV !== "production" || !process.env.FUNCTION_TARGET) {
  // Load .env.local first (for secrets), then .env (for non-secrets)
  dotenv.config({path: ".env.local"});
  dotenv.config(); // .env will override .env.local for non-secret values
}

// Define environment variables using the new v2 API
// For non-sensitive values
let sanityProjectId;
let sanityDataset;
let sanityToken;
let jwtSecret;

try {
  sanityProjectId = defineString("SANITY_PROJECT_ID", {
    default: "492nxyas",
    description: "Sanity.io project ID",
  });

  sanityDataset = defineString("SANITY_DATASET", {
    default: "production",
    description: "Sanity.io dataset name",
  });

  // For sensitive values (secrets)
  sanityToken = defineSecret("SANITY_TOKEN");
  jwtSecret = defineSecret("JWT_SECRET");
} catch (error) {
  console.error("Error defining Firebase parameters:", error);
  // Fallback to process.env if defineString/defineSecret fails
  // This should not happen in production, but helps with local dev
}

// Initialize Express app
const app = express();

// Configure CORS - Allow requests from your frontend domains
const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      "http://localhost:5173", // Local development
      "http://localhost:3000", // Alternative local port
      /\.web\.app$/, // Firebase Hosting default domain
      /\.firebaseapp\.com$/, // Firebase Hosting default domain
    ];

    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some((allowed) => {
      if (typeof allowed === "string") {
        return origin === allowed;
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Initialize Sanity client
// Note: In Firebase Functions v2, when secrets are included in the
// function config, they are automatically available via process.env at runtime
const getSanityClient = () => {
  try {
    // Use defineString value() or fallback to process.env or default
    let projectId;
    let dataset;

    if (sanityProjectId) {
      try {
        projectId = sanityProjectId.value();
      } catch (e) {
        projectId = process.env.SANITY_PROJECT_ID || "492nxyas";
      }
    } else {
      projectId = process.env.SANITY_PROJECT_ID || "492nxyas";
    }

    if (sanityDataset) {
      try {
        dataset = sanityDataset.value();
      } catch (e) {
        dataset = process.env.SANITY_DATASET || "production";
      }
    } else {
      dataset = process.env.SANITY_DATASET || "production";
    }

    const sanityClientConfig = {
      projectId: projectId,
      apiVersion: "2021-08-31",
      dataset: dataset,
      useCdn: false,
    };

    // Secrets are automatically available via process.env when deployed
    // For local dev, load from .env file using dotenv
    const token = process.env.SANITY_TOKEN;
    if (token && token.trim() !== "") {
      sanityClientConfig.token = token;
      console.log("✅ Sanity token loaded (write operations enabled)");
    } else {
      console.warn(
          "⚠️  Warning: SANITY_TOKEN not set. Write operations will fail.",
      );
    }

    return createClient(sanityClientConfig);
  } catch (error) {
    console.error("Error creating Sanity client:", error);
    // Return a client with defaults to prevent startup failure
    return createClient({
      projectId: process.env.SANITY_PROJECT_ID || "492nxyas",
      apiVersion: "2021-08-31",
      dataset: process.env.SANITY_DATASET || "production",
      useCdn: false,
    });
  }
};

// Middleware to inject Sanity client into requests
app.use((req, res, next) => {
  req.sanityClient = getSanityClient();
  next();
});

// Routes
app.use("/api/layouts", layoutRoutes);
app.use("/api/users", userRoutes);

// Root Endpoint - Must be first for Cloud Run health checks
// Cloud Run checks the root path to verify container is ready
app.get("/", (req, res) => {
  res.status(200).send("Welcome to the NeverLost Backend Server!");
});

// Health check endpoint - Cloud Run uses this to verify the container is ready
// Must respond quickly (within timeout) to pass health checks
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "NeverLost API",
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(500).json({error: "Something went wrong!"});
});

// Export as Firebase Cloud Function v2
// According to Cloud Run docs: https://cloud.google.com/run/docs/troubleshooting#container-failed-to-start
// The container must start and listen on PORT=8080 within the timeout
// Firebase Functions v2 handles this automatically, but we must export synchronously
const functionConfig = {
  cors: true,
  maxInstances: 10,
  timeoutSeconds: 60,
  memory: "256MiB",
  minInstances: 0, // Allow cold starts
  // Ensure the function is ready immediately
  invoker: "public", // Allow public access
};

// Only add secrets if they were successfully defined
// Secrets must be defined at module load time for Firebase Functions v2
if (sanityToken && jwtSecret) {
  functionConfig.secrets = [sanityToken, jwtSecret];
} else {
  console.warn("⚠️  Secrets not defined, function may not work correctly");
  // Still export the function even without secrets for debugging
}

// Export the function - this MUST happen synchronously at module load
// Firebase Functions v2 with onRequest automatically handles:
// - Listening on PORT=8080 (set by Cloud Run)
// - HTTP request routing
// - Container lifecycle
exports.api = onRequest(functionConfig, app);

