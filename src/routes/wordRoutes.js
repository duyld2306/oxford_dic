import express from "express";
import WordController from "../controllers/WordController.js";
import asyncHandler from "../middleware/asyncHandler.js";

const router = express.Router();
const wordController = new WordController();

router.get("/lookup", asyncHandler(wordController.lookup.bind(wordController)));
router.post(
  "/examples/vi",
  asyncHandler(wordController.getExamplesVi.bind(wordController))
);
router.post(
  "/examples/vi/update",
  asyncHandler(wordController.updateExamplesVi.bind(wordController))
);
router.get("/search", asyncHandler(wordController.search.bind(wordController)));

export default router;
