const Joi = require("joi");

const layoutObjectSchema = Joi.object({
  id: Joi.string().required(),
  type: Joi.string().max(50).required(),
  name: Joi.string().max(200).allow("").optional(),
  color: Joi.string().max(32).optional(),
  assetUrl: Joi.string().uri({allowRelative: false}).allow("").optional(),
  opacity: Joi.number().min(0).max(1).optional(),
  notes: Joi.string().max(10000).allow("").optional(),
  properties: Joi.array().items(
      Joi.object({
        key: Joi.string().max(200).allow(""),
        value: Joi.string().max(2000).allow(""),
      }),
  ).max(100).optional(),
  log: Joi.array().items(
      Joi.object({
        message: Joi.string().max(5000).required(),
        createdAt: Joi.string().max(64).required(),
      }),
  ).max(500).optional(),
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
});

const hexColorSchema = Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/);

const sceneSettingsSchema = Joi.object({
  backgroundColor: hexColorSchema.optional(),
  groundColor: hexColorSchema.optional(),
  skyColor: hexColorSchema.optional(),
  lightColor: hexColorSchema.optional(),
  lightIntensity: Joi.number().min(0.2).max(3).optional(),
  ambientIntensity: Joi.number().min(0).max(1.5).optional(),
  accentColor: hexColorSchema.optional(),
  fillLightColor: hexColorSchema.optional(),
  fogEnabled: Joi.boolean().optional(),
});

const layoutDimensionsSchema = Joi.object({
  width: Joi.number().min(4).max(200).optional(),
  depth: Joi.number().min(4).max(200).optional(),
  height: Joi.number().min(4).max(100).optional(),
  unit: Joi.string().valid("ft", "m").optional(),
  roomShape: Joi.string().valid(
      "rectangle",
      "square",
      "l-ne",
      "l-nw",
      "l-se",
      "l-sw",
      "t-north",
      "u-north",
      "octagon",
  ).optional(),
  wallsEnabled: Joi.boolean().optional(),
  wallColor: hexColorSchema.optional(),
  wallThickness: Joi.number().min(0.05).max(1).optional(),
  floorplanUrl: Joi.string().max(2000).allow("").optional(),
  floorplanVisible: Joi.boolean().optional(),
  floorplanOpacity: Joi.number().min(0.1).max(1).optional(),
  floorplanRotation: Joi.number().min(-180).max(180).optional(),
  floorplanOffsetX: Joi.number().min(-50).max(50).optional(),
  floorplanOffsetZ: Joi.number().min(-50).max(50).optional(),
});

const createLayoutSchema = Joi.object({
  name: Joi.string().max(200).required(),
  description: Joi.string().max(2000).required(),
  objects: Joi.array().items(layoutObjectSchema).max(500).required(),
  layoutDimensions: layoutDimensionsSchema.optional(),
  sceneSettings: sceneSettingsSchema.optional(),
});

const updateLayoutSchema = Joi.object({
  name: Joi.string().max(200).trim().optional(),
  description: Joi.string().max(2000).allow("").optional(),
  objects: Joi.array().items(layoutObjectSchema).max(500).optional(),
  sceneSettings: sceneSettingsSchema.optional(),
  layoutDimensions: layoutDimensionsSchema.optional(),
}).min(1);

module.exports = {
  layoutObjectSchema,
  createLayoutSchema,
  updateLayoutSchema,
  sceneSettingsSchema,
  layoutDimensionsSchema,
};
