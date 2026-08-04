const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const {v4: uuidv4} = require("uuid");
const {getJwtSecret, JWT_EXPIRES_IN} = require("../utils/jwtSecret");
const {JWT_ALGORITHM} = require("../utils/assetUrlSecurity");
const {getConnectionStatus} = require("../services/connectionService");
const {
  CONTENT_TYPES,
  buildProfilePublicUrl,
  saveLocalProfileImage,
  deleteLocalProfileImageIfOwned,
} = require("../services/profileImageService");

function formatUser(user) {
  return {
    id: user._id || user.id,
    username: user.username,
    email: user.email,
    title: user.title || "",
    bio: user.bio || "",
    profileImageUrl: user.profileImageUrl || "",
  };
}

function formatPublicProfile(user) {
  return {
    id: user._id || user.id,
    username: user.username,
    title: user.title || "",
    bio: user.bio || "",
    profileImageUrl: user.profileImageUrl || "",
  };
}

async function fetchUserById(sanityClient, userId) {
  const query = `*[_type == "user" && _id == $userId][0]`;
  return sanityClient.fetch(query, {userId});
}

// Registration Controller
const registerUser = async (req, res) => {
  // Define validation schema using Joi
  const schema = Joi.object({
    username: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(128).required(),
  });

  // Validate request body against schema
  const {error} = schema.validate(req.body);
  if (error) {
    return res.status(400).json({error: error.details[0].message});
  }

  const {username, email, password} = req.body;

  try {
    const sanityClient = req.sanityClient;

    // Check if user with the provided email already exists
    const existingUserQuery = `*[_type == "user" && email == $email][0]`;
    const existingUser = await sanityClient.fetch(existingUserQuery, {email});

    if (existingUser) {
      return res.status(400).json({
        error: "Registration failed. Email or username may already be in use.",
      });
    }

    // Check if username is already taken
    const existingUsernameQuery = `*[_type == "user" && username == $username][0]`;
    const existingUsername = await sanityClient.fetch(existingUsernameQuery, {username});

    if (existingUsername) {
      return res.status(400).json({
        error: "Registration failed. Email or username may already be in use.",
      });
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
        {id: createdUser._id, email: createdUser.email},
        getJwtSecret(),
        {expiresIn: JWT_EXPIRES_IN, algorithm: JWT_ALGORITHM},
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
        error: "Insufficient permissions. The Sanity token needs write permissions. Please create a new token with 'Editor' or 'Admin' role at https://sanity.io/manage",
      });
    }

    // Handle missing token errors
    if (err.message && (err.message.includes("token") || err.message.includes("authentication"))) {
      return res.status(500).json({
        error: "Authentication error. Please check your Sanity token configuration.",
      });
    }

    // Handle validation errors from Sanity
    if (err.statusCode === 400) {
      return res.status(400).json({
        error: err.message || "Invalid data provided.",
      });
    }

    res.status(500).json({error: "Server error. Please try again later."});
  }
};

// Login Controller
const loginUser = async (req, res) => {
  // Define validation schema using Joi
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(1).max(128).required(),
  });

  // Validate request body against schema
  const {error} = schema.validate(req.body);
  if (error) {
    return res.status(400).json({error: error.details[0].message});
  }

  const {email, password} = req.body;

  try {
    const sanityClient = req.sanityClient;

    // Check if user with the provided email exists
    const userQuery = `*[_type == "user" && email == $email][0]`;
    const user = await sanityClient.fetch(userQuery, {email});

    if (!user) {
      return res.status(400).json({error: "Invalid email or password."});
    }

    // Compare provided password with stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({error: "Invalid email or password."});
    }

    // Generate JWT token
    const token = jwt.sign(
        {id: user._id, email: user.email},
        getJwtSecret(),
        {expiresIn: JWT_EXPIRES_IN, algorithm: JWT_ALGORITHM},
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
    res.status(500).json({error: "Server error. Please try again later."});
  }
};

const getProfile = async (req, res) => {
  try {
    const sanityClient = req.sanityClient;
    const user = await fetchUserById(sanityClient, req.user.id);

    if (!user) {
      return res.status(404).json({error: "User not found."});
    }

    return res.status(200).json({user: formatUser(user)});
  } catch (err) {
    console.error("Get Profile Error:", err);
    return res.status(500).json({error: "Server error. Please try again later."});
  }
};

const refreshSession = async (req, res) => {
  try {
    const sanityClient = req.sanityClient;
    const user = await fetchUserById(sanityClient, req.user.id);

    if (!user) {
      return res.status(404).json({error: "User not found."});
    }

    const token = jwt.sign(
        {id: user._id, email: user.email},
        getJwtSecret(),
        {expiresIn: JWT_EXPIRES_IN, algorithm: JWT_ALGORITHM},
    );

    return res.status(200).json({user: formatUser(user), token});
  } catch (err) {
    console.error("Refresh Session Error:", err);
    return res.status(500).json({error: "Server error. Please try again later."});
  }
};

const updateProfile = async (req, res) => {
  const schema = Joi.object({
    username: Joi.string().min(3).max(30),
    title: Joi.string().max(80).allow(""),
    bio: Joi.string().max(500).allow(""),
    profileImageUrl: Joi.string().uri({scheme: ["http", "https"]}).allow(""),
  }).min(1);

  const {error} = schema.validate(req.body);
  if (error) {
    return res.status(400).json({error: error.details[0].message});
  }

  const {username, title, bio, profileImageUrl} = req.body;

  try {
    const sanityClient = req.sanityClient;
    const currentUser = await fetchUserById(sanityClient, req.user.id);

    if (!currentUser) {
      return res.status(404).json({error: "User not found."});
    }

    const patch = {};

    if (username !== undefined) {
      if (username !== currentUser.username) {
        const existingUsernameQuery =
          `*[_type == "user" && username == $username && _id != $userId][0]`;
        const existingUsername = await sanityClient.fetch(existingUsernameQuery, {
          username,
          userId: req.user.id,
        });

        if (existingUsername) {
          return res.status(400).json({error: "Username is already taken."});
        }
      }
      patch.username = username;
    }

    if (title !== undefined) {
      patch.title = title.trim();
    }

    if (bio !== undefined) {
      patch.bio = bio.trim();
    }

    if (profileImageUrl !== undefined) {
      patch.profileImageUrl = profileImageUrl.trim();
    }

    const updatedUser = await sanityClient
        .patch(req.user.id)
        .set(patch)
        .commit({returnDocuments: "true"});

    const userDoc = updatedUser.results?.[0]?.document || {...currentUser, ...patch};

    return res.status(200).json({user: formatUser(userDoc)});
  } catch (err) {
    console.error("Update Profile Error:", err);
    return res.status(500).json({error: "Server error. Please try again later."});
  }
};

const getPublicProfile = async (req, res) => {
  const {userId} = req.params;
  const viewerId = req.user.id;

  try {
    const sanityClient = req.sanityClient;
    const user = await fetchUserById(sanityClient, userId);

    if (!user) {
      return res.status(404).json({error: "User not found."});
    }

    const layoutsQuery = `*[_type == "layout" && visibility == "published" && userId == $userId]
      | order(publishedAt desc) {
        _id,
        name,
        description,
        objects,
        publishedAt
      }`;
    const publishedLayouts = await sanityClient.fetch(layoutsQuery, {userId});

    const connectionStatus = viewerId !== userId ?
      await getConnectionStatus(sanityClient, viewerId, userId) :
      "none";

    let pendingRequestId = null;
    if (connectionStatus === "pending_incoming") {
      const pendingQuery = [
        "*[_type == \"connection\" && status == \"pending\"",
        "&& userId == $userId && connectedUserId == $viewerId][0]._id",
      ].join(" ");
      pendingRequestId = await sanityClient.fetch(
          pendingQuery,
          {userId, viewerId},
      );
    }

    return res.status(200).json({
      profile: formatPublicProfile(user),
      publishedLayouts: publishedLayouts.map((layout) => ({
        _id: layout._id,
        layoutId: layout._id,
        name: layout.name,
        description: layout.description,
        objects: layout.objects || [],
        publishedAt: layout.publishedAt,
      })),
      isOwnProfile: viewerId === userId,
      isConnected: connectionStatus === "connected",
      connectionStatus,
      pendingRequestId,
    });
  } catch (err) {
    console.error("Get Public Profile Error:", err);
    return res.status(500).json({error: "Server error. Please try again later."});
  }
};

const uploadProfileImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({error: "No image uploaded."});
  }

  const ext = req.file.originalname.toLowerCase().slice(req.file.originalname.lastIndexOf("."));
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return res.status(400).json({error: "Only JPEG, PNG, GIF, and WebP images are allowed."});
  }

  const userId = req.user.id;
  const safeName = `${uuidv4()}${ext}`;

  try {
    const sanityClient = req.sanityClient;
    const currentUser = await fetchUserById(sanityClient, userId);

    if (!currentUser) {
      return res.status(404).json({error: "User not found."});
    }

    let profileImageUrl = null;
    let storage = "local";

    if (sanityClient && process.env.SANITY_TOKEN) {
      try {
        const asset = await sanityClient.assets.upload("image", req.file.buffer, {
          filename: safeName,
          contentType,
        });
        profileImageUrl = asset.url;
        storage = "sanity";
      } catch (err) {
        console.warn("Sanity profile image upload failed, using local storage:", err.message);
      }
    }

    if (!profileImageUrl) {
      saveLocalProfileImage(userId, req.file.buffer, safeName);
      profileImageUrl = buildProfilePublicUrl(req, userId, safeName);
    }

    deleteLocalProfileImageIfOwned(userId, currentUser.profileImageUrl);

    const updatedUser = await sanityClient
        .patch(userId)
        .set({profileImageUrl})
        .commit({returnDocuments: "true"});

    const userDoc = updatedUser.results?.[0]?.document || {...currentUser, profileImageUrl};

    return res.status(201).json({
      profileImageUrl,
      storage,
      user: formatUser(userDoc),
    });
  } catch (err) {
    console.error("Upload Profile Image Error:", err);
    return res.status(500).json({error: "Failed to upload profile image. Please try again."});
  }
};

const changePassword = async (req, res) => {
  const schema = Joi.object({
    currentPassword: Joi.string().min(1).max(128).required(),
    newPassword: Joi.string().min(8).max(128).required(),
  });

  const {error} = schema.validate(req.body);
  if (error) {
    return res.status(400).json({error: error.details[0].message});
  }

  const {currentPassword, newPassword} = req.body;

  if (currentPassword === newPassword) {
    return res.status(400).json({
      error: "New password must be different from your current password.",
    });
  }

  try {
    const sanityClient = req.sanityClient;
    const user = await fetchUserById(sanityClient, req.user.id);

    if (!user) {
      return res.status(404).json({error: "User not found."});
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({error: "Current password is incorrect."});
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await sanityClient.patch(req.user.id).set({password: hashedPassword}).commit();

    return res.status(200).json({message: "Password updated successfully."});
  } catch (err) {
    console.error("Change Password Error:", err);
    return res.status(500).json({error: "Server error. Please try again later."});
  }
};

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  refreshSession,
  updateProfile,
  uploadProfileImage,
  changePassword,
  getPublicProfile,
};
