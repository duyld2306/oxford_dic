import express from "express";
import WordController from "../controllers/WordController.js";

const router = express.Router();
const wordController = new WordController();

// GET /api/lookup?word=hang - Lookup exact word
router.get("/lookup", (req, res) => wordController.lookup(req, res));

router.post("/examples/vi", (req, res) =>
  wordController.getExamplesVi(req, res)
);
router.post("/examples/vi/update", (req, res) =>
  wordController.updateExamplesVi(req, res)
);

// GET /api/search?q=hang&type=prefix - Search words by prefix
// GET /api/search?q=hang&type=text - Full text search
router.get("/search", (req, res) => wordController.search(req, res));

export default router;
