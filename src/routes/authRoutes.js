import express from "express";
import AuthController from "../controllers/AuthController.js";

const router = express.Router();
const authController = new AuthController();

// POST /api/auth/register - Register new user
router.post("/register", authController.register);

// GET /api/auth/verify/:token - Verify email address
router.get("/verify/:token", authController.verify);

// POST /api/auth/resend-verification - Resend verification email
router.post("/resend-verification", authController.resendVerification);

// POST /api/auth/login - Login user
router.post("/login", authController.login);

// POST /api/auth/refresh - Refresh access token
router.post("/refresh", authController.refresh);

// POST /api/auth/logout - Logout user
router.post("/logout", authController.logout);

// POST /api/auth/forgot-password - Send password reset email
router.post("/forgot-password", authController.forgotPassword);

// POST /api/auth/reset-password/:token - Reset password with token
router.post("/reset-password/:token", authController.resetPassword);

export default router;
