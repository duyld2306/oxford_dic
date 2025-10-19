/**
 * Filtering Utilities
 * Reusable filtering and query building helpers
 */

/**
 * Build MongoDB query from filters
 * @param {Object} filters - Filter object
 * @param {Object} options - Filter options
 * @returns {Object} MongoDB query
 */
export const buildQuery = (filters = {}, options = {}) => {
  const query = {};
  const { allowedFields = [], transformers = {} } = options;

  for (const [key, value] of Object.entries(filters)) {
    // Skip if field not allowed
    if (allowedFields.length > 0 && !allowedFields.includes(key)) {
      continue;
    }

    // Skip empty values
    if (value === undefined || value === null || value === "") {
      continue;
    }

    // Apply transformer if exists
    if (transformers[key]) {
      query[key] = transformers[key](value);
    } else {
      query[key] = value;
    }
  }

  return query;
};

/**
 * Build text search query
 * @param {string} searchTerm - Search term
 * @param {Array<string>} fields - Fields to search
 * @returns {Object} MongoDB $or query
 */
export const buildTextSearch = (searchTerm, fields = []) => {
  if (!searchTerm || fields.length === 0) {
    return {};
  }

  const escapedTerm = escapeRegex(searchTerm);
  const regex = new RegExp(escapedTerm, "i");

  return {
    $or: fields.map((field) => ({ [field]: regex })),
  };
};

/**
 * Escape special regex characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export const escapeRegex = (str) => {
  if (typeof str !== "string") return "";
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * Build range query
 * @param {string} field - Field name
 * @param {*} min - Minimum value
 * @param {*} max - Maximum value
 * @returns {Object} MongoDB range query
 */
export const buildRangeQuery = (field, min, max) => {
  const query = {};

  if (min !== undefined && min !== null) {
    query[field] = { ...query[field], $gte: min };
  }

  if (max !== undefined && max !== null) {
    query[field] = { ...query[field], $lte: max };
  }

  return query;
};

/**
 * Build date range query
 * @param {string} field - Field name
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date
 * @returns {Object} MongoDB date range query
 */
export const buildDateRangeQuery = (field, startDate, endDate) => {
  const query = {};

  if (startDate) {
    const start = startDate instanceof Date ? startDate : new Date(startDate);
    query[field] = { ...query[field], $gte: start };
  }

  if (endDate) {
    const end = endDate instanceof Date ? endDate : new Date(endDate);
    query[field] = { ...query[field], $lte: end };
  }

  return query;
};

/**
 * Build array contains query
 * @param {string} field - Field name
 * @param {Array} values - Values to match
 * @returns {Object} MongoDB $in query
 */
export const buildInQuery = (field, values) => {
  if (!Array.isArray(values) || values.length === 0) {
    return {};
  }

  return { [field]: { $in: values } };
};

/**
 * Parse sort parameters
 * @param {string} sortBy - Sort field
 * @param {string} sortOrder - Sort order (asc/desc)
 * @param {Object} defaultSort - Default sort
 * @returns {Object} MongoDB sort object
 */
export const parseSort = (sortBy, sortOrder = "desc", defaultSort = { createdAt: -1 }) => {
  if (!sortBy) {
    return defaultSort;
  }

  const order = sortOrder === "asc" ? 1 : -1;
  return { [sortBy]: order };
};

/**
 * Parse boolean filter
 * @param {*} value - Value to parse
 * @returns {boolean|null} Parsed boolean or null
 */
export const parseBoolean = (value) => {
  if (value === "true" || value === true || value === "1" || value === 1) {
    return true;
  }

  if (value === "false" || value === false || value === "0" || value === 0) {
    return false;
  }

  return null;
};

/**
 * Parse array filter (comma-separated or JSON)
 * @param {*} value - Value to parse
 * @returns {Array} Parsed array
 */
export const parseArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    // Try JSON parse first
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      // Not JSON, try comma-separated
      return value.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }

  return [];
};

export default {
  buildQuery,
  buildTextSearch,
  escapeRegex,
  buildRangeQuery,
  buildDateRangeQuery,
  buildInQuery,
  parseSort,
  parseBoolean,
  parseArray,
};

