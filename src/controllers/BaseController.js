/**
 * Base Controller Class
 * Abstract base class for all controllers
 * Provides standardized request handling, validation, and response formatting
 *
 * Design Patterns:
 * - Template Method Pattern: Defines skeleton of request handling
 * - Strategy Pattern: Flexible validation and response strategies
 * - Dependency Injection: Controllers receive services via constructor
 */

import { ValidationError, AuthenticationError } from "../errors/AppError.js";
import { HTTP_STATUS } from "../constants/index.js";

export class BaseController {
  constructor(service = null, dependencies = {}) {
    if (new.target === BaseController) {
      throw new Error(
        "BaseController is an abstract class and cannot be instantiated directly"
      );
    }

    this.service = service;
    this.dependencies = dependencies;
    this.logger = dependencies.logger || console;
  }

  /**
   * Wrap async route handlers with error handling
   * Usage: router.get('/path', this.asyncHandler(this.methodName.bind(this)))
   */
  asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Extract user ID from authenticated request
   */
  getUserId(req) {
    const userId = req.userId;

    if (!userId) {
      throw new AuthenticationError("User not authenticated");
    }

    return userId;
  }

  /**
   * Extract request metadata: user agent and IP address
   */
  getRequestMetadata(req) {
    const userAgent = req.headers["user-agent"] || null;
    const ipAddress =
      req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;
    return {
      ipAddress,
      userAgent,
    };
  }

  /**
   * Get validated body (set by validateBody middleware)
   * Falls back to req.body if validation middleware not used
   */
  getBody(req) {
    return req.validatedBody || req.body;
  }

  /**
   * Get validated query (set by validateQuery middleware)
   * Falls back to req.query if validation middleware not used
   */
  getQuery(req) {
    return req.validatedQuery || req.query;
  }

  /**
   * Get validated params (set by validateParams middleware)
   * Falls back to req.params if validation middleware not used
   */
  getParams(req) {
    return req.validatedParams || req.params;
  }

  /**
   * Extract user role from authenticated request
   */
  getUserRole(req) {
    return req.user?.role || "user";
  }

  /**
   * Check if user is superadmin
   */
  isSuperAdmin(req) {
    return this.getUserRole(req) === "superadmin";
  }

  /**
   * Check if user is admin or superadmin
   */
  isAdmin(req) {
    const role = this.getUserRole(req);
    return role === "admin" || role === "superadmin";
  }

  /**
   * Validate request body
   */
  validateBody(req, schema) {
    if (!req.body) {
      throw new ValidationError("Request body is required");
    }

    if (schema && typeof schema.validate === "function") {
      const { error, value } = schema.validate(req.body, { abortEarly: false });

      if (error) {
        const errors = error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        }));

        throw new ValidationError("Validation failed", errors);
      }

      return value;
    }

    return req.body;
  }

  /**
   * Validate request query parameters
   */
  validateQuery(req, schema) {
    if (schema && typeof schema.validate === "function") {
      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
      });

      if (error) {
        const errors = error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        }));

        throw new ValidationError("Query validation failed", errors);
      }

      return value;
    }

    return req.query;
  }

  /**
   * Validate request params
   */
  validateParams(req, schema) {
    if (schema && typeof schema.validate === "function") {
      const { error, value } = schema.validate(req.params, {
        abortEarly: false,
      });

      if (error) {
        const errors = error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        }));

        throw new ValidationError("Params validation failed", errors);
      }

      return value;
    }

    return req.params;
  }

  /**
   * Send success response
   */
  sendSuccess(
    res,
    data = null,
    meta = null,
    message = "",
    statusCode = HTTP_STATUS.OK
  ) {
    if (res.apiSuccess) {
      return res.apiSuccess({ data, meta, message }, statusCode);
    }

    return res.status(statusCode).json({
      success: true,
      status_code: statusCode,
      data,
      meta,
      message,
      error_code: "",
    });
  }

  /**
   * Send created response
   */
  sendCreated(res, data = null, message = "") {
    return this.sendSuccess(res, data, null, message, HTTP_STATUS.CREATED);
  }

  /**
   * Send no content response
   */
  sendNoContent(res) {
    return res.status(HTTP_STATUS.NO_CONTENT).send();
  }

  /**
   * Send error response
   */
  sendError(
    res,
    message = "Internal server error",
    statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    errorCode = ""
  ) {
    if (res.apiError) {
      return res.apiError(message, statusCode, errorCode);
    }

    return res.status(statusCode).json({
      success: false,
      status_code: statusCode,
      data: null,
      message,
      error_code: errorCode,
    });
  }

  /**
   * Parse pagination from query
   */
  getPagination(req) {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const perPage = Math.max(
      1,
      Math.min(1000, parseInt(req.query.per_page, 10) || 100)
    );

    return { page, perPage };
  }

  /**
   * Parse sorting from query
   */
  getSort(req, defaultSort = { createdAt: -1 }) {
    const { sort_by, sort_order } = req.query;

    if (!sort_by) {
      return defaultSort;
    }

    const order = sort_order === "asc" ? 1 : -1;
    return { [sort_by]: order };
  }

  /**
   * Parse filters from query
   */
  getFilters(req, allowedFilters = []) {
    const filters = {};

    for (const filter of allowedFilters) {
      if (req.query[filter] !== undefined && req.query[filter] !== "") {
        filters[filter] = req.query[filter];
      }
    }

    return filters;
  }

  /**
   * Log controller action
   */
  log(level, message, meta = {}) {
    const logData = {
      controller: this.constructor.name,
      timestamp: new Date().toISOString(),
      ...meta,
    };

    if (this.logger[level]) {
      this.logger[level](message, logData);
    } else {
      console.log(`[${level.toUpperCase()}]`, message, logData);
    }
  }

  /**
   * Get service dependency
   */
  getDependency(name) {
    if (!this.dependencies[name]) {
      throw new Error(`Dependency '${name}' not found in controller`);
    }

    return this.dependencies[name];
  }

  /**
   * Check if dependency exists
   */
  hasDependency(name) {
    return !!this.dependencies[name];
  }

  /**
   * Bind all methods to instance
   * Call this in constructor to avoid binding issues
   */
  bindMethods() {
    const prototype = Object.getPrototypeOf(this);
    const propertyNames = Object.getOwnPropertyNames(prototype);

    for (const name of propertyNames) {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, name);

      if (
        descriptor &&
        typeof descriptor.value === "function" &&
        name !== "constructor"
      ) {
        this[name] = this[name].bind(this);
      }
    }
  }
}

export default BaseController;
