// src/Validations/reviewValidations.js
const Joi = require("joi");

const addReviewSchema = Joi.object({
  product_id: Joi.number().integer().positive().required(),
  order_id: Joi.number().integer().positive().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().max(1000).allow("").optional(),
});

module.exports = {
  addReviewSchema,
};
