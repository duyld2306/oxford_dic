import express from "express";
import CategoryController from "../controllers/CategoryController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { validateBody, categorySchemas } from "../validators/index.js";
import Joi from "joi";

const router = express.Router();
const categoryController = new CategoryController();

// All category routes require authentication
router.use(authMiddleware);

// GET /api/categories - Get all categories
router.get("/", categoryController.getCategories);

// POST /api/categories - Create new category
router.post(
  "/",
  validateBody(categorySchemas.create),
  categoryController.createCategory
);

// PUT /api/categories/:id - Update category
router.put(
  "/:id",
  validateBody(categorySchemas.update),
  categoryController.updateCategory
);

// DELETE /api/categories/:id - Delete category
router.delete("/:id", categoryController.deleteCategory);

// POST /api/categories/:id/words - Add words to category
router.post(
  "/:id/words",
  validateBody(
    Joi.object({
      word_ids: Joi.array().items(Joi.string()).min(1).required(),
    })
  ),
  categoryController.addWordsToCategory
);

// GET /api/categories/:id/words - Get words from category
router.get("/:id/words", categoryController.getWordsFromCategory);

// DELETE /api/categories/:id/words - Remove words from category
router.delete(
  "/:id/words",
  validateBody(
    Joi.object({
      word_ids: Joi.array().items(Joi.string()).min(1).required(),
    })
  ),
  categoryController.removeWordsFromCategory
);

// GET /api/categories/by-word/:word_id - Get category IDs containing this word
router.get("/by-word/:word_id", categoryController.getCategoriesByWordId);

export default router;
