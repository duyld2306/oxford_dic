import express from "express";
import FlashcardController from "../controllers/FlashcardController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { validateBody, flashcardSchemas } from "../validators/index.js";
import Joi from "joi";

const router = express.Router();
const flashcardController = new FlashcardController();

// All flashcard routes require authentication
router.use(authMiddleware);

// POST /api/flashcard-groups/:flashcard_group_id/flashcards - Add word(s) to flashcard group
router.post(
  "/:flashcard_group_id/flashcards",
  validateBody(
    Joi.object({
      word_ids: Joi.array().items(Joi.string()).min(1).required(),
    })
  ),
  flashcardController.addFlashcard
);

// DELETE /api/flashcard-groups/flashcards/:flashcard_id - Remove flashcard
router.delete("/flashcards/:flashcard_id", flashcardController.removeFlashcard);

// PUT /api/flashcard-groups/flashcards/:flashcard_id/status - Update flashcard status
router.put(
  "/flashcards/:flashcard_id/status",
  validateBody(flashcardSchemas.updateStatus),
  flashcardController.updateFlashcardStatus
);

export default router;
