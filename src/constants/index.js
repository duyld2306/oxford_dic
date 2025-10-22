/**
 * Application Constants
 * Centralized location for all application constants
 * Includes: User roles, HTTP status codes, error codes, messages, and API responses
 */

// ============================================================================
// USER CONSTANTS
// ============================================================================

export const USER_ROLES = {
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  USER: "user",
};

export const USER_GENDERS = {
  MALE: "male",
  FEMALE: "female",
  OTHER: "other",
};

// ============================================================================
// FLASHCARD CONSTANTS
// ============================================================================

export const FLASHCARD_STATUS = {
  NEW: "new",
  LEARNING: "learning",
  MASTERED: "mastered",
};

export const FLASHCARD_GROUP_SOURCE_TYPES = {
  GROUP_WORD: "group_word",
  MANUAL: "manual",
};

// ============================================================================
// WORD CONSTANTS
// ============================================================================

export const WORD_SYMBOLS = {
  A1: "a1",
  A2: "a2",
  B1: "b1",
  B2: "b2",
  C1: "c1",
  OTHER: "other",
};

// ============================================================================
// LIMITS
// ============================================================================

export const LIMITS = {
  MAX_GROUP_WORDS_PER_USER: 20,
  MAX_CATEGORIES_PER_USER: 20,
  DEFAULT_PAGE_SIZE: 100,
  MAX_PAGE_SIZE: 1000,
  MIN_PAGE_SIZE: 1,
  BCRYPT_SALT_ROUNDS: 12,
};

// ============================================================================
// PAGINATION
// ============================================================================

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PER_PAGE: 100,
};

// ============================================================================
// JWT
// ============================================================================

export const JWT = {
  ACCESS_TOKEN_EXPIRY: "1d",
  REFRESH_TOKEN_EXPIRY: "7d",
};

// ============================================================================
// HTTP STATUS CODES
// ============================================================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
};

// Error Codes
export const ERROR_CODES = {
  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  MISSING_TOKEN: "MISSING_TOKEN",
  REQUIRED_FIELDS: "REQUIRED_FIELDS",
  INVALID_ID: "INVALID_ID",
  INVALID_ROLE: "INVALID_ROLE",
  INVALID_GENDER: "INVALID_GENDER",

  // Auth
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_VERIFICATION_FAILED: "TOKEN_VERIFICATION_FAILED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  EMAIL_ALREADY_VERIFIED: "EMAIL_ALREADY_VERIFIED",
  ADMIN_ACCESS_REQUIRED: "ADMIN_ACCESS_REQUIRED",
  SUPERADMIN_ACCESS_REQUIRED: "SUPERADMIN_ACCESS_REQUIRED",

  // User
  USER_NOT_FOUND: "USER_NOT_FOUND",
  USER_ALREADY_EXISTS: "USER_ALREADY_EXISTS",

  // Group Word
  GROUP_WORD_NOT_FOUND: "GROUP_WORD_NOT_FOUND",
  GROUP_WORD_LIMIT_REACHED: "GROUP_WORD_LIMIT_REACHED",
  GROUP_WORD_NOT_EMPTY: "GROUP_WORD_NOT_EMPTY",

  // Category
  CATEGORY_NOT_FOUND: "CATEGORY_NOT_FOUND",
  CATEGORY_LIMIT_REACHED: "CATEGORY_LIMIT_REACHED",
  CATEGORY_NOT_EMPTY: "CATEGORY_NOT_EMPTY",

  // Word
  WORD_NOT_FOUND: "WORD_NOT_FOUND",

  // Flashcard
  FLASHCARD_NOT_FOUND: "FLASHCARD_NOT_FOUND",
  FLASHCARD_GROUP_NOT_FOUND: "FLASHCARD_GROUP_NOT_FOUND",
  FLASHCARD_ALREADY_EXISTS: "FLASHCARD_ALREADY_EXISTS",
  INVALID_FLASHCARD_STATUS: "INVALID_FLASHCARD_STATUS",

  // System
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",
  SERVER_CONFIG_ERROR: "SERVER_CONFIG_ERROR",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  PERMISSION_DENIED: "PERMISSION_DENIED",
};

// Note: ERROR_MESSAGES and SUCCESS_MESSAGES are deprecated
// Use ERROR_RESPONSES and SUCCESS_RESPONSES instead (flat structure)

// Collection Names
export const COLLECTIONS = {
  USERS: "users",
  WORDS: "words",
  GROUP_WORDS: "group_words",
  CATEGORIES: "categories",
  FLASHCARD_GROUPS: "flashcard_groups",
  FLASHCARDS: "flashcards",
  REFRESH_TOKENS: "refresh_tokens",
};

// Regex Patterns
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[0-9]{10,15}$/,
};

// ============================================================================
// SUCCESS RESPONSE CODES & MESSAGES (Flat structure)
// ============================================================================

export const SUCCESS_RESPONSE_CODES = {
  // Auth
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  REGISTER_SUCCESS: "REGISTER_SUCCESS",
  // User
  PROFILE_UPDATED: "PROFILE_UPDATED",
};

export const SUCCESS_RESPONSES = {
  [SUCCESS_RESPONSE_CODES.LOGIN_SUCCESS]: {
    message: "Login successful",
    status_code: 200,
  },
  [SUCCESS_RESPONSE_CODES.REGISTER_SUCCESS]: {
    message: "Registration completed successfully",
    status_code: 201,
  },
  [SUCCESS_RESPONSE_CODES.PROFILE_UPDATED]: {
    message: "User profile updated successfully",
    status_code: 200,
  },
};

// ============================================================================
// ERROR RESPONSE CODES & MESSAGES (Flat structure)
// ============================================================================

export const ERROR_RESPONSE_CODES = {
  // Auth
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_VERIFICATION_FAILED: "TOKEN_VERIFICATION_FAILED",
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  EMAIL_ALREADY_VERIFIED: "EMAIL_ALREADY_VERIFIED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  AUTH_MIDDLEWARE_ERROR: "AUTH_MIDDLEWARE_ERROR",
  ADMIN_ACCESS_REQUIRED: "ADMIN_ACCESS_REQUIRED",
  SUPERADMIN_ACCESS_REQUIRED: "SUPERADMIN_ACCESS_REQUIRED",
  // User
  USER_NOT_FOUND: "USER_NOT_FOUND",
  // Group Word
  GROUP_WORD_NOT_FOUND: "GROUP_WORD_NOT_FOUND",
  GROUP_WORD_LIMIT_REACHED: "GROUP_WORD_LIMIT_REACHED",
  GROUP_WORD_NOT_EMPTY: "GROUP_WORD_NOT_EMPTY",
  // Category
  CATEGORY_NOT_FOUND: "CATEGORY_NOT_FOUND",
  CATEGORY_LIMIT_REACHED: "CATEGORY_LIMIT_REACHED",
  CATEGORY_NOT_EMPTY: "CATEGORY_NOT_EMPTY",
  // Word
  WORD_NOT_FOUND: "WORD_NOT_FOUND",
  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  MISSING_TOKEN: "MISSING_TOKEN",
  REQUIRE_EMAIL: "REQUIRE_EMAIL",
  REQUIRE_PASSWORD: "REQUIRE_PASSWORD",
  REQUIRE_REFRESH_TOKEN: "REQUIRE_REFRESH_TOKEN",
  REQUIRE_RESET_TOKEN: "REQUIRE_RESET_TOKEN",
  REQUIRE_VERIFICATION_TOKEN: "REQUIRE_VERIFICATION_TOKEN",
  REQUIRED_FIELDS: "REQUIRED_FIELDS",
  INVALID_ID: "INVALID_ID",
  INVALID_ROLE: "INVALID_ROLE",
  // System
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",
  SERVER_CONFIG_ERROR: "SERVER_CONFIG_ERROR",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
};

export const ERROR_RESPONSES = {
  // Auth
  [ERROR_RESPONSE_CODES.TOKEN_EXPIRED]: {
    message: "Access token expired",
    status_code: 401,
  },
  [ERROR_RESPONSE_CODES.INVALID_TOKEN]: {
    message: "Invalid access token",
    status_code: 401,
  },
  [ERROR_RESPONSE_CODES.TOKEN_VERIFICATION_FAILED]: {
    message: "Token verification failed",
    status_code: 401,
  },
  [ERROR_RESPONSE_CODES.EMAIL_NOT_VERIFIED]: {
    message: "Email not verified",
    status_code: 401,
  },
  [ERROR_RESPONSE_CODES.EMAIL_ALREADY_VERIFIED]: {
    message: "Email already verified",
    status_code: 400,
  },
  [ERROR_RESPONSE_CODES.INVALID_CREDENTIALS]: {
    message: "Invalid email or password",
    status_code: 401,
  },
  [ERROR_RESPONSE_CODES.AUTH_MIDDLEWARE_ERROR]: {
    message: "Authentication middleware error",
    status_code: 500,
  },
  [ERROR_RESPONSE_CODES.ADMIN_ACCESS_REQUIRED]: {
    message: "Admin access required",
    status_code: 403,
  },
  [ERROR_RESPONSE_CODES.SUPERADMIN_ACCESS_REQUIRED]: {
    message: "Superadmin access required",
    status_code: 403,
  },
  // User
  [ERROR_RESPONSE_CODES.USER_NOT_FOUND]: {
    message: "User not found",
    status_code: 404,
  },
  // Group Word
  [ERROR_RESPONSE_CODES.GROUP_WORD_NOT_FOUND]: {
    message: "Group word not found",
    status_code: 404,
  },
  [ERROR_RESPONSE_CODES.GROUP_WORD_LIMIT_REACHED]: {
    message: "Cannot create more than 20 group words",
    status_code: 400,
  },
  [ERROR_RESPONSE_CODES.GROUP_WORD_NOT_EMPTY]: {
    message: "Cannot delete group word with words in it",
    status_code: 400,
  },
  // Category
  [ERROR_RESPONSE_CODES.CATEGORY_NOT_FOUND]: {
    message: "Category not found",
    status_code: 404,
  },
  [ERROR_RESPONSE_CODES.CATEGORY_LIMIT_REACHED]: {
    message: "Cannot create more than 20 categories",
    status_code: 400,
  },
  [ERROR_RESPONSE_CODES.CATEGORY_NOT_EMPTY]: {
    message: "Cannot delete category with words in it",
    status_code: 400,
  },
  // Word
  [ERROR_RESPONSE_CODES.WORD_NOT_FOUND]: {
    message: "Word not found",
    status_code: 404,
  },
  // Validation
  [ERROR_RESPONSE_CODES.VALIDATION_ERROR]: {
    message: "Validation failed",
    status_code: 400,
  },
  [ERROR_RESPONSE_CODES.MISSING_TOKEN]: {
    message: "Access token required",
    status_code: 400,
  },
  [ERROR_RESPONSE_CODES.REQUIRE_EMAIL]: {
    message: "Email is required",
    status_code: 400,
  },
  [ERROR_RESPONSE_CODES.REQUIRE_PASSWORD]: {
    message: "Password is required",
    status_code: 400,
  },
  [ERROR_RESPONSE_CODES.REQUIRE_REFRESH_TOKEN]: {
    message: "Refresh token is required",
    status_code: 400,
  },
  [ERROR_RESPONSE_CODES.REQUIRE_RESET_TOKEN]: {
    message: "Reset token is required",
    status_code: 400,
  },
  [ERROR_RESPONSE_CODES.REQUIRE_VERIFICATION_TOKEN]: {
    message: "Verification token is required",
    status_code: 400,
  },
  [ERROR_RESPONSE_CODES.REQUIRED_FIELDS]: {
    message: "Required fields are missing",
    status_code: 400,
  },
  [ERROR_RESPONSE_CODES.INVALID_ID]: {
    message: "Invalid ID format",
    status_code: 400,
  },
  [ERROR_RESPONSE_CODES.INVALID_ROLE]: {
    message: "Invalid role. Must be 'admin' or 'user'",
    status_code: 400,
  },
  // System
  [ERROR_RESPONSE_CODES.TOO_MANY_REQUESTS]: {
    message: "Too many requests",
    status_code: 429,
  },
  [ERROR_RESPONSE_CODES.SERVER_CONFIG_ERROR]: {
    message: "Server configuration error",
    status_code: 500,
  },
  [ERROR_RESPONSE_CODES.UNKNOWN_ERROR]: {
    message: "An unexpected error occurred",
    status_code: 500,
  },
};

// ============================================================================
// BACKWARD COMPATIBILITY: API_RESPONSES (nested structure)
// ============================================================================

export const API_RESPONSES = {
  SUCCESS: {
    AUTH: {
      LOGIN_SUCCESS: SUCCESS_RESPONSES[SUCCESS_RESPONSE_CODES.LOGIN_SUCCESS],
      REGISTER_SUCCESS:
        SUCCESS_RESPONSES[SUCCESS_RESPONSE_CODES.REGISTER_SUCCESS],
    },
    USER: {
      PROFILE_UPDATED:
        SUCCESS_RESPONSES[SUCCESS_RESPONSE_CODES.PROFILE_UPDATED],
    },
  },
  ERROR: {
    AUTH: {
      TOKEN_EXPIRED: ERROR_RESPONSES[ERROR_RESPONSE_CODES.TOKEN_EXPIRED],
      INVALID_TOKEN: ERROR_RESPONSES[ERROR_RESPONSE_CODES.INVALID_TOKEN],
      TOKEN_VERIFICATION_FAILED:
        ERROR_RESPONSES[ERROR_RESPONSE_CODES.TOKEN_VERIFICATION_FAILED],
      EMAIL_NOT_VERIFIED:
        ERROR_RESPONSES[ERROR_RESPONSE_CODES.EMAIL_NOT_VERIFIED],
      EMAIL_ALREADY_VERIFIED:
        ERROR_RESPONSES[ERROR_RESPONSE_CODES.EMAIL_ALREADY_VERIFIED],
      INVALID_CREDENTIALS:
        ERROR_RESPONSES[ERROR_RESPONSE_CODES.INVALID_CREDENTIALS],
      AUTH_MIDDLEWARE_ERROR:
        ERROR_RESPONSES[ERROR_RESPONSE_CODES.AUTH_MIDDLEWARE_ERROR],
      ADMIN_ACCESS_REQUIRED:
        ERROR_RESPONSES[ERROR_RESPONSE_CODES.ADMIN_ACCESS_REQUIRED],
      SUPERADMIN_ACCESS_REQUIRED:
        ERROR_RESPONSES[ERROR_RESPONSE_CODES.SUPERADMIN_ACCESS_REQUIRED],
    },
    USER: {
      USER_NOT_FOUND: ERROR_RESPONSES[ERROR_RESPONSE_CODES.USER_NOT_FOUND],
    },
    GROUP_WORD: {
      NOT_FOUND: ERROR_RESPONSES[ERROR_RESPONSE_CODES.GROUP_WORD_NOT_FOUND],
      LIMIT_REACHED:
        ERROR_RESPONSES[ERROR_RESPONSE_CODES.GROUP_WORD_LIMIT_REACHED],
      NOT_EMPTY: ERROR_RESPONSES[ERROR_RESPONSE_CODES.GROUP_WORD_NOT_EMPTY],
    },
    CATEGORY: {
      NOT_FOUND: ERROR_RESPONSES[ERROR_RESPONSE_CODES.CATEGORY_NOT_FOUND],
      LIMIT_REACHED:
        ERROR_RESPONSES[ERROR_RESPONSE_CODES.CATEGORY_LIMIT_REACHED],
      NOT_EMPTY: ERROR_RESPONSES[ERROR_RESPONSE_CODES.CATEGORY_NOT_EMPTY],
    },
    WORD: {
      NOT_FOUND: ERROR_RESPONSES[ERROR_RESPONSE_CODES.WORD_NOT_FOUND],
    },
    VALIDATION: {
      VALIDATION_ERROR: ERROR_RESPONSES[ERROR_RESPONSE_CODES.VALIDATION_ERROR],
      MISSING_TOKEN: ERROR_RESPONSES[ERROR_RESPONSE_CODES.MISSING_TOKEN],
      REQUIRE_EMAIL: ERROR_RESPONSES[ERROR_RESPONSE_CODES.REQUIRE_EMAIL],
      REQUIRE_PASSWORD: ERROR_RESPONSES[ERROR_RESPONSE_CODES.REQUIRE_PASSWORD],
      REQUIRE_REFRESH_TOKEN:
        ERROR_RESPONSES[ERROR_RESPONSE_CODES.REQUIRE_REFRESH_TOKEN],
      REQUIRE_RESET_TOKEN:
        ERROR_RESPONSES[ERROR_RESPONSE_CODES.REQUIRE_RESET_TOKEN],
      REQUIRE_VERIFICATION_TOKEN:
        ERROR_RESPONSES[ERROR_RESPONSE_CODES.REQUIRE_VERIFICATION_TOKEN],
      REQUIRED_FIELDS: ERROR_RESPONSES[ERROR_RESPONSE_CODES.REQUIRED_FIELDS],
      INVALID_ID: ERROR_RESPONSES[ERROR_RESPONSE_CODES.INVALID_ID],
      INVALID_ROLE: ERROR_RESPONSES[ERROR_RESPONSE_CODES.INVALID_ROLE],
    },
    SYSTEM: {
      TOO_MANY_REQUESTS:
        ERROR_RESPONSES[ERROR_RESPONSE_CODES.TOO_MANY_REQUESTS],
      SERVER_CONFIG_ERROR:
        ERROR_RESPONSES[ERROR_RESPONSE_CODES.SERVER_CONFIG_ERROR],
      UNKNOWN_ERROR: ERROR_RESPONSES[ERROR_RESPONSE_CODES.UNKNOWN_ERROR],
    },
  },
};
