/**
 * Application Constants
 * Centralized location for all application constants
 */

// User Constants
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

// Flashcard Constants
export const FLASHCARD_STATUS = {
  NEW: "new",
  LEARNING: "learning",
  MASTERED: "mastered",
};

export const FLASHCARD_GROUP_SOURCE_TYPES = {
  GROUP_WORD: "group_word",
  MANUAL: "manual",
};

// Word Constants
export const WORD_SYMBOLS = {
  A1: "a1",
  A2: "a2",
  B1: "b1",
  B2: "b2",
  C1: "c1",
  OTHER: "other",
};

// Limits
export const LIMITS = {
  MAX_GROUP_WORDS_PER_USER: 20,
  MAX_CATEGORIES_PER_USER: 20,
  DEFAULT_PAGE_SIZE: 100,
  MAX_PAGE_SIZE: 1000,
  MIN_PAGE_SIZE: 1,
  BCRYPT_SALT_ROUNDS: 12,
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PER_PAGE: 100,
};

// JWT
export const JWT = {
  ACCESS_TOKEN_EXPIRY: "1d",
  REFRESH_TOKEN_EXPIRY: "7d",
};

// HTTP Status Codes
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

// Error Messages
export const ERROR_MESSAGES = {
  // Validation
  [ERROR_CODES.VALIDATION_ERROR]: "Validation failed",
  [ERROR_CODES.MISSING_TOKEN]: "Access token required",
  [ERROR_CODES.REQUIRED_FIELDS]: "Required fields are missing",
  [ERROR_CODES.INVALID_ID]: "Invalid ID format",
  [ERROR_CODES.INVALID_ROLE]: "Invalid role. Must be 'admin' or 'user'",
  [ERROR_CODES.INVALID_GENDER]: "Invalid gender value",

  // Auth
  [ERROR_CODES.TOKEN_EXPIRED]: "Access token expired",
  [ERROR_CODES.INVALID_TOKEN]: "Invalid access token",
  [ERROR_CODES.TOKEN_VERIFICATION_FAILED]: "Token verification failed",
  [ERROR_CODES.INVALID_CREDENTIALS]: "Invalid email or password",
  [ERROR_CODES.EMAIL_NOT_VERIFIED]: "Email not verified",
  [ERROR_CODES.EMAIL_ALREADY_VERIFIED]: "Email already verified",
  [ERROR_CODES.ADMIN_ACCESS_REQUIRED]: "Admin access required",
  [ERROR_CODES.SUPERADMIN_ACCESS_REQUIRED]: "Superadmin access required",

  // User
  [ERROR_CODES.USER_NOT_FOUND]: "User not found",
  [ERROR_CODES.USER_ALREADY_EXISTS]: "User already exists",

  // Group Word
  [ERROR_CODES.GROUP_WORD_NOT_FOUND]: "Group word not found",
  [ERROR_CODES.GROUP_WORD_LIMIT_REACHED]:
    "Cannot create more than 20 group words",
  [ERROR_CODES.GROUP_WORD_NOT_EMPTY]:
    "Cannot delete group word with words in it",

  // Category
  [ERROR_CODES.CATEGORY_NOT_FOUND]: "Category not found",
  [ERROR_CODES.CATEGORY_LIMIT_REACHED]: "Cannot create more than 20 categories",
  [ERROR_CODES.CATEGORY_NOT_EMPTY]: "Cannot delete category with words in it",

  // Word
  [ERROR_CODES.WORD_NOT_FOUND]: "Word not found",

  // Flashcard
  [ERROR_CODES.FLASHCARD_NOT_FOUND]: "Flashcard not found",
  [ERROR_CODES.FLASHCARD_GROUP_NOT_FOUND]: "Flashcard group not found",
  [ERROR_CODES.FLASHCARD_ALREADY_EXISTS]:
    "Flashcard already exists in this group",
  [ERROR_CODES.INVALID_FLASHCARD_STATUS]: "Invalid flashcard status",

  // System
  [ERROR_CODES.TOO_MANY_REQUESTS]: "Too many requests",
  [ERROR_CODES.SERVER_CONFIG_ERROR]: "Server configuration error",
  [ERROR_CODES.UNKNOWN_ERROR]: "An unexpected error occurred",
  [ERROR_CODES.INTERNAL_ERROR]: "Internal server error",
  [ERROR_CODES.PERMISSION_DENIED]: "Permission denied",
};

// Success Messages
export const SUCCESS_MESSAGES = {
  // User
  USER_CREATED: "User created successfully",
  USER_UPDATED: "User updated successfully",
  USER_DELETED: "User deleted successfully",
  USER_VERIFIED: "User verified successfully",

  // Auth
  LOGIN_SUCCESS: "Login successful",
  LOGOUT_SUCCESS: "Logout successful",
  REGISTER_SUCCESS: "Registration completed successfully",
  TOKEN_REFRESHED: "Token refreshed successfully",

  // Group Word
  GROUP_WORD_CREATED: "Group word created successfully",
  GROUP_WORD_UPDATED: "Group word updated successfully",
  GROUP_WORD_DELETED: "Group word deleted successfully",
  WORD_ADDED_TO_GROUP: "Word added to group successfully",
  WORD_REMOVED_FROM_GROUP: "Word removed from group successfully",

  // Category
  CATEGORY_CREATED: "Category created successfully",
  CATEGORY_UPDATED: "Category updated successfully",
  CATEGORY_DELETED: "Category deleted successfully",
  WORD_ADDED_TO_CATEGORY: "Word added to category successfully",
  WORD_REMOVED_FROM_CATEGORY: "Word removed from category successfully",

  // Flashcard
  FLASHCARD_GROUP_CREATED: "Flashcard group created successfully",
  FLASHCARD_GROUP_UPDATED: "Flashcard group updated successfully",
  FLASHCARD_GROUP_DELETED: "Flashcard group deleted successfully",
  FLASHCARD_GROUP_SYNCED: "Flashcard group synced successfully",
  FLASHCARD_ADDED: "Flashcard added successfully",
  FLASHCARD_REMOVED: "Flashcard removed successfully",
  FLASHCARD_STATUS_UPDATED: "Flashcard status updated successfully",
};

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
