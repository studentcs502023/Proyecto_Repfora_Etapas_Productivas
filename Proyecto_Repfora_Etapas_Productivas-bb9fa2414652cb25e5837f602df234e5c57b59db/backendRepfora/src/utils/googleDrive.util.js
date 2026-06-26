import { google } from 'googleapis';
import { Readable } from 'node:stream';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let driveClient = null;

function getDriveClient() {
  if (driveClient) return driveClient;

  const useOAuth = process.env.GOOGLE_CLIENT_ID
    && process.env.GOOGLE_CLIENT_SECRET
    && process.env.GOOGLE_REFRESH_TOKEN;

  if (useOAuth) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    driveClient = google.drive({ version: 'v3', auth: oauth2Client });
    return driveClient;
  }

  const credentialsPath = path.join(__dirname, '..', '..', 'google-credentials.json');

  if (!fs.existsSync(credentialsPath)) {
    throw new Error('google-credentials.json not found in backendRepfora/ and OAuth env vars not fully set');
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: credentialsPath,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  driveClient = google.drive({ version: 'v3', auth });
  return driveClient;
}

function getRootFolderId() {
  if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
    return process.env.GOOGLE_DRIVE_FOLDER_ID;
  }
  if (process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID) {
    return process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID;
  }
  return null;
}

function isSharedDrive() {
  return !!process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID;
}

async function findOrCreateFolder(drive, folderName, parentId = null) {
  const escapedName = folderName.replace(/'/g, "\\'");
  let query = `name = '${escapedName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }

  const listParams = {
    q: query,
    fields: 'files(id, name)',
    pageSize: 1,
  };

  if (isSharedDrive()) {
    listParams.supportsAllDrives = true;
    listParams.corpora = 'drive';
    listParams.driveId = process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID;
    listParams.includeItemsFromAllDrives = true;
  }

  const res = await drive.files.list(listParams);

  if (res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentId ? [parentId] : [],
  };

  const createParams = {
    resource: fileMetadata,
    fields: 'id',
  };

  if (isSharedDrive()) {
    createParams.supportsAllDrives = true;
    createParams.resource.driveId = process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID;
  }

  const folder = await drive.files.create(createParams);
  return folder.data.id;
}

async function uploadToFolder(file, parentId, customName = null) {
  const drive = getDriveClient();

  const fileMetadata = {
    name: customName || file.originalname || 'documento.pdf',
    parents: parentId ? [parentId] : [],
  };

  if (isSharedDrive()) {
    fileMetadata.driveId = process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID;
  }

  const buffer = file.buffer || file.content;
  if (!buffer) {
    throw new Error('File buffer is required for upload');
  }

  const media = {
    mimeType: file.mimetype || 'application/pdf',
    body: Readable.from(buffer),
  };

  const createParams = {
    resource: fileMetadata,
    media: media,
    fields: 'id, webViewLink',
  };

  if (isSharedDrive()) {
    createParams.supportsAllDrives = true;
  }

  const response = await drive.files.create(createParams);

  const fileId = response.data.id;

  try {
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        type: 'anyone',
        role: 'reader',
      },
      ...(isSharedDrive() ? { supportsAllDrives: true } : {}),
    });
  } catch (permErr) {
    console.warn(
      `[googleDrive] Could not set public permission on ${fileId}:`,
      permErr.message
    );
  }

  return {
    driveFileId: fileId,
    driveFileUrl: response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
    fileName: fileMetadata.name,
  };
}

/**
 * Upload a file to an apprentice's folder structure.
 *
 *   CARPETA COMPARTIDA (GOOGLE_DRIVE_FOLDER_ID)
 *   o SHARED DRIVE (GOOGLE_DRIVE_SHARED_DRIVE_ID)
 *     /{nationalId}/
 *       seguimientos/
 *       bitacoras/
 *       documentos/
 *       novedades/
 *
 * @param {Object} file         - { originalname, buffer, mimetype }
 * @param {string} nationalId   - Cedula del aprendiz
 * @param {string} category     - 'seguimientos' | 'bitacoras' | 'documentos' | 'novedades'
 * @param {string} [customName] - Nombre personalizado para el archivo
 */
async function uploadToApprenticeFolder(file, nationalId, category, customName = null) {
  const drive = getDriveClient();

  let rootId = getRootFolderId();

  if (!rootId) {
    rootId = await findOrCreateFolder(drive, 'REPFORA', null);
  }

  const apprenticeFolderId = await findOrCreateFolder(drive, nationalId, rootId);
  const categoryFolderId = await findOrCreateFolder(drive, category, apprenticeFolderId);

  return uploadToFolder(file, categoryFolderId, customName);
}

async function deleteFile(fileId) {
  try {
    const drive = getDriveClient();
    const params = { fileId };
    if (isSharedDrive()) {
      params.supportsAllDrives = true;
    }
    await drive.files.delete(params);
  } catch (err) {
    console.warn(`[googleDrive] Could not delete file ${fileId}:`, err.message);
  }
}

export { uploadToApprenticeFolder, uploadToFolder, deleteFile, findOrCreateFolder, getRootFolderId, getDriveClient };
