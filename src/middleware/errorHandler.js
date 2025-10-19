/**
 * Error Handler Middleware
 * Centralized error handling with structured logging
 */

import logger from "../config/logger.js";
import { AppError } from "../errors/AppError.js";
import { HTTP_STATUS } from "../constants/index.js";

export default function errorHandler(err, req, res, next) {
  // Determine status code
  const statusCode =
    err.statusCode || err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const errorCode = err.errorCode || "";
  const message = err.message || "Internal server error";

  // Log error with context
  logger.error("Error occurred", {
    error: message,
    statusCode,
    errorCode,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.userId,
    stack: err.stack,
    isOperational: err.isOperational,
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === "development";
  const errorResponse = {
    success: false,
    status_code: statusCode,
    data: null,
    message: isDevelopment
      ? message
      : statusCode >= 500
      ? "Internal server error"
      : message,
    error_code: errorCode,
  };

  // Add stack trace in development
  if (isDevelopment && err.stack) {
    errorResponse.stack = err.stack;
  }

  // Add validation errors if present
  if (err.errors && Array.isArray(err.errors)) {
    errorResponse.errors = err.errors;
  }

  // Use custom error response if available
  if (res && typeof res.apiError === "function") {
    return res.apiError(errorResponse.message, statusCode, errorCode);
  }

  res.status(statusCode).json(errorResponse);
}
