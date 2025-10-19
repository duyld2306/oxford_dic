import express from "express";
import FlashcardGroupController from "../controllers/FlashcardGroupController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { validateBody, flashcardSchemas } from "../validators/index.js";
import Joi from "joi";

const router = express.Router();
const flashcardGroupController = new FlashcardGroupController();

// All flashcard group routes require authentication
router.use(authMiddleware);

// GET /api/flashcard-groups - Get all flashcard groups
router.get("/", flashcardGroupController.getFlashcardGroups);

// POST /api/flashcard-groups/:id/sync - Sync from group_word
router.post(
  "/:id/sync",
  validateBody(
    Joi.object({
      group_word_id: Joi.string().required(),
    })
  ),
  flashcardGroupController.syncFromGroupWord
);

// GET /api/flashcard-groups/:id - Get flashcard group details
router.get("/:id", flashcardGroupController.getFlashcardGroupById);

// POST /api/flashcard-groups - Create new flashcard group
router.post(
  "/",
  validateBody(flashcardSchemas.createGroup),
  flashcardGroupController.createFlashcardGroup
);

// PUT /api/flashcard-groups/:id - Update flashcard group
router.put(
  "/:id",
  validateBody(flashcardSchemas.updateGroup),
  flashcardGroupController.updateFlashcardGroup
);

// DELETE /api/flashcard-groups/:id - Delete flashcard group
router.delete("/:id", flashcardGroupController.deleteFlashcardGroup);

export default router;

