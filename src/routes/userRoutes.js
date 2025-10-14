import express from "express";
import UserController from "../controllers/UserController.js";
import authMiddleware, {
  superadminMiddleware,
} from "../middleware/authMiddleware.js";

const router = express.Router();
const userController = new UserController();

// All user routes require authentication
router.use(authMiddleware);

// Superadmin-only: list users with pagination and search
router.get("/list", superadminMiddleware, userController.listUsers);

// GET /api/users/profile - Get user profile
router.get("/profile", userController.getProfile);

// PUT /api/users/profile - Update user profile
router.put("/profile", userController.updateProfile);

// POST /api/users/change-password - Change user password
router.post("/change-password", userController.changePassword);

// GET /api/users/group_words - Get all group_words
router.get("/group_words", userController.getGroupWords);

// GET /api/users/group_words/:word_id - Get group word IDs containing this word
router.get("/group_words/:word_id", userController.getGroupWordsByWordId);

// POST /api/users/group_words - Create new group_word
router.post("/group_words", userController.createGroupWord);

// PUT /api/users/group_words/:group_word_id - Update group_word
router.put("/group_words/:group_word_id", userController.updateGroupWord);

// DELETE /api/users/group_words/:group_word_id - Delete group_word
router.delete("/group_words/:group_word_id", userController.deleteGroupWord);

// GET /api/users/categories - Get all categories
router.get("/categories", userController.getCategories);

// GET /api/users/categories/:word_id - Get category IDs containing this word
router.get("/categories/:word_id", userController.getCategoriesByWordId);

// POST /api/users/categories - Create new category
router.post("/categories", userController.createCategory);

// PUT /api/users/categories/:category_id - Update category
router.put("/categories/:category_id", userController.updateCategory);

// DELETE /api/users/categories/:category_id - Delete category
router.delete("/categories/:category_id", userController.deleteCategory);

// POST /api/users/categories/:category_id/words - Add words to category
router.post(
  "/categories/:category_id/words",
  userController.addWordsToCategory
);

// GET /api/users/categories/:category_id/words - Get words from category
router.get(
  "/categories/:category_id/words",
  userController.getWordsFromCategory
);

// DELETE /api/users/categories/:category_id/words - Remove words from category
router.delete(
  "/categories/:category_id/words",
  userController.removeWordsFromCategory
);

// GET /api/users/favorites - Get favorites
router.get("/favorites", userController.getFavorites);

// POST /api/users/favorites - Add word to group
router.post("/favorites", userController.addFavorite);

// DELETE /api/users/favorites - Remove word from group
router.delete("/favorites", userController.removeFavorite);

// POST /api/users/assign-role - Assign role to user (superadmin only)
router.post("/assign-role", superadminMiddleware, userController.assignRole);

// POST /api/users/set-verified - Superadmin only
router.post("/set-verified", superadminMiddleware, userController.setVerified);

export default router;
