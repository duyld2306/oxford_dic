import express from "express";
import BackupController from "../controllers/BackupController.js";
import { validateQuery, wordSchemas } from "../validators/index.js";

const router = express.Router();

// get /auth - initiate OAuth2 flow
router.get("/auth", BackupController.auth);

// OAuth2 callback (Google redirects here)
router.get("/oauth2callback", BackupController.oauth2callback);

// Trigger backup (expects token.json to exist). Use Joi validation for the `key` query param.
router.get(
  "/backup",
  validateQuery(wordSchemas.backupKey),
  BackupController.backup
);

export default router;
