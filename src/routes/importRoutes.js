import express from "express";
import ImportController from "../controllers/ImportController.js";
import authMiddleware, {
  superadminMiddleware,
} from "../middleware/authMiddleware.js";

const router = express.Router();
const importController = new ImportController();

// All flashcard group routes require authentication
router.use(authMiddleware);

// POST /api/import/json - Import single JSON file
router.post("/json", superadminMiddleware, importController.importJson);

// POST /api/import/multiple - Import multiple JSON files
router.post("/multiple", superadminMiddleware, importController.importMultiple);

export default router;
