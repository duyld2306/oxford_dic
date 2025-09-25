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
};

export default config;
