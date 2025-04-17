// bot.js
import 'dotenv/config';

// 1) Set up WebSocket in Node for nostr-tools
import { useWebSocketImplementation, SimplePool } from 'nostr-tools/pool';
import WebSocket from 'ws';
useWebSocketImplementation(WebSocket);

// 2) Import pure helpers (key derivation + event finalization)
import { getPublicKey, finalizeEvent } from 'nostr-tools/pure';

// 3) Spotify helper
import SpotifyWebApi from 'spotify-web-api-node';
import { getOrCreatePlaylistForPubKey } from './lib/db.js';

// --- Bot configuration ---
const BOT_SK = process.env.BOT_NOSTR_PRIVATE_KEY;
if (!BOT_SK) throw new Error('Missing BOT_NOSTR_PRIVATE_KEY');
const BOT_PK = getPublicKey(BOT_SK);
const RELAYS = process.env.NOSTR_RELAYS.split(',');
const pool = new SimplePool();

// --- Main listener ---
async function main() {
  // Subscribe to kind=1 events tagging us
  const sub = pool.sub(RELAYS, [{ kinds: [1], '#p': [BOT_PK] }]);

  for await (const event of sub) {
    try {
      console.log('▶️  Mention:', event);

      // 1) Extract Spotify track IDs
      const ids = [...event.content.matchAll(
        /open\.spotify\.com\/track\/([A-Za-z0-9]+)/g
      )].map(m => m[1]);
      if (!ids.length) continue;

      // 2) Get or create the caller’s playlist
      const { playlistId, accessToken } =
        await getOrCreatePlaylistForPubKey(event.pubkey);

      // 3) Add tracks to Spotify
      const spotifyApi = new SpotifyWebApi();
      spotifyApi.setAccessToken(accessToken);
      await spotifyApi.addTracksToPlaylist(
        playlistId,
        ids.map(id => `spotify:track:${id}`)
      );

      // 4) Build and sign a Nostr reply
      const replyTemplate = {
        kind: 1,
        pubkey: BOT_PK,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['e', event.id]],
        content: `✅ Added ${ids.length} track(s): https://open.spotify.com/playlist/${playlistId}`
      };
      const signedReply = finalizeEvent(replyTemplate, BOT_SK);

      // 5) Publish confirmation back to all relays
      await pool.publish(RELAYS, signedReply);
      console.log('✔️  Replied and added tracks.');
    } catch (e) {
      console.error('❌ Error handling mention:', e);
    }
  }
}

main();
