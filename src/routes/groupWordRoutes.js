import express from "express";
import GroupWordController from "../controllers/GroupWordController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { validateBody, groupWordSchemas } from "../validators/index.js";
import Joi from "joi";

const router = express.Router();
const groupWordController = new GroupWordController();

// All group_word routes require authentication
router.use(authMiddleware);

// GET /api/group-words - Get all group_words
router.get("/", groupWordController.getGroupWords);

// POST /api/group-words - Create new group_word
router.post(
  "/",
  validateBody(groupWordSchemas.create),
  groupWordController.createGroupWord
);

// GET /api/group-words/favorites - Get favorites (must be before /:id)
router.get("/favorites", groupWordController.getFavorites);

// POST /api/group-words/favorites - Add word to group (must be before /:id)
router.post(
  "/favorites",
  validateBody(
    Joi.object({
      group_word_id: Joi.string().required(),
      word_id: Joi.string().required(),
    })
  ),
  groupWordController.addFavorite
);

// DELETE /api/group-words/favorites - Remove word from group (must be before /:id)
router.delete(
  "/favorites",
  validateBody(
    Joi.object({
      group_word_id: Joi.string().required(),
      word_id: Joi.string().required(),
    })
  ),
  groupWordController.removeFavorite
);

// GET /api/group-words/by-word/:word_id - Get group word IDs containing this word (must be before /:id)
router.get("/by-word/:word_id", groupWordController.getGroupWordsByWordId);

// PUT /api/group-words/:id - Update group_word
router.put(
  "/:id",
  validateBody(groupWordSchemas.update),
  groupWordController.updateGroupWord
);

// DELETE /api/group-words/:id - Delete group_word
router.delete("/:id", groupWordController.deleteGroupWord);

export default router;
