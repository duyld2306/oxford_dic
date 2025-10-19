import express from "express";
import WordController from "../controllers/WordController.js";
import { optionalAuthMiddleware } from "../middleware/authMiddleware.js";
import {
  validateQuery,
  validateBody,
  wordSchemas,
} from "../validators/index.js";

const router = express.Router();
const wordController = new WordController();

// GET /api/lookup?word=hang
router.get("/lookup", validateQuery(wordSchemas.lookup), wordController.lookup);

// GET /api/list-words?page=1&per_page=100&q=&symbol=&parts_of_speech=
router.get(
  "/list-words",
  optionalAuthMiddleware,
  validateQuery(wordSchemas.listWords),
  wordController.listAll
);

// GET /api/list-words-for-search?q=hang&current=1&limit=20
router.get(
  "/list-words-for-search",
  validateQuery(wordSchemas.listWordsForSearch),
  wordController.listWordsForSearch
);

// GET /api/parts-of-speech
router.get("/parts-of-speech", wordController.getPartsOfSpeech);

// POST /api/examples/vi
router.post(
  "/examples/vi",
  validateBody(wordSchemas.getExamplesVi),
  wordController.getExamplesVi
);

// POST /api/examples/vi/update
router.post(
  "/examples/vi/update",
  validateBody(wordSchemas.updateExamplesVi),
  wordController.updateExamplesVi
);

// GET /api/search?q=hang&current=1&limit=20&type=word
router.get("/search", validateQuery(wordSchemas.search), wordController.search);

// POST /api/senses/definition
router.post("/senses/definition", wordController.updateSenseDefinitions);

// POST /api/senses/definition/short
router.post("/senses/definition/short", wordController.getSenseDefinitionShort);

export default router;
