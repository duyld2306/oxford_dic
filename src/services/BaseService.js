/**
 * Base Service Class
 * Abstract base class for all services
 * Provides common service operations and dependency injection support
 * 
 * Design Patterns:
 * - Template Method Pattern: Defines skeleton of operations
 * - Dependency Injection: Services receive dependencies via constructor
 * - Single Responsibility: Each service handles one domain
 */

import { ValidationError, BusinessLogicError } from "../errors/AppError.js";

export class BaseService {
  constructor(repository = null, dependencies = {}) {
    if (new.target === BaseService) {
      throw new Error("BaseService is an abstract class and cannot be instantiated directly");
    }

    this.repository = repository;
    this.dependencies = dependencies;
    this.logger = dependencies.logger || console;
  }

  /**
   * Validate input data
   * Override in child classes for specific validation
   */
  validate(data, schema) {
    if (!schema) {
      return data;
    }

    // If using Joi or Zod, validation happens here
    // For now, basic validation
    if (typeof schema === "function") {
      return schema(data);
    }

    return data;
  }

  /**
   * Log service operations
   */
  log(level, message, meta = {}) {
    const logData = {
      service: this.constructor.name,
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
   * Handle service errors
   */
  handleError(error, context = "") {
    this.log("error", `Error in ${context}`, {
      error: error.message,
      stack: error.stack,
    });

    // Re-throw if it's already an AppError
    if (error.isOperational) {
      throw error;
    }

    // Wrap unknown errors
    throw new BusinessLogicError(error.message || "Service operation failed");
  }

  /**
   * Execute operation with error handling
   */
  async execute(operation, context = "operation") {
    try {
      this.log("info", `Executing ${context}`);
      const result = await operation();
      this.log("info", `Completed ${context}`);
      return result;
    } catch (error) {
      this.handleError(error, context);
    }
  }

  /**
   * Validate required fields
   */
  validateRequired(data, fields = []) {
    const missing = [];

    for (const field of fields) {
      if (data[field] === undefined || data[field] === null || data[field] === "") {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      throw new ValidationError(`Missing required fields: ${missing.join(", ")}`);
    }
  }

  /**
   * Sanitize input data
   */
  sanitize(data) {
    if (typeof data === "string") {
      return data.trim();
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item));
    }

    if (data && typeof data === "object") {
      const sanitized = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitize(value);
      }
      return sanitized;
    }

    return data;
  }

  /**
   * Build pagination metadata
   */
  buildPaginationMeta(total, page, perPage) {
    const totalPages = Math.ceil(total / perPage);

    return {
      total,
      page,
      per_page: perPage,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1,
    };
  }

  /**
   * Parse pagination parameters
   */
  parsePagination(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const perPage = Math.max(1, Math.min(1000, parseInt(query.per_page, 10) || 100));

    return { page, perPage };
  }

  /**
   * Build filter query from request parameters
   */
  buildFilterQuery(filters = {}) {
    const query = {};

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== "") {
        query[key] = value;
      }
    }

    return query;
  }

  /**
   * Transform entity to DTO
   * Override in child classes for specific transformations
   */
  toDTO(entity) {
    return entity;
  }

  /**
   * Transform array of entities to DTOs
   */
  toDTOs(entities) {
    if (!Array.isArray(entities)) {
      return [];
    }

    return entities.map((entity) => this.toDTO(entity));
  }

  /**
   * Check if user owns resource
   */
  checkOwnership(resource, userId) {
    if (!resource) {
      throw new BusinessLogicError("Resource not found");
    }

    const resourceUserId = resource.user_id?.toString() || resource.userId?.toString();
    const currentUserId = userId?.toString();

    if (resourceUserId !== currentUserId) {
      throw new BusinessLogicError("Permission denied: You don't own this resource");
    }

    return true;
  }

  /**
   * Get service dependency
   */
  getDependency(name) {
    if (!this.dependencies[name]) {
      throw new Error(`Dependency '${name}' not found in service`);
    }

    return this.dependencies[name];
  }

  /**
   * Check if dependency exists
   */
  hasDependency(name) {
    return !!this.dependencies[name];
  }
}

export default BaseService;

