const {v4: uuidv4} = require("uuid");
const Joi = require("joi");

// Create Layout Controller
const createLayout = async (req, res) => {
  // Define validation schema using Joi
  const schema = Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
    objects: Joi.array()
        .items(
            Joi.object({
              id: Joi.string().required(),
              type: Joi.string().required(),
              color: Joi.string().required(),
              position: Joi.object({
                x: Joi.number().required(),
                y: Joi.number().required(),
                z: Joi.number().required(),
              }).required(),
              rotation: Joi.object({
                x: Joi.number().required(),
                y: Joi.number().required(),
                z: Joi.number().required(),
              }).required(),
              scale: Joi.object({
                x: Joi.number().required(),
                y: Joi.number().required(),
                z: Joi.number().required(),
              }).required(),
            }),
        )
        .required(),
  });

  // Validate request body against schema
  const {error} = schema.validate(req.body);
  if (error) {
    return res.status(400).json({error: error.details[0].message});
  }

  const {name, description, objects} = req.body;

  // Get user ID from JWT token (set by authenticate middleware)
  const userId = req.user && req.user.id;

  if (!userId) {
    return res.status(401).json({error: "User ID not found in token. Please log in again."});
  }

  try {
    const sanityClient = req.sanityClient;

    // Create a new layout document
    const newLayout = {
      _id: uuidv4(),
      _type: "layout",
      name,
      description,
      userId,
      objects,
    };

    // Save the new layout to Sanity
    const createdLayout = await sanityClient.create(newLayout);

    // Respond with the new layout's ID
    res.status(201).json({layoutId: createdLayout._id || newLayout._id});
  } catch (err) {
    console.error("Create Layout Error:", err);

    // Handle Sanity-specific permission errors
    if (err.statusCode === 403 || (err.details && err.details.type === "mutationError")) {
      return res.status(403).json({
        error: "Insufficient permissions. The Sanity token needs write permissions.",
      });
    }

    // Handle validation errors
    if (err.statusCode === 400) {
      return res.status(400).json({
        error: err.message || "Invalid layout data.",
      });
    }

    res.status(500).json({error: "Server error. Please try again later."});
  }
};

const getLayoutById = async (req, res) => {
  const {layoutId} = req.params;
  const userId = req.user.id;

  try {
    const sanityClient = req.sanityClient;
    const layout = await sanityClient.getDocument(layoutId);

    if (!layout || layout.userId !== userId) {
      return res.status(404).json({error: "Layout not found or access denied."});
    }

    res.status(200).json({
      layoutId: layout._id,
      name: layout.name,
      description: layout.description,
      objects: layout.objects || [],
    });
  } catch (err) {
    console.error("Get Layout By ID Error:", err);
    res.status(500).json({error: "Server error. Please try again later."});
  }
};

const updateLayout = async (req, res) => {
  const {layoutId} = req.params;
  const {objects, name, description} = req.body;
  const userId = req.user.id;

  try {
    const sanityClient = req.sanityClient;

    const existingLayout = await sanityClient.getDocument(layoutId);
    if (!existingLayout || existingLayout.userId !== userId) {
      return res
          .status(404)
          .json({error: "Layout not found or access denied."});
    }

    const patch = {
      objects: objects || existingLayout.objects,
    };

    if (typeof name === "string" && name.trim()) {
      patch.name = name.trim();
    }

    if (typeof description === "string") {
      patch.description = description.trim();
    }

    await sanityClient.patch(layoutId).set(patch).commit();

    res.status(200).json({
      layoutId: existingLayout._id,
      name: patch.name ?? existingLayout.name,
      description: patch.description ?? existingLayout.description,
      objects: patch.objects,
    });
  } catch (err) {
    console.error("Update Layout Error:", err);
    res.status(500).json({error: "Server error. Please try again later."});
  }
};

const deleteLayout = async (req, res) => {
  // Implementation here
};

const getAllLayouts = async (req, res) => {
  const userId = req.user.id; // Assuming user ID is available in the request

  try {
    const sanityClient = req.sanityClient;

    // Fetch all layouts for the user
    const query = `*[_type == "layout" && userId == $userId]`;
    const layouts = await sanityClient.fetch(query, {userId});

    res.status(200).json(layouts);
  } catch (err) {
    console.error("Get All Layouts Error:", err);
    res.status(500).json({error: "Server error. Please try again later."});
  }
};

module.exports = {
  createLayout,
  getLayoutById,
  updateLayout,
  deleteLayout,
  getAllLayouts, // Add this export
};
