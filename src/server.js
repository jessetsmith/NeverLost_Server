const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { createClient } = require("@sanity/client");
const layoutRoutes = require("./routes/layoutRoutes");
const userRoutes = require("./routes/userRoutes");

// Load environment variables from .env file
dotenv.config();

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
const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID, // Find this in your Sanity.io manage project page
  apiVersion: "2021-08-31", // use a UTC date string
  dataset: process.env.SANITY_DATASET, // e.g., 'production'
  token: process.env.SANITY_TOKEN, // Only if you want to update content with the client
  useCdn: false, // `false` if you want to ensure fresh data
});

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
