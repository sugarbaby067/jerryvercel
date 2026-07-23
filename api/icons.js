function getConfig() {
  return { corsOrigin: process.env.CORS_ORIGIN || "*" };
}

const ICONS = {
  social: {
    tiktok: { name: "TikTok", url: "https://cdn.simpleicons.org/tiktok", color: "#000000", source: "simpleicons" },
    instagram: { name: "Instagram", url: "https://cdn.simpleicons.org/instagram", color: "#E4405F", source: "simpleicons" },
    snapchat: { name: "Snapchat", url: "https://cdn.simpleicons.org/snapchat", color: "#FFFC00", source: "simpleicons" },
    whatsapp: { name: "WhatsApp", url: "https://cdn.simpleicons.org/whatsapp", color: "#25D366", source: "simpleicons" },
    telegram: { name: "Telegram", url: "https://cdn.simpleicons.org/telegram", color: "#0088cc", source: "simpleicons" },
    linkedin: { name: "LinkedIn", url: "https://cdn.simpleicons.org/linkedin", color: "#0A66C2", source: "simpleicons" },
    youtube: { name: "YouTube", url: "https://cdn.simpleicons.org/youtube", color: "#FF0000", source: "simpleicons" },
    twitter: { name: "Twitter (X)", url: "https://cdn.simpleicons.org/x", color: "#000000", source: "simpleicons" },
    facebook: { name: "Facebook", url: "https://cdn.simpleicons.org/facebook", color: "#1877F2", source: "simpleicons" },
    github: { name: "GitHub", url: "https://cdn.simpleicons.org/github", color: "#181717", source: "simpleicons" },
    dribbble: { name: "Dribbble", url: "https://cdn.simpleicons.org/dribbble", color: "#EA4C89", source: "simpleicons" },
    behance: { name: "Behance", url: "https://cdn.simpleicons.org/behance", color: "#1769FF", source: "simpleicons" },
    pinterest: { name: "Pinterest", url: "https://cdn.simpleicons.org/pinterest", color: "#E60023", source: "simpleicons" },
    twitch: { name: "Twitch", url: "https://cdn.simpleicons.org/twitch", color: "#9146FF", source: "simpleicons" }
  },
  ui: {
    link: { name: "Link", url: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/svgs/solid/link.svg", source: "fontawesome" },
    globe: { name: "Globe/Website", url: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/svgs/solid/globe.svg", source: "fontawesome" },
    envelope: { name: "Email", url: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/svgs/solid/envelope.svg", source: "fontawesome" },
    phone: { name: "Phone", url: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/svgs/solid/phone.svg", source: "fontawesome" },
    map: { name: "Location", url: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/svgs/solid/map-pin.svg", source: "fontawesome" },
    briefcase: { name: "Work", url: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/svgs/solid/briefcase.svg", source: "fontawesome" },
    code: { name: "Code/Development", url: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/svgs/solid/code.svg", source: "fontawesome" },
    download: { name: "Download", url: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/svgs/solid/download.svg", source: "fontawesome" },
    share: { name: "Share", url: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/svgs/solid/share-nodes.svg", source: "fontawesome" }
  }
};

module.exports = async (req, res) => {
  const config = getConfig();

  res.setHeader("Access-Control-Allow-Origin", config.corsOrigin);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const category = req.query?.category;
  const all = req.query?.all === "true";

  let icons;
  if (all) {
    icons = { ...ICONS.social, ...ICONS.ui };
  } else if (category === "ui") {
    icons = ICONS.ui;
  } else {
    icons = ICONS.social;
  }

  return res.status(200).json({
    success: true,
    icons,
    total: Object.keys(icons).length,
    categories: ["social", "ui"]
  });
};
