// bot.js
import 'dotenv/config';

// 1) Wire up WebSocket for Node.js
import { useWebSocketImplementation, SimplePool } from 'nostr-tools/pool';
import WebSocket from 'ws';
useWebSocketImplementation(WebSocket);

// 2) Core Nostr primitives
import { getPublicKey, getEventHash, signEvent } from 'nostr-tools/pure';

// 3) Spotify helper
import SpotifyWebApi from 'spotify-web-api-node';
import { getOrCreatePlaylistForPubKey } from './lib/db.js';

// --- bot setup ---
const BOT_SK = process.env.BOT_NOSTR_PRIVATE_KEY;
if (!BOT_SK) throw new Error('Missing BOT_NOSTR_PRIVATE_KEY');

const BOT_PK = getPublicKey(BOT_SK);
const RELAYS = process.env.NOSTR_RELAYS.split(',');
const pool = new SimplePool();

// --- main listener ---
async function main() {
  // subscribe to any note (kind=1) that mentions us
  const sub = pool.sub(RELAYS, [{ kinds: [1], '#p': [BOT_PK] }]);

  for await (const event of sub) {
    try {
      console.log('▶️  Mention:', event);

      // extract Spotify track IDs
      const ids = [...event.content.matchAll(
        /open\.spotify\.com\/track\/([A-Za-z0-9]+)/g
      )].map(m => m[1]);
      if (!ids.length) continue;

      // get (or create) this user’s playlist
      const { playlistId, accessToken } =
        await getOrCreatePlaylistForPubKey(event.pubkey);

      // add tracks to Spotify
      const spotifyApi = new SpotifyWebApi();
      spotifyApi.setAccessToken(accessToken);
      await spotifyApi.addTracksToPlaylist(
        playlistId,
        ids.map(id => `spotify:track:${id}`)
      );

      // build reply event
      const reply = {
        kind: 1,
        pubkey: BOT_PK,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['e', event.id]],
        content: `✅ Added ${ids.length} track(s): https://open.spotify.com/playlist/${playlistId}`
      };
      reply.id = getEventHash(reply);
      reply.sig = signEvent(reply, BOT_SK);

      // publish confirmation
      pool.publish(RELAYS, reply);
      console.log('✔️  Replied and added tracks.');
    } catch (e) {
      console.error('❌ Error handling mention:', e);
    }
  }
}

main();
