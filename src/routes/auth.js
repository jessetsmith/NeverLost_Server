const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Initialize Sanity Client
const client = [
  {
    projectId: process.env.SANITY_PROJECT_ID,
    dataset: process.env.SANITY_DATASET,
    useCdn: false,
    token: process.env.SANITY_API_TOKEN, // Ensure you have a write token
    apiVersion: "2023-10-01",
  },
];

// User Schema in Sanity (if not already defined)
const userSchema = {
  name: "user",
  title: "User",
  type: "document",
  fields: [
    {
      name: "username",
      title: "Username",
      type: "string",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "email",
      title: "Email",
      type: "string",
      validation: (Rule) => Rule.required().email(),
    },
    {
      name: "password",
      title: "Password",
      type: "string",
      validation: (Rule) => Rule.required(),
    },
  ],
};

// Registration Route
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  // Basic Validation
  if (!username || !email || !password) {
    return res.status(400).json({ message: "Please enter all fields." });
  }

  try {
    // Check if user already exists
    const existingUser = await client.fetch(
      `*[_type == "user" && email == $email][0]`,
      { email },
    );

    if (existingUser) {
      return res.status(400).json({ message: "User already exists." });
    }

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create New User
    const newUser = {
      _type: "user",
      username,
      email,
      password: hashedPassword,
    };

    await client.create(newUser);

    // Generate JWT
    const token = jwt.sign(
      { userId: newUser._id, username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    res.status(201).json({ token, message: "User registered successfully." });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

module.exports = router;
