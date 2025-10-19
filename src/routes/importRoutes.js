import express from "express";
import ImportController from "../controllers/ImportController.js";
import { adminMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();
const importController = new ImportController();

// POST /api/import/json - Import single JSON file
router.post("/json", adminMiddleware, importController.importJson);

// POST /api/import/multiple - Import multiple JSON files
router.post("/multiple", adminMiddleware, importController.importMultiple);

export default router;
