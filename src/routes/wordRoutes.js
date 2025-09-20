import express from "express";
import WordController from "../controllers/WordController.js";

const router = express.Router();
const wordController = new WordController();

// GET /api/lookup?word=hang - Lookup exact word
router.get("/lookup", (req, res) => wordController.lookup(req, res));

// GET /api/search?q=hang&type=prefix - Search words by prefix
// GET /api/search?q=hang&type=text - Full text search
router.get("/search", (req, res) => wordController.search(req, res));

// GET /api/stats - Get word statistics
router.get("/stats", (req, res) => wordController.getStats(req, res));

export default router;
