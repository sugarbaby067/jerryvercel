const crypto = require("crypto");
const { verifyToken, getConfig: getAuthConfig } = require("./verify.js");

function getConfig() {
  return {
    corsOrigin: process.env.CORS_ORIGIN || "*",
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "5242880") // 5MB default
  };
}

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function validateFile(buffer, mimeType, maxFileSize) {
  const errors = [];

  if (!ALLOWED_TYPES.has(mimeType)) {
    errors.push(`File type not allowed. Allowed: ${Array.from(ALLOWED_TYPES).join(", ")}`);
  }

  if (buffer.length > maxFileSize) {
    errors.push(`File size exceeds limit of ${maxFileSize / 1024 / 1024}MB`);
  }

  const magicNumbers = {
    "image/jpeg": [0xff, 0xd8, 0xff],
    "image/png": [0x89, 0x50, 0x4e, 0x47],
    "image/webp": [0x52, 0x49, 0x46, 0x46],
    "image/gif": [0x47, 0x49, 0x46]
  };

  const expected = magicNumbers[mimeType];
  if (expected) {
    const actual = Array.from(buffer.slice(0, expected.length));
    if (!actual.every((b, i) => b === expected[i])) {
      errors.push("File signature validation failed (possible corrupted file)");
    }
  }

  return errors;
}

// Vercel needs raw body for file uploads — disable the default JSON body parser
module.exports.config = {
  api: {
    bodyParser: false
  }
};

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

module.exports = async (req, res) => {
  const config = getConfig();

  res.setHeader("Access-Control-Allow-Origin", config.corsOrigin);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");

  const authConfig = getAuthConfig();
  const tokenVerification = verifyToken(token, authConfig);
  if (!tokenVerification.valid) {
    return res.status(401).json({ error: "Unauthorized", details: tokenVerification.error });
  }

  try {
    const mimeType = req.headers["content-type"] || "image/jpeg";
    const fileBuffer = await readRawBody(req);

    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({ error: "No file provided" });
    }

    const validationErrors = validateFile(fileBuffer, mimeType, config.maxFileSize);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: "File validation failed", details: validationErrors });
    }

    const dataUrl = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;

    console.log(`[UPLOAD] File uploaded successfully (${fileBuffer.length} bytes)`);

    return res.status(200).json({
      success: true,
      file: {
        size: fileBuffer.length,
        mimeType,
        dataUrl,
        uploadedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error("[UPLOAD] Error processing file:", err.message);
    return res.status(500).json({ error: "File processing failed", details: err.message });
  }
};
