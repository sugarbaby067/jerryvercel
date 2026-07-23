const crypto = require("crypto");

// Load config from env vars
function getConfig() {
  return {
    admin: {
      username: process.env.ADMIN_USERNAME || "admin",
      password: process.env.ADMIN_PASSWORD || "admin"
    },
    tokenSecret: process.env.TOKEN_SECRET || process.env.ADMIN_PASSWORD || "default-secret",
    corsOrigin: process.env.CORS_ORIGIN || "*",
    rateLimit: { loginAttempts: 5, loginWindowMs: 900000 }
  };
}

// In-memory rate limiting (resets on cold start — acceptable for low-traffic sites)
const loginAttempts = global._sbLoginAttempts = global._sbLoginAttempts || new Map();

function checkRateLimit(ip, config) {
  const key = `login:${ip}`;
  const now = Date.now();
  const window = config.rateLimit?.loginWindowMs || 900000;
  const maxAttempts = config.rateLimit?.loginAttempts || 5;

  const record = loginAttempts.get(key) || { attempts: 0, resetTime: now + window };

  if (now > record.resetTime) {
    record.attempts = 0;
    record.resetTime = now + window;
  }

  record.attempts++;
  loginAttempts.set(key, record);

  if (record.attempts > maxAttempts) {
    return { allowed: false, retryAfter: Math.ceil((record.resetTime - now) / 1000) };
  }

  return { allowed: true };
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

  // Rate limiting
  const clientIp =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket?.remoteAddress ||
    "unknown";

  const rateLimitCheck = checkRateLimit(clientIp, config);
  if (!rateLimitCheck.allowed) {
    res.setHeader("Retry-After", rateLimitCheck.retryAfter);
    return res.status(429).json({
      error: `Too many attempts. Try again in ${rateLimitCheck.retryAfter} seconds.`
    });
  }

  const body = req.body || {};
  const { username, password } = body;

  if (!username || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  const validUser = (config.admin.username || "").trim();
  const validPass = (config.admin.password || "").trim();

  if (!validUser || !validPass) {
    console.error("[AUTH] Config missing admin credentials");
    return res.status(500).json({
      error: "Server misconfigured. Check environment variables in Vercel project settings."
    });
  }

  // Timing-safe comparison
  const hashInput = crypto.createHash("sha256").update(password || "").digest("hex");
  const hashValid = crypto.createHash("sha256").update(validPass).digest("hex");

  const userMatch = (username || "").trim() === validUser;
  const passMatch = crypto.timingSafeEqual(Buffer.from(hashInput), Buffer.from(hashValid));

  if (userMatch && passMatch) {
    loginAttempts.delete(`login:${clientIp}`);

    const secret = config.tokenSecret || validPass;
    const expires = Date.now() + 1000 * 60 * 60 * 4; // 4 hours
    const payload = Buffer.from(JSON.stringify({ expires, iat: Date.now() })).toString("base64");
    const mac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    const token = `${payload}.${mac}`;

    console.log(`[AUTH] Login successful for ${username}`);

    return res.status(200).json({ success: true, token, expires });
  }

  // Deliberate delay on failure
  await new Promise(r => setTimeout(r, 800));

  console.warn(`[AUTH] Failed login attempt for ${username} from ${clientIp}`);

  return res.status(401).json({ success: false, error: "Invalid credentials" });
};
