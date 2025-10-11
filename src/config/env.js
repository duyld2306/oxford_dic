import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env if present
const envPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath });

const config = {
  PORT: process.env.PORT ? Number(process.env.PORT) : 4000,
  MONGO_URI: process.env.MONGO_URI || "",
  DB_NAME: process.env.DB_NAME || "oxford-dic",
  COLLECTION_NAME: process.env.COLLECTION_NAME || "words",

  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || "",

  // Email Configuration
  EMAIL_USER: process.env.EMAIL_USER || "",
  EMAIL_PASS: process.env.EMAIL_PASS || "",

  // Frontend URL
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:3000",

  // Token Expiration
  ACCESS_TOKEN_EXPIRE: process.env.ACCESS_TOKEN_EXPIRE || "15m",
  REFRESH_TOKEN_EXPIRE: process.env.REFRESH_TOKEN_EXPIRE || "7d",
};

export default config;
