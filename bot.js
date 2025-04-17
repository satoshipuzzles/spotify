// bot.js
import 'dotenv/config';

// — 1) Wire up WebSocket for Node.js —
import { useWebSocketImplementation, SimplePool } from 'nostr-tools/pool';
import WebSocket from 'ws';
useWebSocketImplementation(WebSocket);

// — 2) Nostr primitives —
import { getPublicKey, finalizeEvent } from 'nostr-tools/pure';

// — 3) Spotify integration helper —
import SpotifyWebApi from 'spotify-web-api-node';
import { getOrCreatePlaylistForPubKey } from './lib/db.js';

// — Bot configuration & sanity checks —
const BOT_SK = process.env.BOT_NOSTR_PRIVATE_KEY;
if (!BOT_SK) throw new Error('Missing BOT_NOSTR_PRIVATE_KEY');
const BOT_PK = getPublicKey(BOT_SK);
const RELAYS = process.env.NOSTR_RELAYS.split(',');

// — Create your pool —
const pool = new SimplePool();

// — Subscribe for any kind=1 event that tags your bot —
pool.subscribe(
  RELAYS,
  [{ kinds: [1], '#p': [BOT_PK] }],
  {
    onevent: async (event) => {
      try {
        console.log('▶️  Mention:', event);

        // 1) Pull out all Spotify track IDs
        const ids = [...event.content.matchAll(
          /open\.spotify\.com\/track\/([A-Za-z0-9]+)/g
        )].map(m => m[1]);
        if (!ids.length) return;

        // 2) Create or fetch this user’s private playlist
        const { playlistId, accessToken } =
          await getOrCreatePlaylistForPubKey(event.pubkey);

        // 3) Add the tracks
        const spotify = new SpotifyWebApi();
        spotify.setAccessToken(accessToken);
        await spotify.addTracksToPlaylist(
          playlistId,
          ids.map(id => `spotify:track:${id}`)
        );

        // 4) Build & sign a reply
        const replyTemplate = {
          kind:     1,
          pubkey:   BOT_PK,
          created_at: Math.floor(Date.now() / 1000),
          tags:     [['e', event.id]],
          content:  `✅ Added ${ids.length} track(s): https://open.spotify.com/playlist/${playlistId}`
        };
        const signedReply = finalizeEvent(replyTemplate, BOT_SK);

        // 5) Publish your confirmation
        await pool.publish(RELAYS, signedReply);
        console.log('✔️  Replied and added tracks.');

      } catch (err) {
        console.error('❌ Error handling mention:', err);
      }
    }
  }
);

console.log(`▶️  Subscribed to mentions for ${BOT_PK}`);
