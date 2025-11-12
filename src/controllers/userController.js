const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Joi = require("joi");

// Registration Controller
const registerUser = async (req, res) => {
  // Define validation schema using Joi
  const schema = Joi.object({
    username: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  });

  // Validate request body against schema
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { username, email, password } = req.body;

  try {
    const sanityClient = req.sanityClient;

    // Check if user with the provided email already exists
    const existingUserQuery = `*[_type == "user" && email == $email][0]`;
    const existingUser = await sanityClient.fetch(existingUserQuery, { email });

    if (existingUser) {
      return res.status(400).json({ error: "User with this email already exists." });
    }

    // Check if username is already taken
    const existingUsernameQuery = `*[_type == "user" && username == $username][0]`;
    const existingUsername = await sanityClient.fetch(existingUsernameQuery, { username });

    if (existingUsername) {
      return res.status(400).json({ error: "Username is already taken." });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user document
    const newUser = {
      _type: "user",
      username,
      email,
      password: hashedPassword,
    };

    // Create user in Sanity (requires write token)
    const createdUser = await sanityClient.create(newUser);

    // Generate JWT token
    const token = jwt.sign(
      { id: createdUser._id, email: createdUser.email },
      process.env.JWT_SECRET || "fallback-secret-key",
      { expiresIn: "1h" },
    );

    // Respond with user data and token (Sanity returns _id, we map it to id for frontend)
    res.status(201).json({
      user: {
        id: createdUser._id || createdUser.id,
        username: createdUser.username,
        email: createdUser.email,
      },
      token,
    });
  } catch (err) {
    console.error("Registration Error:", err);
    
    // Handle Sanity-specific permission errors
    if (err.statusCode === 403 || (err.details && err.details.type === "mutationError")) {
      return res.status(403).json({ 
        error: "Insufficient permissions. The Sanity token needs write permissions. Please create a new token with 'Editor' or 'Admin' role at https://sanity.io/manage" 
      });
    }
    
    // Handle missing token errors
    if (err.message && (err.message.includes("token") || err.message.includes("authentication"))) {
      return res.status(500).json({ 
        error: "Authentication error. Please check your Sanity token configuration." 
      });
    }
    
    // Handle validation errors from Sanity
    if (err.statusCode === 400) {
      return res.status(400).json({ 
        error: err.message || "Invalid data provided." 
      });
    }
    
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};

// Login Controller
const loginUser = async (req, res) => {
  // Define validation schema using Joi
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  });

  // Validate request body against schema
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { email, password } = req.body;

  try {
    const sanityClient = req.sanityClient;

    // Check if user with the provided email exists
    const userQuery = `*[_type == "user" && email == $email][0]`;
    const user = await sanityClient.fetch(userQuery, { email });

    if (!user) {
      return res.status(400).json({ error: "Invalid email or password." });
    }

    // Compare provided password with stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password." });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || "fallback-secret-key",
      { expiresIn: "1h" },
    );

    // Respond with user data and token (Sanity returns _id, we map it to id for frontend)
    res.status(200).json({
      user: {
        id: user._id || user.id,
        username: user.username,
        email: user.email,
      },
      token,
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};

module.exports = {
  registerUser,
  loginUser,
};
