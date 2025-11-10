import {
  getAuthenticatedClient,
  uploadFileToDrive,
  loadSavedToken,
} from "../utils/driveClient.js";

/**
 * googleDrive.service
 * - Wraps drive upload logic using existing utils/driveClient
 */
class GoogleDriveService {
  constructor(logger = console) {
    this.logger = logger;
  }

  async upload(filePath, fileName) {
    const token = await loadSavedToken();
    if (!token)
      throw new Error("No token.json found. Visit /auth to obtain consent");

    const auth = await getAuthenticatedClient();
    const folderId = process.env.GOOGLE_FOLDER_ID || null;
    this.logger.info(
      `Uploading ${fileName} to Google Drive ${
        folderId ? `(folder ${folderId})` : "(root)"
      }`
    );
    const uploaded = await uploadFileToDrive(
      auth,
      filePath,
      fileName,
      folderId
    );
    return uploaded;
  }
}

export default new GoogleDriveService();
