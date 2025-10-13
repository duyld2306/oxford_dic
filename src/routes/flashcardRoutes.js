import express from "express";
import FlashcardController from "../controllers/FlashcardController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();
const flashcardController = new FlashcardController();

// All flashcard routes require authentication
router.use(authMiddleware);

// Flashcard Groups
// GET /api/users/flashcard_groups - Get all flashcard groups
router.get("/flashcard_groups", flashcardController.getFlashcardGroups);

// POST /api/users/flashcard_groups/sync_from_group_word/:group_word_id - Sync from group_word
router.post(
  "/flashcard_groups/sync_from_group_word/:group_word_id",
  flashcardController.syncFromGroupWord
);

// GET /api/users/flashcard_groups/:id - Get flashcard group details
router.get("/flashcard_groups/:id", flashcardController.getFlashcardGroupById);

// POST /api/users/flashcard_groups - Create new flashcard group
router.post("/flashcard_groups", flashcardController.createFlashcardGroup);

// PUT /api/users/flashcard_groups/:id - Update flashcard group
router.put("/flashcard_groups/:id", flashcardController.updateFlashcardGroup);

// DELETE /api/users/flashcard_groups/:id - Delete flashcard group
router.delete(
  "/flashcard_groups/:id",
  flashcardController.deleteFlashcardGroup
);

// Flashcards
// POST /api/users/flashcards - Add word to flashcard group
router.post("/flashcards", flashcardController.addFlashcard);

// DELETE /api/users/flashcards - Remove word from flashcard group
router.delete("/flashcards", flashcardController.removeFlashcard);

// PUT /api/users/flashcards/:id/status - Update flashcard status
router.put("/flashcards/:id/status", flashcardController.updateFlashcardStatus);

export default router;

