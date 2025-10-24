import express from "express";
import TranslateController from "../controllers/TranslateController.js";
import { validateBody } from "../validators/index.js";
import Joi from "joi";

const router = express.Router();
const translateController = new TranslateController();

// Validation schema - same for all translate endpoints
const translateValidation = Joi.object({
  word: Joi.string().required(),
  pos: Joi.string().allow("").optional(),
  senses: Joi.array().default([]),
  idioms: Joi.array().default([]),
  phrasal_verb_senses: Joi.array().default([]),
}).unknown(true); // Allow other fields from word object

// POST /api/translate/definition - Translate only definitions
router.post(
  "/definition",
  validateBody(translateValidation),
  translateController.translateDefinition
);

// POST /api/translate/example - Translate only examples
router.post(
  "/example",
  validateBody(translateValidation),
  translateController.translateExample
);

// POST /api/translate/parallel - Translate definitions and examples in parallel (2 API calls)
router.post(
  "/parallel",
  validateBody(translateValidation),
  translateController.translateParallel
);

export default router;
