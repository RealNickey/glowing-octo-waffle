import { google } from "googleapis";
import fs from "fs";
import path from "path";

// Simple token store on disk for dev. In production, replace with DB or secret store.
const TOKENS_DIR = path.join(process.cwd(), "tokens");
const TOKENS_PATH = path.join(TOKENS_DIR, "youtube_tokens.json");

const YT_SCOPE = "https://www.googleapis.com/auth/youtube.upload";

export function getOAuthClient() {
  const {
    YT_CLIENT_ID: clientId,
    YT_CLIENT_SECRET: clientSecret,
    YT_REDIRECT_URI: redirectUri,
  } = process.env;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Missing YouTube OAuth env. Set YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REDIRECT_URI."
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl() {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [YT_SCOPE],
    prompt: "consent",
  });
}

export function loadTokens() {
  try {
    if (fs.existsSync(TOKENS_PATH)) {
      const raw = fs.readFileSync(TOKENS_PATH, "utf-8");
      const tokens = JSON.parse(raw);
      return tokens;
    }
  } catch {}
  return null;
}

export function saveTokens(tokens) {
  try {
    if (!fs.existsSync(TOKENS_DIR))
      fs.mkdirSync(TOKENS_DIR, { recursive: true });
    fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));
  } catch (e) {
    console.error("Failed to persist YouTube tokens:", e);
  }
}

export async function exchangeCodeForTokens(code) {
  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  saveTokens(tokens);
  return tokens;
}

export function getAuthedClientOrNull() {
  const tokens = loadTokens();
  if (!tokens) return null;
  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials(tokens);
  // Keep tokens fresh on refresh
  oauth2Client.on("tokens", (t) => {
    // Persist new refresh/access tokens when they rotate
    saveTokens({ ...oauth2Client.credentials, ...t });
  });
  return oauth2Client;
}

export async function uploadToYouTube({
  filePath,
  title = "My Video",
  description = "",
  tags = [],
  privacyStatus = "unlisted",
}) {
  const auth = getAuthedClientOrNull();
  if (!auth) {
    return {
      ok: false,
      needsAuth: true,
      authUrl: getAuthUrl(),
    };
  }

  const youtube = google.youtube({ version: "v3", auth });

  // Validate file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`Video file not found at ${filePath}`);
  }

  const res = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title,
        description,
        tags,
        categoryId: "22", // People & Blogs default; adjust as needed
      },
      status: { privacyStatus },
    },
    media: {
      body: fs.createReadStream(filePath),
      mimeType: "video/mp4",
    },
  });

  const videoId = res?.data?.id;
  return { ok: true, videoId };
}
