import express from "express";
import TranslateController from "../controllers/TranslateController.js";
import { validateBody } from "../validators/index.js";
import Joi from "joi";

const router = express.Router();
const translateController = new TranslateController();

// Validation schemas
const translateValidation = {
  translateWord: Joi.object({
    word: Joi.string().required(),
    pos: Joi.string().allow("").optional(),
    senses: Joi.array().default([]),
    idioms: Joi.array().default([]),
    phrasal_verb_senses: Joi.array().default([]),
  }).unknown(true), // Allow other fields from word object
};

// POST /api/translate/word
router.post(
  "/word",
  validateBody(translateValidation.translateWord),
  translateController.translateWord
);

export default router;
