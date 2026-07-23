const { verifyToken, getConfig: getAuthConfig } = require("./verify.js");

function getConfig() {
  return {
    corsOrigin: process.env.CORS_ORIGIN || "*",
    // Free JSON storage at jsonbin.io — sign up free, create a bin, put ID + key here
    jsonbinId: process.env.JSONBIN_ID || "",
    jsonbinKey: process.env.JSONBIN_KEY || ""
  };
}

const DEFAULT_STATE = {
  tags: ["IT", "Media Tech", "AI", "Digital Creator"],
  brandTag: "Sugar BaBy Inc.",
  links: [
    { id: "tiktok", platform: "TikTok", handle: "@rawdaddy.69", url: "https://www.tiktok.com/@rawdaddy.69", icon: "tiktok" },
    { id: "instagram", platform: "Instagram", handle: "@sugarbaby.067", url: "https://www.instagram.com/sugarbaby.067", icon: "instagram" },
    { id: "snapchat", platform: "Snapchat", handle: "@sugarbaby.069", url: "https://www.snapchat.com/add/sugarbaby.069", icon: "snapchat" },
    { id: "whatsapp", platform: "WhatsApp", handle: "Chat with me", url: "https://wa.me/qr/GTXGW7SAOS72B1", icon: "whatsapp" },
    { id: "telegram", platform: "Telegram", handle: "@SugarBaby047", url: "https://t.me/SugarBaby047", icon: "telegram" },
    { id: "linkedin", platform: "LinkedIn", handle: "Coming soon", url: "#", icon: "linkedin" }
  ],
  profilePhoto: null,
  bio: "Creative entrepreneur & tech builder",
  lastUpdated: Date.now()
};

// In-memory cache (works within a single warm function instance; not persistent across cold starts)
let memoryCache = null;

async function loadPortfolioData(config) {
  if (config.jsonbinId && config.jsonbinKey) {
    try {
      const res = await fetch(`https://api.jsonbin.io/v3/b/${config.jsonbinId}/latest`, {
        headers: { "X-Master-Key": config.jsonbinKey }
      });
      if (res.ok) {
        const json = await res.json();
        return json.record || DEFAULT_STATE;
      }
    } catch (e) {
      console.error("[PORTFOLIO] jsonbin load failed:", e.message);
    }
  }
  // Fallback: in-memory (per warm instance only) or default
  return memoryCache || DEFAULT_STATE;
}

async function savePortfolioData(data, config) {
  memoryCache = data; // always keep a warm-instance copy

  if (config.jsonbinId && config.jsonbinKey) {
    try {
      const res = await fetch(`https://api.jsonbin.io/v3/b/${config.jsonbinId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Master-Key": config.jsonbinKey
        },
        body: JSON.stringify(data)
      });
      return res.ok;
    } catch (e) {
      console.error("[PORTFOLIO] jsonbin save failed:", e.message);
      return false;
    }
  }

  // No external storage configured — data only persists in memory for this warm instance
  console.warn("[PORTFOLIO] No JSONBIN_ID/JSONBIN_KEY set — changes will not persist across cold starts");
  return true;
}

function validatePortfolioData(data) {
  const errors = [];

  if (!Array.isArray(data.tags)) {
    errors.push("tags must be an array");
  } else if (data.tags.some(t => typeof t !== "string" || t.trim().length === 0)) {
    errors.push("all tags must be non-empty strings");
  } else if (data.tags.length > 20) {
    errors.push("maximum 20 tags allowed");
  }

  if (typeof data.brandTag !== "string" || data.brandTag.trim().length === 0) {
    errors.push("brandTag must be a non-empty string");
  } else if (data.brandTag.length > 100) {
    errors.push("brandTag cannot exceed 100 characters");
  }

  if (typeof data.bio !== "string" || data.bio.length > 500) {
    errors.push("bio must be a string (max 500 chars)");
  }

  if (!Array.isArray(data.links)) {
    errors.push("links must be an array");
  } else {
    data.links.forEach((link, i) => {
      if (!link.id || !link.platform || !link.url) {
        errors.push(`link ${i}: missing required fields (id, platform, url)`);
      }
      if (link.platform && link.platform.length > 50) {
        errors.push(`link ${i}: platform name too long`);
      }
      if (link.handle && link.handle.length > 100) {
        errors.push(`link ${i}: handle too long`);
      }
      try {
        new URL(link.url);
      } catch {
        if (link.url !== "#") {
          errors.push(`link ${i}: invalid URL`);
        }
      }
    });
  }

  return errors;
}

module.exports = async (req, res) => {
  const config = getConfig();

  res.setHeader("Access-Control-Allow-Origin", config.corsOrigin);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method === "GET") {
    const data = await loadPortfolioData(config);
    return res.status(200).json({ success: true, data });
  }

  if (req.method === "POST") {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");

    const authConfig = getAuthConfig();
    const tokenVerification = verifyToken(token, authConfig);
    if (!tokenVerification.valid) {
      return res.status(401).json({ error: "Unauthorized", details: tokenVerification.error });
    }

    const body = req.body || {};

    const validationErrors = validatePortfolioData(body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: "Validation failed", details: validationErrors });
    }

    const updatedData = { ...body, lastUpdated: Date.now() };

    const saved = await savePortfolioData(updatedData, config);
    if (saved) {
      console.log("[PORTFOLIO] Data updated successfully");
      return res.status(200).json({ success: true, data: updatedData });
    } else {
      return res.status(500).json({ error: "Failed to save portfolio data" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
