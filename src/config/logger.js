/**
 * Logger Configuration
 * Structured logging using Winston
 * Provides consistent logging across the application
 * 
 * Log Levels:
 * - error: 0
 * - warn: 1
 * - info: 2
 * - http: 3
 * - debug: 4
 */

import winston from "winston";
import path from "path";

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "blue",
};

// Tell winston about our colors
winston.addColors(colors);

// Determine log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || "development";
  const isDevelopment = env === "development";
  return isDevelopment ? "debug" : "info";
};

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  // Add metadata if present
  if (Object.keys(metadata).length > 0) {
    // Filter out error stack from metadata for cleaner output
    const { stack, ...rest } = metadata;
    if (Object.keys(rest).length > 0) {
      msg += ` ${JSON.stringify(rest)}`;
    }
  }

  return msg;
});

// Custom format for file output
const fileFormat = combine(
  timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  errors({ stack: true }),
  json()
);

// Create transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: combine(
      colorize({ all: true }),
      timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      consoleFormat
    ),
  }),
];

// Add file transports in production
if (process.env.NODE_ENV === "production") {
  // Error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(process.cwd(), "logs", "error.log"),
      level: "error",
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: path.join(process.cwd(), "logs", "combined.log"),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true })
  ),
  transports,
  exitOnError: false,
});

// Create a stream object for Morgan HTTP logger
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

/**
 * Log HTTP request
 */
export const logRequest = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;

    logger.http("HTTP Request", {
      method,
      url: originalUrl,
      status: statusCode,
      duration: `${duration}ms`,
      ip,
      userAgent: req.get("user-agent"),
    });
  });

  next();
};

/**
 * Log service operation
 */
export const logService = (serviceName, operation, metadata = {}) => {
  logger.info(`[${serviceName}] ${operation}`, metadata);
};

/**
 * Log error
 */
export const logError = (error, context = "") => {
  logger.error(`Error${context ? ` in ${context}` : ""}`, {
    message: error.message,
    stack: error.stack,
    ...error,
  });
};

/**
 * Log database operation
 */
export const logDatabase = (operation, collection, metadata = {}) => {
  logger.debug(`[Database] ${operation} on ${collection}`, metadata);
};

/**
 * Log authentication event
 */
export const logAuth = (event, userId, metadata = {}) => {
  logger.info(`[Auth] ${event}`, {
    userId,
    ...metadata,
  });
};

/**
 * Create child logger with default metadata
 */
export const createChildLogger = (defaultMeta = {}) => {
  return logger.child(defaultMeta);
};

export default logger;

