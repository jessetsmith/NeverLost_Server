const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Joi = require("joi");

// Registration Controller
const registerUser = async (req, res) => {
  // Registration logic here
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
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    // Respond with user data and token
    res.status(200).json({
      user: {
        id: user._id,
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
