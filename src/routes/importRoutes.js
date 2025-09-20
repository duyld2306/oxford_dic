import express from "express";
import ImportController from "../controllers/ImportController.js";

const router = express.Router();
const importController = new ImportController();

// POST /api/import/json - Import single JSON file
router.post("/json", (req, res) => importController.importJson(req, res));

// POST /api/import/multiple - Import multiple JSON files from directory
router.post("/multiple", (req, res) =>
  importController.importMultiple(req, res)
);

// GET /api/import/status - Get import status and available files
router.get("/status", (req, res) => importController.getStatus(req, res));

export default router;
