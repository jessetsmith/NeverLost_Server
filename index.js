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
// Defer route loading to avoid blocking module initialization
let layoutRoutes;
let userRoutes;
try {
  layoutRoutes = require("./src/routes/layoutRoutes");
  userRoutes = require("./src/routes/userRoutes");
} catch (error) {
  console.error("Error loading routes:", error);
  // Create empty routers as fallback to prevent startup failure
  const expressRouter = require("express").Router;
  layoutRoutes = expressRouter();
  userRoutes = expressRouter();
}

// Load .env file for local development only
// Note: PORT, SANITY_TOKEN, and JWT_SECRET should NOT be in .env
// - PORT is reserved by Firebase Functions/Cloud Run (must be 8080)
// - SANITY_TOKEN and JWT_SECRET are defined as secrets and will conflict
// For local dev, use .env.local file (not tracked by git) for secrets
// IMPORTANT: Only load .env in local dev to avoid conflicts with Cloud Run
// Cloud Run will provide PORT=8080 and secrets via environment variables
if (!process.env.FUNCTION_TARGET && !process.env.K_SERVICE) {
  // Only load .env in local development (not in Cloud Run)
  try {
    dotenv.config({path: ".env.local"});
    dotenv.config(); // .env will override .env.local for non-secret values
  } catch (error) {
    // Ignore .env loading errors - not critical for Cloud Run
  }
}

// Define environment variables using the new v2 API
// These register the parameters with Firebase Functions
// Values are accessed via process.env at runtime (not .value())
let sanityToken;
let jwtSecret;

try {
  // Register string parameters (values available via process.env)
  defineString("SANITY_PROJECT_ID", {
    default: "492nxyas",
    description: "Sanity.io project ID",
  });

  defineString("SANITY_DATASET", {
    default: "production",
    description: "Sanity.io dataset name",
  });

  // Register secrets (values available via process.env when deployed)
  sanityToken = defineSecret("SANITY_TOKEN");
  jwtSecret = defineSecret("JWT_SECRET");
} catch (error) {
  console.error("Error defining Firebase parameters:", error);
  // Continue without secrets - function will still export
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
// IMPORTANT: Do NOT call .value() during module load - defer to runtime
const getSanityClient = () => {
  try {
    // Always use process.env at runtime - secrets are injected automatically
    // Don't call .value() during module load as it may block initialization
    const projectId = process.env.SANITY_PROJECT_ID || "492nxyas";
    const dataset = process.env.SANITY_DATASET || "production";

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
// The container must start and listen on PORT=8080 within the allocated timeout
// Firebase Functions v2 with onRequest handles PORT=8080 automatically
// CRITICAL: Export must happen synchronously - no async operations before this
const functionConfig = {
  cors: true,
  maxInstances: 10,
  timeoutSeconds: 60,
  memory: "256MiB",
  minInstances: 0, // Allow cold starts
  invoker: "public", // Allow public access
};

// Only add secrets if they were successfully defined
// Secrets must be defined at module load time for Firebase Functions v2
if (sanityToken && jwtSecret) {
  functionConfig.secrets = [sanityToken, jwtSecret];
}

// Export the function IMMEDIATELY - this is critical for Cloud Run
// Firebase Functions v2 with onRequest automatically:
// - Listens on PORT=8080 (provided by Cloud Run)
// - Handles HTTP request routing
// - Manages container lifecycle
// The Express app must be fully configured before this point
exports.api = onRequest(functionConfig, app);

