import express from "express";
import ImportController from "../controllers/ImportController.js";
import asyncHandler from "../middleware/asyncHandler.js";

const router = express.Router();
const importController = new ImportController();

router.post(
  "/json",
  asyncHandler(importController.importJson.bind(importController))
);
router.post(
  "/multiple",
  asyncHandler(importController.importMultiple.bind(importController))
);

export default router;
