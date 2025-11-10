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

  // System
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",
  SERVER_CONFIG_ERROR: "SERVER_CONFIG_ERROR",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
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
  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  MISSING_TOKEN: "MISSING_TOKEN",
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
    error_code: "TOKEN_EXPIRED",
  },
  [ERROR_RESPONSE_CODES.INVALID_TOKEN]: {
    message: "Invalid access token",
    status_code: 401,
    error_code: "INVALID_TOKEN",
  },
  [ERROR_RESPONSE_CODES.TOKEN_VERIFICATION_FAILED]: {
    message: "Token verification failed",
    status_code: 401,
    error_code: "TOKEN_VERIFICATION_FAILED",
  },
  [ERROR_RESPONSE_CODES.EMAIL_NOT_VERIFIED]: {
    message: "Email not verified",
    status_code: 401,
    error_code: "EMAIL_NOT_VERIFIED",
  },
  [ERROR_RESPONSE_CODES.EMAIL_ALREADY_VERIFIED]: {
    message: "Email already verified",
    status_code: 400,
    error_code: "EMAIL_ALREADY_VERIFIED",
  },
  [ERROR_RESPONSE_CODES.INVALID_CREDENTIALS]: {
    message: "Invalid email or password",
    status_code: 401,
    error_code: "INVALID_CREDENTIALS",
  },
  [ERROR_RESPONSE_CODES.AUTH_MIDDLEWARE_ERROR]: {
    message: "Authentication middleware error",
    status_code: 500,
    error_code: "AUTH_MIDDLEWARE_ERROR",
  },
  [ERROR_RESPONSE_CODES.ADMIN_ACCESS_REQUIRED]: {
    message: "Admin access required",
    status_code: 403,
    error_code: "ADMIN_ACCESS_REQUIRED",
  },
  [ERROR_RESPONSE_CODES.SUPERADMIN_ACCESS_REQUIRED]: {
    message: "Superadmin access required",
    status_code: 403,
    error_code: "SUPERADMIN_ACCESS_REQUIRED",
  },
  // User
  [ERROR_RESPONSE_CODES.USER_NOT_FOUND]: {
    message: "User not found",
    status_code: 404,
    error_code: "USER_NOT_FOUND",
  },
  // Validation
  [ERROR_RESPONSE_CODES.VALIDATION_ERROR]: {
    message: "Validation failed",
    status_code: 400,
    error_code: "VALIDATION_ERROR",
  },
  [ERROR_RESPONSE_CODES.MISSING_TOKEN]: {
    message: "Access token required",
    status_code: 400,
    error_code: "MISSING_TOKEN",
  },
  [ERROR_RESPONSE_CODES.INVALID_BACKUP_KEY]: {
    message: "Invalid backup key",
    status_code: 403,
    error_code: "INVALID_BACKUP_KEY",
  },
  // System
  [ERROR_RESPONSE_CODES.TOO_MANY_REQUESTS]: {
    message: "Too many requests",
    status_code: 429,
    error_code: "TOO_MANY_REQUESTS",
  },
  [ERROR_RESPONSE_CODES.SERVER_CONFIG_ERROR]: {
    message: "Server configuration error",
    status_code: 500,
    error_code: "SERVER_CONFIG_ERROR",
  },
  [ERROR_RESPONSE_CODES.UNKNOWN_ERROR]: {
    message: "An unexpected error occurred",
    status_code: 500,
    error_code: "UNKNOWN_ERROR",
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
    VALIDATION: {
      VALIDATION_ERROR: ERROR_RESPONSES[ERROR_RESPONSE_CODES.VALIDATION_ERROR],
      MISSING_TOKEN: ERROR_RESPONSES[ERROR_RESPONSE_CODES.MISSING_TOKEN],
      INVALID_BACKUP_KEY:
        ERROR_RESPONSES[ERROR_RESPONSE_CODES.INVALID_BACKUP_KEY],
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
