// lib/db.js
import fs from 'fs';
import path from 'path';
import os from 'os';

const SRC_DB_PATH = path.resolve(process.cwd(), 'db.json');
// use a file in the OS temp directory (writable in serverless)
const TMP_DB_PATH = path.join(os.tmpdir(), 'spotify-bot-db.json');

function load() {
  // if we've already written to temp, use that, otherwise start from the repo copy
  let db;
  try {
    const dbPath = fs.existsSync(TMP_DB_PATH) ? TMP_DB_PATH : SRC_DB_PATH;
    console.log("Loading database from:", dbPath);
    db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  } catch (err) {
    console.warn("Error loading from file, using env vars:", err.message);
    db = {
      botSpotify: {
        accessToken: process.env.SPOTIFY_ACCESS_TOKEN || "",
        refreshToken: process.env.SPOTIFY_REFRESH_TOKEN || "",
        playlistMap: {},
        globalPlaylist: process.env.GLOBAL_PLAYLIST_ID || ""
      }
    };
  }
  
  // Use environment variables as fallback
  if (!db.botSpotify.accessToken && process.env.SPOTIFY_ACCESS_TOKEN) {
    db.botSpotify.accessToken = process.env.SPOTIFY_ACCESS_TOKEN;
  }
  if (!db.botSpotify.refreshToken && process.env.SPOTIFY_REFRESH_TOKEN) {
    db.botSpotify.refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
  }
  
  // Ensure global playlist field exists
  if (!db.botSpotify.globalPlaylist) {
    db.botSpotify.globalPlaylist = process.env.GLOBAL_PLAYLIST_ID || "";
  }
  
  return db;
}

function save(db) {
  try {
    const data = JSON.stringify(db, null, 2);
    fs.writeFileSync(TMP_DB_PATH, data);
    console.log("Saved data to", TMP_DB_PATH);
  } catch (err) {
    console.error("Error saving data:", err.message);
    // If we can't save, at least try to update env vars in memory
    if (db.botSpotify && db.botSpotify.accessToken) {
      process.env.SPOTIFY_ACCESS_TOKEN = db.botSpotify.accessToken;
    }
  }
}

/** Save Spotify tokens after OAuth */
export function saveSpotifyTokens(accessToken, refreshToken) {
  const db = load();
  db.botSpotify.accessToken = accessToken;
  db.botSpotify.refreshToken = refreshToken;
  save(db);
  
  // Also update environment variables as a fallback
  process.env.SPOTIFY_ACCESS_TOKEN = accessToken;
  process.env.SPOTIFY_REFRESH_TOKEN = refreshToken;
}

/**
 * For a given userPubKey, return (or create) that user's private Spotify playlist.
 * Returns { playlistId, accessToken }.
 */
export async function getOrCreatePlaylistForPubKey(pubkey, playlistName = null) {
  const db = load();
  const bot = db.botSpotify;

  // 1) Refresh the bot's access token
  const SpotifyWebApi = (await import('spotify-web-api-node')).default;
  const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET
  });
  
  // Use refresh token from db or env var
  const refreshToken = bot.refreshToken || process.env.SPOTIFY_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error("No refresh token available - please authenticate with Spotify");
  }
  
  spotifyApi.setRefreshToken(refreshToken);
  const { body: rt } = await spotifyApi.refreshAccessToken();
  bot.accessToken = rt.access_token;
  save(db);

  spotifyApi.setAccessToken(bot.accessToken);

  // 2) If we already created a playlist for this user, return it
  if (bot.playlistMap[pubkey]) {
    return { playlistId: bot.playlistMap[pubkey], accessToken: bot.accessToken };
  }

  // 3) Otherwise, make a new private playlist
  const playlistTitle = playlistName 
    ? `${playlistName} — Nostr Playlist` 
    : `Nostr Playlist — ${pubkey.substring(0, 8)}`;
  
  const { body: pl } = await spotifyApi.createPlaylist(playlistTitle, {
    description: `Created by Nostr bot for ${pubkey}`,
    public: false
  });
  bot.playlistMap[pubkey] = pl.id;
  save(db);

  return { playlistId: pl.id, accessToken: bot.accessToken };
}

/**
 * Get or create a global playlist that contains all tracks shared with the bot
 * Returns { globalPlaylistId, accessToken }
 */
export async function getOrCreateGlobalPlaylist() {
  const db = load();
  const bot = db.botSpotify;

  // 1) Refresh the bot's access token
  const SpotifyWebApi = (await import('spotify-web-api-node')).default;
  const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET
  });
  
  // Use refresh token from db or env var
  const refreshToken = bot.refreshToken || process.env.SPOTIFY_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error("No refresh token available - please authenticate with Spotify");
  }
  
  spotifyApi.setRefreshToken(refreshToken);
  const { body: rt } = await spotifyApi.refreshAccessToken();
  bot.accessToken = rt.access_token;
  save(db);

  spotifyApi.setAccessToken(bot.accessToken);

  // 2) If we already have a global playlist, return it
  if (bot.globalPlaylist) {
    return { globalPlaylistId: bot.globalPlaylist, accessToken: bot.accessToken };
  }

  // 3) Otherwise, create a new public global playlist
  const playlistTitle = "Nostr Global Playlist";
  
  const { body: pl } = await spotifyApi.createPlaylist(playlistTitle, {
    description: "All tracks shared with the Nostr-Spotify bot",
    public: true
  });
  bot.globalPlaylist = pl.id;
  save(db);

  return { globalPlaylistId: pl.id, accessToken: bot.accessToken };
}
