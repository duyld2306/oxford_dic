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
  INTERNAL_SERVER_ERROR: 500,
};

// Error Messages
export const ERROR_MESSAGES = {
  // User errors
  USER_NOT_FOUND: "User not found",
  USER_ALREADY_EXISTS: "User already exists",
  INVALID_CREDENTIALS: "Invalid credentials",
  INVALID_GENDER: "Invalid gender value",
  INVALID_ROLE: "Invalid role value",
  CANNOT_CHANGE_SUPERADMIN_ROLE: "Cannot change superadmin role",

  // Auth errors
  UNAUTHORIZED: "Unauthorized",
  INVALID_TOKEN: "Invalid token",
  TOKEN_EXPIRED: "Token expired",
  MISSING_TOKEN: "Missing authentication token",

  // Group Word errors
  GROUP_WORD_NOT_FOUND: "Group word not found",
  MAX_GROUP_WORDS_REACHED: "Maximum number of group words reached",
  GROUP_WORD_NAME_REQUIRED: "Group word name is required",

  // Category errors
  CATEGORY_NOT_FOUND: "Category not found",
  MAX_CATEGORIES_REACHED: "Maximum number of categories reached",
  CATEGORY_NAME_REQUIRED: "Category name is required",

  // Word errors
  WORD_NOT_FOUND: "Word not found",
  WORD_ID_REQUIRED: "Word ID is required",

  // Flashcard errors
  FLASHCARD_NOT_FOUND: "Flashcard not found",
  FLASHCARD_GROUP_NOT_FOUND: "Flashcard group not found",
  FLASHCARD_ALREADY_EXISTS: "Flashcard already exists in this group",
  INVALID_FLASHCARD_STATUS: "Invalid flashcard status",
  INVALID_SOURCE_TYPE: "Invalid source type",

  // General errors
  VALIDATION_ERROR: "Validation error",
  INTERNAL_ERROR: "Internal server error",
  RESOURCE_NOT_FOUND: "Resource not found",
  PERMISSION_DENIED: "Permission denied",
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

