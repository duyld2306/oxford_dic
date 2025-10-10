import express from "express";
import UserController from "../controllers/UserController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();
const userController = new UserController();

// All user routes require authentication
router.use(authMiddleware);

// GET /api/users/profile - Get user profile
router.get("/profile", userController.getProfile);

// PUT /api/users/profile - Update user profile
router.put("/profile", userController.updateProfile);

// GET /api/users/favorites - Get user's favorite words
router.get("/favorites", userController.getFavorites);

// POST /api/users/favorites - Add multiple words to favorites
router.post("/favorites", userController.addMultipleFavorites);

// DELETE /api/users/favorites - Remove multiple words from favorites
router.delete("/favorites", userController.removeMultipleFavorites);

// POST /api/users/favorites/:wordId - Add single word to favorites
router.post("/favorites/:wordId", userController.addSingleFavorite);

// DELETE /api/users/favorites/:wordId - Remove single word from favorites
router.delete("/favorites/:wordId", userController.removeSingleFavorite);

// POST /api/users/change-password - Change user password
router.post("/change-password", userController.changePassword);

export default router;
