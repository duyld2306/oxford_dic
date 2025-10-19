import express from "express";
import UserController from "../controllers/UserController.js";
import authMiddleware, {
  superadminMiddleware,
} from "../middleware/authMiddleware.js";
import { validateBody, userSchemas } from "../validators/index.js";
import Joi from "joi";

const router = express.Router();
const userController = new UserController();

// All user routes require authentication
router.use(authMiddleware);

// Superadmin-only: list users with pagination and search
router.get("/list", superadminMiddleware, userController.listUsers);

// GET /api/users/profile - Get user profile
router.get("/profile", userController.getProfile);

// PUT /api/users/profile - Update user profile
router.put(
  "/profile",
  validateBody(userSchemas.updateProfile),
  userController.updateProfile
);

// POST /api/users/change-password - Change user password
router.post(
  "/change-password",
  validateBody(userSchemas.changePassword),
  userController.changePassword
);

// PUT /api/users/:id/role - Assign role to user (superadmin only)
router.put(
  "/:id/role",
  superadminMiddleware,
  validateBody(
    Joi.object({
      role: Joi.string().valid("user", "admin", "superadmin").required(),
    })
  ),
  userController.assignRole
);

// PUT /api/users/:id/verified - Set verified status (superadmin only)
router.put(
  "/:id/verified",
  superadminMiddleware,
  validateBody(
    Joi.object({
      isVerified: Joi.boolean().required(),
    })
  ),
  userController.setVerified
);

export default router;
