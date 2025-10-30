const Joi = require('joi');

const emailSchema = Joi.string().trim().lowercase().email({ tlds: { allow: false } });
const passwordSchema = Joi.string().min(6).max(128);

const loginSchema = Joi.object({
  email: emailSchema.required(),
  password: Joi.string().min(1).required()
});

const registerSchema = Joi.object({
  email: emailSchema.required(),
  password: passwordSchema.required(),
  confirmPassword: Joi.string().required(),
  pseudo: Joi.string().trim().min(2).max(100).required()
});

const updatePseudoSchema = Joi.object({
  pseudo: Joi.string().trim().min(2).max(100).required()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(1).required(),
  newPassword: passwordSchema.required(),
  confirmPassword: Joi.string().required()
});

const machineSchema = Joi.object({
  uuid: Joi.string().trim().guid({ version: 'uuidv4' }).required(),
  name: Joi.string().trim().min(2).max(100).required(),
  baudRate: Joi.number().integer().min(1).max(1000000).optional(),
  port: Joi.string().trim().max(100).allow(null, '').optional()
});

module.exports = {
  loginSchema,
  registerSchema,
  updatePseudoSchema,
  changePasswordSchema,
  machineSchema
};
