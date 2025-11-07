const Joi = require('joi');

const emailSchema = Joi.string().trim().lowercase().email({ tlds: { allow: false } });
const passwordSchema = Joi.string()
  .min(10)
  .max(128)
  .pattern(/[A-Z]/, 'au moins une lettre majuscule')
  .pattern(/[a-z]/, 'au moins une lettre minuscule')
  .pattern(/[0-9]/, 'au moins un chiffre')
  .pattern(/[^A-Za-z0-9]/, 'au moins un caractère spécial')
  .messages({
    'string.min': 'Le mot de passe doit contenir au moins 10 caractères.',
    'string.pattern.base': 'Le mot de passe doit inclure une majuscule, une minuscule, un chiffre et un caractère spécial.'
  });

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

const commandSchema = Joi.string()
  .trim()
  .min(1)
  .max(64)
  .pattern(/^[\w\-#/\. ]+$/i, 'commande valide');

const machineSchema = Joi.object({
  uuid: Joi.string().trim().guid({ version: 'uuidv4' }).required(),
  name: Joi.string().trim().min(2).max(100).required(),
  baudRate: Joi.number().integer().min(1).max(1000000).optional(),
  port: Joi.string().trim().max(100).allow(null, '').optional(),
  infoCommands: Joi.array()
    .items(commandSchema)
    .min(1)
    .max(10)
    .optional()
});

module.exports = {
  loginSchema,
  registerSchema,
  updatePseudoSchema,
  changePasswordSchema,
  machineSchema
};
