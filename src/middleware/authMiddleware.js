import jwt from "jsonwebtoken";
import UserModel from "../models/User.js";
import env from "../config/env.js";
import { respond } from "../utils/respond.js";

const userModel = new UserModel();

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return respond.error(res, "VALIDATION.MISSING_TOKEN");
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      return respond.error(res, "VALIDATION.MISSING_TOKEN");
    }

    // Verify the JWT token
    const jwtSecret = env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("JWT_SECRET not configured");
      return respond.error(res, "SYSTEM.SERVER_CONFIG_ERROR");
    }

    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (jwtError) {
      if (jwtError.name === "TokenExpiredError") {
        return respond.error(res, "AUTH.TOKEN_EXPIRED");
      } else if (jwtError.name === "JsonWebTokenError") {
        return respond.error(res, "AUTH.INVALID_TOKEN");
      } else {
        return respond.error(res, "AUTH.TOKEN_VERIFICATION_FAILED");
      }
    }

    // Get user from database
    const user = await userModel.findByIdSafe(decoded.userId);

    if (!user) {
      return respond.error(res, "USER.USER_NOT_FOUND");
    }

    if (!user.isVerified) {
      return respond.error(res, "AUTH.EMAIL_NOT_VERIFIED");
    }

    // Attach user to request object
    req.user = user;
    req.userId = user._id;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return respond.error(res, "AUTH.AUTH_MIDDLEWARE_ERROR");
  }
};

// Optional auth middleware - doesn't fail if no token provided
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(); // Continue without authentication
    }

    const token = authHeader.substring(7);

    if (!token) {
      return next(); // Continue without authentication
    }

    const jwtSecret = env.JWT_SECRET;
    if (!jwtSecret) {
      return next(); // Continue without authentication
    }

    try {
      const decoded = jwt.verify(token, jwtSecret);
      const user = await userModel.findByIdSafe(decoded.userId);

      if (user && user.isVerified) {
        req.user = user;
        req.userId = user._id;
      }
    } catch (jwtError) {
      // Ignore JWT errors in optional auth
    }

    next();
  } catch (error) {
    console.error("Optional auth middleware error:", error);
    next(); // Continue without authentication
  }
};

// Admin role middleware (requires auth middleware to run first)
const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return respond.error(res, "USER.USER_NOT_FOUND");
  }

  if (req.user.role !== "admin" && req.user.role !== "superadmin") {
    return respond.error(res, "AUTH.ADMIN_ACCESS_REQUIRED");
  }

  next();
};

// Superadmin role middleware (requires auth middleware to run first)
const superadminMiddleware = (req, res, next) => {
  if (!req.user) {
    return respond.error(res, "USER.USER_NOT_FOUND");
  }

  if (req.user.role !== "superadmin") {
    return respond.error(res, "AUTH.SUPERADMIN_ACCESS_REQUIRED");
  }

  next();
};

export {
  authMiddleware,
  optionalAuthMiddleware,
  adminMiddleware,
  superadminMiddleware,
};
export default authMiddleware;
