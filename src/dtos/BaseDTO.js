/**
 * Base Data Transfer Object
 * Abstract base class for all DTOs
 * Provides common transformation and serialization methods
 * 
 * Design Pattern: Data Transfer Object (DTO)
 * Purpose: Decouple internal data models from API responses
 */

export class BaseDTO {
  constructor(data = {}) {
    if (new.target === BaseDTO) {
      throw new Error("BaseDTO is an abstract class and cannot be instantiated directly");
    }

    this.data = data;
  }

  /**
   * Transform entity to DTO
   * Override in child classes
   */
  transform() {
    throw new Error("transform() must be implemented by child class");
  }

  /**
   * Transform array of entities to DTOs
   */
  static transformMany(entities, DTOClass) {
    if (!Array.isArray(entities)) {
      return [];
    }

    return entities.map((entity) => new DTOClass(entity).transform());
  }

  /**
   * Remove null/undefined fields
   */
  removeEmpty(obj) {
    const cleaned = {};

    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined) {
        cleaned[key] = value;
      }
    }

    return cleaned;
  }

  /**
   * Pick specific fields from object
   */
  pick(obj, fields = []) {
    const picked = {};

    for (const field of fields) {
      if (obj[field] !== undefined) {
        picked[field] = obj[field];
      }
    }

    return picked;
  }

  /**
   * Omit specific fields from object
   */
  omit(obj, fields = []) {
    const omitted = { ...obj };

    for (const field of fields) {
      delete omitted[field];
    }

    return omitted;
  }

  /**
   * Convert ObjectId to string
   */
  toStringId(id) {
    if (!id) return null;
    return id.toString();
  }

  /**
   * Format date to ISO string
   */
  formatDate(date) {
    if (!date) return null;
    return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
  }

  /**
   * Sanitize HTML/script content
   */
  sanitize(str) {
    if (typeof str !== "string") return str;
    return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  }
}

export default BaseDTO;

