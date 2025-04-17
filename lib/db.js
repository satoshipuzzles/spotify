// lib/db.js
import fs from 'fs';
import path from 'path';
import os from 'os';

const SRC_DB_PATH = path.resolve(process.cwd(), 'db.json');
// use a file in the OS temp directory (writable in serverless)
const TMP_DB_PATH = path.join(os.tmpdir(), 'spotify-bot-db.json');

function load() {
  // if we’ve already written to temp, use that, otherwise start from the repo copy
  const dbPath = fs.existsSync(TMP_DB_PATH) ? TMP_DB_PATH : SRC_DB_PATH;
  return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}

function save(db) {
  const data = JSON.stringify(db, null, 2);
  fs.writeFileSync(TMP_DB_PATH, data);
}

/** Save Spotify tokens after OAuth */
export function saveSpotifyTokens(accessToken, refreshToken) {
  const db = load();
  db.botSpotify.accessToken = accessToken;
  db.botSpotify.refreshToken = refreshToken;
  save(db);
}

/**
 * For a given userPubKey, return (or create) that user’s private Spotify playlist.
 * Returns { playlistId, accessToken }.
 */
export async function getOrCreatePlaylistForPubKey(pubkey) {
  const db = load();
  const bot = db.botSpotify;

  // 1) Refresh the bot’s access token
  const SpotifyWebApi = (await import('spotify-web-api-node')).default;
  const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET
  });
  spotifyApi.setRefreshToken(bot.refreshToken);
  const { body: rt } = await spotifyApi.refreshAccessToken();
  bot.accessToken = rt.access_token;
  save(db);

  spotifyApi.setAccessToken(bot.accessToken);

  // 2) If we already created a playlist for this user, return it
  if (bot.playlistMap[pubkey]) {
    return { playlistId: bot.playlistMap[pubkey], accessToken: bot.accessToken };
  }

  // 3) Otherwise, make a new private playlist
  const { body: pl } = await spotifyApi.createPlaylist(`Nostr Playlist — ${pubkey}`, {
    description: `Created by Nostr bot for ${pubkey}`,
    public: false
  });
  bot.playlistMap[pubkey] = pl.id;
  save(db);

  return { playlistId: pl.id, accessToken: bot.accessToken };
}
