import express from "express";
import NoteController from "../controllers/NoteController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  validateBody,
  validateParams,
  validateQuery,
  wordSchemas,
} from "../validators/index.js";

const router = express.Router();
const noteController = new NoteController();

// GET /api/notes
router.get(
  "/",
  authMiddleware,
  validateQuery(wordSchemas.noteList),
  noteController.list
);

// GET /api/notes/:id
router.get(
  "/:id",
  authMiddleware,
  validateParams(wordSchemas.noteIdParam),
  noteController.get
);

// POST /api/notes
router.post(
  "/",
  authMiddleware,
  validateBody(wordSchemas.noteCreate),
  noteController.create
);

// PUT /api/notes/:id
router.put(
  "/:id",
  authMiddleware,
  validateParams(wordSchemas.noteIdParam),
  validateBody(wordSchemas.noteUpdate),
  noteController.update
);

// DELETE /api/notes/:id
router.delete(
  "/:id",
  authMiddleware,
  validateParams(wordSchemas.noteIdParam),
  noteController.remove
);

export default router;
