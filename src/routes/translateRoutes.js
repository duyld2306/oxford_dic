import express from "express";
import TranslateController from "../controllers/TranslateController.js";
import { validateBody } from "../validators/index.js";
import Joi from "joi";

const router = express.Router();
const translateController = new TranslateController();

// Validation schemas
const translateValidation = {
  translate: Joi.object({
    text: Joi.string().required(),
    context: Joi.string().allow("").optional(),
    type: Joi.string().valid("example", "definition").default("example"),
  }),
  translateBulk: Joi.object({
    texts: Joi.array().items(Joi.string()).min(1).required(),
    context: Joi.string().allow("").optional(),
    type: Joi.string().valid("example", "definition").default("example"),
  }),
};

// POST /api/translate
router.post(
  "/",
  validateBody(translateValidation.translate),
  translateController.translate
);

// POST /api/translate/bulk
router.post(
  "/bulk",
  validateBody(translateValidation.translateBulk),
  translateController.translateBulk
);

export default router;
