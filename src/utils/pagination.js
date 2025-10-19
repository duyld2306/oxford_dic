/**
 * Pagination Utilities
 * Reusable pagination helpers
 */

/**
 * Parse pagination parameters from request
 * @param {Object} query - Request query object
 * @param {Object} defaults - Default values
 * @returns {Object} Parsed pagination params
 */
export const parsePagination = (query = {}, defaults = {}) => {
  const defaultPage = defaults.page || 1;
  const defaultPerPage = defaults.perPage || 100;
  const maxPerPage = defaults.maxPerPage || 1000;

  const page = Math.max(1, parseInt(query.page, 10) || defaultPage);
  const perPage = Math.max(1, Math.min(maxPerPage, parseInt(query.per_page, 10) || defaultPerPage));

  return {
    page,
    perPage,
    skip: (page - 1) * perPage,
    limit: perPage,
  };
};

/**
 * Build pagination metadata
 * @param {number} total - Total number of items
 * @param {number} page - Current page
 * @param {number} perPage - Items per page
 * @returns {Object} Pagination metadata
 */
export const buildPaginationMeta = (total, page, perPage) => {
  const totalPages = Math.ceil(total / perPage);

  return {
    total,
    page,
    per_page: perPage,
    total_pages: totalPages,
    has_next: page < totalPages,
    has_prev: page > 1,
  };
};

/**
 * Paginate array in memory
 * @param {Array} items - Array to paginate
 * @param {number} page - Current page
 * @param {number} perPage - Items per page
 * @returns {Object} Paginated result
 */
export const paginateArray = (items = [], page = 1, perPage = 100) => {
  const total = items.length;
  const skip = (page - 1) * perPage;
  const paginatedItems = items.slice(skip, skip + perPage);

  return {
    data: paginatedItems,
    meta: buildPaginationMeta(total, page, perPage),
  };
};

/**
 * Create pagination response
 * @param {Array} data - Paginated data
 * @param {number} total - Total count
 * @param {number} page - Current page
 * @param {number} perPage - Items per page
 * @returns {Object} Pagination response
 */
export const createPaginationResponse = (data, total, page, perPage) => {
  return {
    data,
    meta: buildPaginationMeta(total, page, perPage),
  };
};

export default {
  parsePagination,
  buildPaginationMeta,
  paginateArray,
  createPaginationResponse,
};

