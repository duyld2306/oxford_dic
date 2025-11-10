// Use the new streaming backup service that does not rely on mongodump
import BackupService from "../services/BackupService.js";
import { getAuthUrl, getTokenAndSave } from "../utils/driveClient.js";
import { respond } from "../utils/respond.js";

class BackupController {
  // GET /auth - redirect to Google consent
  auth = async (req, res) => {
    try {
      const url = getAuthUrl();
      return res.redirect(url);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  };

  // GET /oauth2callback?code= - exchange code and save token
  oauth2callback = async (req, res) => {
    const code = req.query.code;
    if (!code)
      return res
        .status(400)
        .json({ success: false, message: "Missing code parameter" });

    try {
      const tokens = await getTokenAndSave(code);
      return res.json({ success: true, tokens });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  };

  // GET /backup - perform backup and upload
  backup = async (req, res) => {
    try {
      const secret = process.env.BACKUP_SECRET;
      if (!secret) {
        return respond.error(res, "SYSTEM.SERVER_CONFIG_ERROR");
      }

      if (req.query.key !== secret) {
        return respond.error(res, "VALIDATION.INVALID_BACKUP_KEY");
      }

      const uploaded = await BackupService.backupWords();
      return res.json({
        success: true,
        status: "success",
        fileId: uploaded.id,
      });
    } catch (err) {
      console.error("BackupController.backup error:", err);
      return respond.error(res, "SYSTEM.UNKNOWN_ERROR", err.message);
    }
  };
}

export default new BackupController();
