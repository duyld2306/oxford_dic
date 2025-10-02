import express from "express";
import TranslateController from "../controllers/TranslateController.js";
import asyncHandler from "../middleware/asyncHandler.js";

const router = express.Router();
const ctrl = new TranslateController();

router.post("/", asyncHandler(ctrl.translate.bind(ctrl)));
router.post("/bulk", asyncHandler(ctrl.translateBulk.bind(ctrl)));

export default router;
