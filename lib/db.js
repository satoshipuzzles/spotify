// lib/db.js
import fs from 'fs';
import SpotifyWebApi from 'spotify-web-api-node';

const DB_PATH = './db.json';

function load() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function save(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
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

  // refresh bot’s access token
  const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET
  });
  spotifyApi.setRefreshToken(bot.refreshToken);
  const { body: rt } = await spotifyApi.refreshAccessToken();
  bot.accessToken = rt.access_token;
  save(db);

  spotifyApi.setAccessToken(bot.accessToken);

  // if we already made a playlist for this pubkey, return it
  if (bot.playlistMap[pubkey]) {
    return { playlistId: bot.playlistMap[pubkey], accessToken: bot.accessToken };
  }

  // otherwise create a new one
  const { body: pl } = await spotifyApi.createPlaylist(`Nostr Playlist — ${pubkey}`, {
    description: `Created by the Nostr bot for ${pubkey}`,
    public: false
  });

  bot.playlistMap[pubkey] = pl.id;
  save(db);

  return { playlistId: pl.id, accessToken: bot.accessToken };
}
