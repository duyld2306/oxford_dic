import fs from "fs";
import path from "path";
import { google } from "googleapis";

const TOKEN_PATH = path.resolve(process.cwd(), "token.json");

// Create OAuth2 client from environment variables
export function createOAuth2Client() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } =
    process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new Error("Missing Google OAuth2 environment variables. See .env");
  }

  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

// Return auth URL to redirect user for consent
export function getAuthUrl() {
  const oAuth2Client = createOAuth2Client();
  const SCOPES = ["https://www.googleapis.com/auth/drive.file"];
  return oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
}

// Exchange code for tokens and save to token.json
export async function getTokenAndSave(code) {
  const oAuth2Client = createOAuth2Client();
  const { tokens } = await oAuth2Client.getToken(code);
  await fs.promises.writeFile(
    TOKEN_PATH,
    JSON.stringify(tokens, null, 2),
    "utf8"
  );
  return tokens;
}

// Load saved token or return null
export async function loadSavedToken() {
  try {
    const txt = await fs.promises.readFile(TOKEN_PATH, "utf8");
    return JSON.parse(txt);
  } catch (err) {
    return null;
  }
}

// Get an authenticated OAuth2 client (throws if no token)
export async function getAuthenticatedClient() {
  const oAuth2Client = createOAuth2Client();
  const token = await loadSavedToken();
  if (!token)
    throw new Error("No token.json found. Visit /auth to obtain consent");
  oAuth2Client.setCredentials(token);
  return oAuth2Client;
}

// Upload a file to Google Drive; if folderId is provided, upload into that folder
export async function uploadFileToDrive(
  authClient,
  filePath,
  fileName,
  folderId = null
) {
  const drive = google.drive({ version: "v3", auth: authClient });

  const makeMedia = () => ({
    mimeType: "application/gzip",
    body: fs.createReadStream(filePath),
  });

  const makeFileMetadata = (parentId) => {
    const meta = { name: fileName };
    if (parentId) meta.parents = [parentId];
    return meta;
  };

  try {
    const res = await drive.files.create({
      requestBody: makeFileMetadata(folderId),
      media: makeMedia(),
      fields: "id,name,parents",
      supportsAllDrives: true,
    });
    return res.data;
  } catch (err) {
    const isFileNotFound = err?.message?.includes("File not found");
    if (!folderId || !isFileNotFound) throw err;

    try {
      const escapedName = String(folderId).replace(/'/g, "\\'");
      const q = [
        "mimeType = 'application/vnd.google-apps.folder'",
        `name = '${escapedName}'`,
        "trashed = false",
      ].join(" and ");

      const listRes = await drive.files.list({
        q,
        fields: "files(id, name)",
        spaces: "drive",
        supportsAllDrives: true,
      });

      let resolvedId = null;
      if (Array.isArray(listRes.data.files) && listRes.data.files.length > 0) {
        resolvedId = listRes.data.files[0].id;
      } else {
        const createRes = await drive.files.create({
          requestBody: {
            name: folderId,
            mimeType: "application/vnd.google-apps.folder",
          },
          fields: "id,name",
          supportsAllDrives: true,
        });
        resolvedId = createRes.data.id;
      }

      const retryRes = await drive.files.create({
        requestBody: makeFileMetadata(resolvedId),
        media: makeMedia(),
        fields: "id,name,parents",
        supportsAllDrives: true,
      });
      return retryRes.data;
    } catch (innerErr) {
      throw err;
    }
  }
}
