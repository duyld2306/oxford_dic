/**
 * Custom Application Errors
 * Provides structured error handling across the application
 */

import { HTTP_STATUS } from "../constants/index.js";

/**
 * Base Application Error
 */
export class AppError extends Error {
  constructor(message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, errorCode = "") {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error (400)
 */
export class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, HTTP_STATUS.BAD_REQUEST, "VALIDATION_ERROR");
    this.errors = errors;
  }
}

/**
 * Authentication Error (401)
 */
export class AuthenticationError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, HTTP_STATUS.UNAUTHORIZED, "AUTHENTICATION_ERROR");
  }
}

/**
 * Authorization Error (403)
 */
export class AuthorizationError extends AppError {
  constructor(message = "Permission denied") {
    super(message, HTTP_STATUS.FORBIDDEN, "AUTHORIZATION_ERROR");
  }
}

/**
 * Not Found Error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, HTTP_STATUS.NOT_FOUND, "NOT_FOUND");
  }
}

/**
 * Conflict Error (409)
 */
export class ConflictError extends AppError {
  constructor(message = "Resource already exists") {
    super(message, HTTP_STATUS.CONFLICT, "CONFLICT_ERROR");
  }
}

/**
 * Business Logic Error (422)
 */
export class BusinessLogicError extends AppError {
  constructor(message) {
    super(message, HTTP_STATUS.UNPROCESSABLE_ENTITY, "BUSINESS_LOGIC_ERROR");
  }
}

/**
 * Database Error (500)
 */
export class DatabaseError extends AppError {
  constructor(message = "Database operation failed") {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, "DATABASE_ERROR");
  }
}

