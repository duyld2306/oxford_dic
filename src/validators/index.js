/**
 * Validation Schemas
 * Centralized validation using Joi
 * Provides reusable validation schemas for all endpoints
 */

import Joi from "joi";
import {
  USER_ROLES,
  USER_GENDERS,
  FLASHCARD_STATUS,
  WORD_SYMBOLS,
  FLASHCARD_GROUP_SOURCE_TYPES,
  ERROR_CODES,
} from "../constants/index.js";

// ============================================
// Common Schemas
// ============================================

export const commonSchemas = {
  objectId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .message("Invalid ObjectId format"),
  email: Joi.string().email().lowercase().trim(),
  password: Joi.string().min(6).max(100),
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    per_page: Joi.number().integer().min(1).max(1000).default(100),
  }),
  search: Joi.object({
    q: Joi.string().trim().allow(""),
  }),
};

// ============================================
// User Validation Schemas
// ============================================

export const userSchemas = {
  register: Joi.object({
    email: commonSchemas.email.required(),
    password: commonSchemas.password.required(),
    fullname: Joi.string().trim().min(1).max(200).required(),
    gender: Joi.string()
      .valid(...Object.values(USER_GENDERS))
      .optional(),
    phone: Joi.string()
      .pattern(/^[0-9]{10,15}$/)
      .optional(),
  }),

  login: Joi.object({
    email: commonSchemas.email.required(),
    password: Joi.string().required(),
  }),

  updateProfile: Joi.object({
    fullname: Joi.string().trim().min(1).max(200).optional(),
    gender: Joi.string()
      .valid(...Object.values(USER_GENDERS))
      .optional(),
    phone_number: Joi.string()
      .pattern(/^[0-9]{10,15}$/)
      .optional(),
    avatar: Joi.string().uri().optional(),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: commonSchemas.password.required(),
    confirmPassword: Joi.string()
      .required()
      .valid(Joi.ref("newPassword"))
      .messages({
        "any.only": "Confirm password must match new password",
      }),
  }),

  updateUser: Joi.object({
    fullname: Joi.string().trim().min(1).max(200).optional(),
    gender: Joi.string()
      .valid(...Object.values(USER_GENDERS))
      .optional(),
    phone: Joi.string()
      .pattern(/^[0-9]{10,15}$/)
      .optional(),
    role: Joi.string()
      .valid(...Object.values(USER_ROLES))
      .optional(),
  }),

  setVerified: Joi.object({
    user_id: commonSchemas.objectId.required(),
    is_verified: Joi.boolean().required(),
  }),
};

// ============================================
// Group Word Validation Schemas
// ============================================

export const groupWordSchemas = {
  create: Joi.object({
    name: Joi.string().trim().min(1).max(200).required(),
    description: Joi.string().trim().max(1000).optional().allow(""),
  }),

  update: Joi.object({
    name: Joi.string().trim().min(1).max(200).optional(),
    description: Joi.string().trim().max(1000).optional().allow(""),
  }),

  addWord: Joi.object({
    group_word_id: commonSchemas.objectId.required(),
    word_id: Joi.string().trim().min(1).required(),
  }),

  removeWord: Joi.object({
    group_word_id: commonSchemas.objectId.required(),
    word_id: Joi.string().trim().min(1).required(),
  }),

  addWords: Joi.object({
    group_word_id: commonSchemas.objectId.required(),
    word_ids: Joi.array().items(Joi.string().trim().min(1)).min(1).required(),
  }),

  removeWords: Joi.object({
    group_word_id: commonSchemas.objectId.required(),
    word_ids: Joi.array().items(Joi.string().trim().min(1)).min(1).required(),
  }),
};

// ============================================
// Category Validation Schemas
// ============================================

export const categorySchemas = {
  create: Joi.object({
    name: Joi.string().trim().min(1).max(200).required(),
    description: Joi.string().trim().max(1000).optional().allow(""),
  }),

  update: Joi.object({
    name: Joi.string().trim().min(1).max(200).optional(),
    description: Joi.string().trim().max(1000).optional().allow(""),
  }),

  addWord: Joi.object({
    category_id: commonSchemas.objectId.required(),
    word_id: Joi.string().trim().min(1).required(),
  }),

  removeWord: Joi.object({
    category_id: commonSchemas.objectId.required(),
    word_id: Joi.string().trim().min(1).required(),
  }),

  addWords: Joi.object({
    category_id: commonSchemas.objectId.required(),
    word_ids: Joi.array().items(Joi.string().trim().min(1)).min(1).required(),
  }),

  removeWords: Joi.object({
    category_id: commonSchemas.objectId.required(),
    word_ids: Joi.array().items(Joi.string().trim().min(1)).min(1).required(),
  }),
};

// ============================================
// Flashcard Validation Schemas
// ============================================

export const flashcardSchemas = {
  createGroup: Joi.object({
    name: Joi.string().trim().min(1).max(200).required(),
    description: Joi.string().trim().max(1000).optional().allow(""),
    source_type: Joi.string()
      .valid(...Object.values(FLASHCARD_GROUP_SOURCE_TYPES))
      .optional(),
  }),

  updateGroup: Joi.object({
    name: Joi.string().trim().min(1).max(200).optional(),
    description: Joi.string().trim().max(1000).optional().allow(""),
  }),

  addFlashcard: Joi.object({
    flashcard_group_id: commonSchemas.objectId.required(),
    word_id: Joi.string().trim().min(1).required(),
  }),

  removeFlashcard: Joi.object({
    flashcard_group_id: commonSchemas.objectId.required(),
    word_id: Joi.string().trim().min(1).required(),
  }),

  updateStatus: Joi.object({
    status: Joi.string()
      .valid(...Object.values(FLASHCARD_STATUS))
      .required(),
  }),

  review: Joi.object({
    action: Joi.string().valid("remember", "forget").required(),
  }),
};

// ============================================
// Word Validation Schemas
// ============================================

export const wordSchemas = {
  lookup: Joi.object({
    word: Joi.string().trim().min(1).required(),
  }),

  search: Joi.object({
    q: Joi.string().trim().min(1).required(),
    page: Joi.number().integer().min(1).default(1),
    per_page: Joi.number().integer().min(1).max(100).default(100),
    type: Joi.string().valid("word", "idiom").default("word"),
  }),

  listWordsForSearch: Joi.object({
    q: Joi.string().trim().allow("").default(""),
    page: Joi.number().integer().min(1).default(1),
    per_page: Joi.number().integer().min(1).max(100).default(100),
  }),

  listWords: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    per_page: Joi.number().integer().min(1).max(1000).default(100),
    q: Joi.string().trim().allow("").optional(),
    symbol: Joi.string()
      .valid(...Object.values(WORD_SYMBOLS))
      .optional(),
    parts_of_speech: Joi.string().optional(), // JSON string
  }),

  getExamplesVi: Joi.object({
    ids: Joi.array().items(Joi.string().trim()).min(1).required(),
  }),

  updateExamplesVi: Joi.object({
    updates: Joi.array()
      .items(
        Joi.object({
          id: Joi.string().trim().required(),
          example_vi: Joi.string().trim().required(),
        })
      )
      .min(1)
      .required(),
  }),
};

// ============================================
// Validation Middleware Factory
// ============================================

/**
 * Create validation middleware for request body
 */
export const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      // Return detailed error message with first error
      const firstError = errors[0];
      const errorMessage = firstError.message;

      return res.status(400).json({
        success: false,
        status_code: 400,
        data: null,
        meta: null,
        message: errorMessage,
        error_code: ERROR_CODES.VALIDATION_ERROR,
        errors,
      });
    }

    // Store validated value in req.validatedBody instead of overwriting req.body
    req.validatedBody = value;
    next();
  };
};

/**
 * Create validation middleware for query parameters
 */
export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, { abortEarly: false });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      // Return detailed error message with first error
      const firstError = errors[0];
      const errorMessage = firstError.message;

      return res.status(400).json({
        success: false,
        status_code: 400,
        data: null,
        meta: null,
        message: errorMessage,
        error_code: ERROR_CODES.VALIDATION_ERROR,
        errors,
      });
    }

    // Store validated value in req.validatedQuery instead of overwriting req.query
    req.validatedQuery = value;
    next();
  };
};

/**
 * Create validation middleware for route params
 */
export const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, { abortEarly: false });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      // Return detailed error message with first error
      const firstError = errors[0];
      const errorMessage = firstError.message;

      return res.status(400).json({
        success: false,
        status_code: 400,
        data: null,
        meta: null,
        message: errorMessage,
        error_code: ERROR_CODES.VALIDATION_ERROR,
        errors,
      });
    }

    // Store validated value in req.validatedParams instead of overwriting req.params
    req.validatedParams = value;
    next();
  };
};

export default {
  commonSchemas,
  userSchemas,
  groupWordSchemas,
  categorySchemas,
  flashcardSchemas,
  wordSchemas,
  validateBody,
  validateQuery,
  validateParams,
};
