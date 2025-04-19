// lib/vercel-db.js
import fs from 'fs';
import path from 'path';

// Use the /tmp directory which is writable on Vercel
const TMP_DB_PATH = path.join('/tmp', 'spotify-bot-db.json');
const DEFAULT_DB = {
  botSpotify: {
    accessToken: process.env.SPOTIFY_ACCESS_TOKEN || "",
    refreshToken: process.env.SPOTIFY_REFRESH_TOKEN || "",
    playlistMap: {}
  }
};

// Add this to help with debugging
console.log("DB PATH:", TMP_DB_PATH);

export function loadDb() {
  try {
    if (fs.existsSync(TMP_DB_PATH)) {
      console.log("Loading existing DB from:", TMP_DB_PATH);
      const data = fs.readFileSync(TMP_DB_PATH, 'utf-8');
      return JSON.parse(data);
    }
    
    // If no file exists yet, create default DB
    console.log("No DB file found, creating default DB");
    const defaultDb = { 
      botSpotify: {
        accessToken: process.env.SPOTIFY_ACCESS_TOKEN || "",
        refreshToken: process.env.SPOTIFY_REFRESH_TOKEN || "",
        playlistMap: {}
      }
    };
    
    // Copy any existing playlist data from environment variable if available
    if (process.env.PLAYLIST_MAP) {
      try {
        const playlistMap = JSON.parse(process.env.PLAYLIST_MAP);
        defaultDb.botSpotify.playlistMap = playlistMap;
        console.log("Loaded playlist map from environment variable");
      } catch (e) {
        console.error("Failed to parse PLAYLIST_MAP environment variable:", e);
      }
    }
    
    saveDb(defaultDb);
    return defaultDb;
  } catch (err) {
    console.warn("Error loading DB:", err.message);
    return { ...DEFAULT_DB };
  }
}

export function saveDb(data) {
  try {
    const jsonData = JSON.stringify(data, null, 2);
    fs.writeFileSync(TMP_DB_PATH, jsonData);
    console.log("Saved DB to:", TMP_DB_PATH);
    
    // If this is running in production, also update the environment variable
    // This helps persist data between serverless function invocations
    if (process.env.VERCEL) {
      // We can't directly update environment variables in Vercel,
      // but we can log the current state for manual updates
      console.log("PLAYLIST_MAP for environment variable:", 
        JSON.stringify(data.botSpotify.playlistMap));
    }
    
    return true;
  } catch (err) {
    console.error("Error saving DB:", err.message);
    return false;
  }
}

// Helper function to add a playlist to the DB
export function addPlaylist(pubkey, playlistId) {
  const db = loadDb();
  db.botSpotify.playlistMap[pubkey] = playlistId;
  return saveDb(db);
}

// Helper function to get all playlists
export function getPlaylists() {
  const db = loadDb();
  return db.botSpotify.playlistMap;
}

// Helper function to update tokens
export function updateTokens(accessToken, refreshToken) {
  const db = loadDb();
  db.botSpotify.accessToken = accessToken;
  db.botSpotify.refreshToken = refreshToken;
  return saveDb(db);
}
