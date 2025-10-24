import express from "express";
import AuthController from "../controllers/AuthController.js";
import {
  validateBody,
  userSchemas,
  validateParams,
} from "../validators/index.js";
import Joi from "joi";

const router = express.Router();
const authController = new AuthController();

// Validation schemas for auth routes
const authValidation = {
  register: userSchemas.register,
  login: userSchemas.login,
  resendVerification: Joi.object({
    email: Joi.string().email().required(),
  }),
  forgotPassword: Joi.object({
    email: Joi.string().email().required(),
  }),
  resetPassword: Joi.object({
    password: Joi.string().min(6).required(),
  }),
  refresh: Joi.object({
    refreshToken: Joi.string().required(),
  }),
  logout: Joi.object({
    refreshToken: Joi.string().required(),
  }),
};

// POST /api/auth/register - Register new user
router.post(
  "/register",
  validateBody(authValidation.register),
  authController.register
);

// GET /api/auth/verify/:token - Verify email address
router.get("/verify/:token", authController.verify);

// POST /api/auth/resend-verification - Resend verification email
router.post(
  "/resend-verification",
  validateBody(authValidation.resendVerification),
  authController.resendVerification
);

// POST /api/auth/login - Login user
router.post("/login", validateBody(authValidation.login), authController.login);

// POST /api/auth/refresh - Refresh access token
router.post(
  "/refresh",
  validateBody(authValidation.refresh),
  authController.refresh
);

// POST /api/auth/logout - Logout user
router.post(
  "/logout",
  validateBody(authValidation.logout),
  authController.logout
);

// POST /api/auth/forgot-password - Send password reset email
router.post(
  "/forgot-password",
  validateBody(authValidation.forgotPassword),
  authController.forgotPassword
);

// POST /api/auth/reset-password/:token - Reset password with token
router.post(
  "/reset-password/:token",
  validateParams(Joi.object({ token: Joi.string().required() })),
  validateBody(authValidation.resetPassword),
  authController.resetPassword
);

export default router;
