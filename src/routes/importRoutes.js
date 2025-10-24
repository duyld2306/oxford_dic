import express from "express";
import ImportController from "../controllers/ImportController.js";
import asyncHandler from "../middleware/asyncHandler.js";
import authMiddleware, {
  adminMiddleware,
} from "../middleware/authMiddleware.js";

const router = express.Router();
const importController = new ImportController();

// All flashcard group routes require authentication
router.use(authMiddleware);

router.post(
  "/json",
  adminMiddleware,
  asyncHandler(importController.importJson.bind(importController))
);
router.post(
  "/multiple",
  adminMiddleware,
  asyncHandler(importController.importMultiple.bind(importController))
);

export default router;
