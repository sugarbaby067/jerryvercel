const crypto = require("crypto");

function getConfig() {
  return {
    tokenSecret: process.env.TOKEN_SECRET || process.env.ADMIN_PASSWORD || "default-secret",
    admin: { password: process.env.ADMIN_PASSWORD || "admin" },
    corsOrigin: process.env.CORS_ORIGIN || "*"
  };
}

function verifyToken(token, config) {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "Invalid token format" };
  }

  try {
    const [payloadB64, mac] = token.split(".");
    if (!payloadB64 || !mac) {
      return { valid: false, error: "Malformed token" };
    }

    const secret = config.tokenSecret || config.admin?.password;
    if (!secret) {
      return { valid: false, error: "Server misconfigured" };
    }

    const expectedMac = crypto.createHmac("sha256", secret).update(payloadB64).digest("hex");
    const macValid = crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expectedMac));

    if (!macValid) {
      return { valid: false, error: "Invalid signature" };
    }

    const payload = JSON.parse(Buffer.from(payloadB64, "base64").toString());

    if (Date.now() > payload.expires) {
      return { valid: false, error: "Token expired" };
    }

    if (payload.iat && payload.iat > Date.now() + 60000) {
      return { valid: false, error: "Invalid token issuance time" };
    }

    return { valid: true, payload };
  } catch (err) {
    console.error("[VERIFY] Token verification failed:", err.message);
    return { valid: false, error: "Token verification failed" };
  }
}

module.exports = async (req, res) => {
  const config = getConfig();

  res.setHeader("Access-Control-Allow-Origin", config.corsOrigin);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body || {};
  const { token } = body;

  if (!token) {
    return res.status(400).json({ valid: false, error: "Missing token" });
  }

  const result = verifyToken(token, config);
  return res.status(200).json(result);
};

module.exports.verifyToken = verifyToken;
module.exports.getConfig = getConfig;
