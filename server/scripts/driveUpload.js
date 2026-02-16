const { google } = require("googleapis");
const fs = require("fs");

async function uploadToDrive(filePath, fileName) {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.google_service_account || "{}"),
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });

  const drive = google.drive({
    version: "v3",
    auth,
  });

  const folderId = process.env.DRIVE_FOLDER_ID;

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: "application/octet-stream",
      body: fs.createReadStream(filePath),
    },
  });

  console.log("✅ Backup subido a Drive:", response.data.id);
}

module.exports = uploadToDrive;
