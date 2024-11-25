const { v4: uuidv4 } = require("uuid");
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
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { name, description, objects } = req.body;
  const userId = req.user.id; // Assuming user ID is available in the request

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
    await sanityClient.create(newLayout);

    // Respond with the new layout's ID
    res.status(201).json({ layoutId: newLayout._id });
  } catch (err) {
    console.error("Create Layout Error:", err);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};

// Define other controllers if needed
const getLayoutById = async (req, res) => {
  // Implementation here
};

const updateLayout = async (req, res) => {
  const { layoutId } = req.params;
  const { objects } = req.body; // Ensure objects are being received
  const userId = req.user.id;

  try {
    const sanityClient = req.sanityClient;

    const existingLayout = await sanityClient.getDocument(layoutId);
    if (!existingLayout || existingLayout.userId !== userId) {
      return res
        .status(404)
        .json({ error: "Layout not found or access denied." });
    }

    const updatedLayout = {
      ...existingLayout,
      objects: objects || existingLayout.objects, // Update objects
    };

    await sanityClient.patch(layoutId).set(updatedLayout).commit();

    res.status(200).json(updatedLayout);
  } catch (err) {
    console.error("Update Layout Error:", err);
    res.status(500).json({ error: "Server error. Please try again later." });
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
    const layouts = await sanityClient.fetch(query, { userId });

    res.status(200).json(layouts);
  } catch (err) {
    console.error("Get All Layouts Error:", err);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};

module.exports = {
  createLayout,
  getLayoutById,
  updateLayout,
  deleteLayout,
  getAllLayouts, // Add this export
};
