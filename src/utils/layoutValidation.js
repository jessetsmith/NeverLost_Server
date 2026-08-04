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

const createLayoutSchema = Joi.object({
  name: Joi.string().max(200).required(),
  description: Joi.string().max(2000).required(),
  objects: Joi.array().items(layoutObjectSchema).max(500).required(),
});

const updateLayoutSchema = Joi.object({
  name: Joi.string().max(200).trim().optional(),
  description: Joi.string().max(2000).allow("").optional(),
  objects: Joi.array().items(layoutObjectSchema).max(500).optional(),
}).min(1);

module.exports = {layoutObjectSchema, createLayoutSchema, updateLayoutSchema};
