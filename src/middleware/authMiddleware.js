import jwt from "jsonwebtoken";
import UserModel from "../models/User.js";
import env from "../config/env.js";

const userModel = new UserModel();

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.apiError('Access token required', 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return res.apiError('Access token required', 401);
    }

    // Verify the JWT token
    const jwtSecret = env.JWT_SECRET || process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET not configured');
      return res.apiError('Server configuration error', 500);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.apiError('Access token expired', 401);
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.apiError('Invalid access token', 401);
      } else {
        return res.apiError('Token verification failed', 401);
      }
    }

    // Get user from database
    const user = await userModel.findByIdSafe(decoded.userId);
    
    if (!user) {
      return res.apiError('User not found', 401);
    }

    if (!user.isVerified) {
      return res.apiError('Email not verified', 401);
    }

    // Attach user to request object
    req.user = user;
    req.userId = user._id;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.apiError('Authentication failed', 500);
  }
};

// Optional auth middleware - doesn't fail if no token provided
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      return next(); // Continue without authentication
    }

    const jwtSecret = env.JWT_SECRET || process.env.JWT_SECRET;
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
    console.error('Optional auth middleware error:', error);
    next(); // Continue without authentication
  }
};

// Admin role middleware (requires auth middleware to run first)
const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.apiError('Authentication required', 401);
  }

  if (req.user.role !== 'admin') {
    return res.apiError('Admin access required', 403);
  }

  next();
};

export { authMiddleware, optionalAuthMiddleware, adminMiddleware };
export default authMiddleware;
