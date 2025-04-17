// bot.js
import 'dotenv/config';

// 1) Polyfill WebSocket in Node.js (using ws)
import WebSocket from 'ws';
import { useWebSocketImplementation, SimplePool } from 'nostr-tools/pool';
globalThis.WebSocket = WebSocket;
useWebSocketImplementation(WebSocket);

// 2) Nostr crypto & event helpers
import { getPublicKey, finalizeEvent } from 'nostr-tools/pure';

// 3) Spotify integration
import SpotifyWebApi from 'spotify-web-api-node';
import { getOrCreatePlaylistForPubKey } from './lib/db.js';

// — Bot config & sanity check —
const BOT_SK  = process.env.BOT_NOSTR_PRIVATE_KEY;
if (!BOT_SK) throw new Error('Missing BOT_NOSTR_PRIVATE_KEY');
const BOT_PK  = getPublicKey(BOT_SK);
const RELAYS  = process.env.NOSTR_RELAYS.split(',');
const pool    = new SimplePool();

// — 4) Publish bot metadata (Kind 0) so clients see name/avatar — 
const metadata = {
  kind:       0,
  pubkey:     BOT_PK,
  created_at: Math.floor(Date.now() / 1000),
  tags:       [],
  content: JSON.stringify({
    name:    process.env.NEXT_PUBLIC_BOT_NAME,
    picture: process.env.NEXT_PUBLIC_BOT_AVATAR,
    about:   process.env.NEXT_PUBLIC_BOT_ABOUT,
  })
};
const signedMeta = finalizeEvent(metadata, BOT_SK);
pool.publish(RELAYS, signedMeta)
  .then(() => console.log('📡 Bot metadata published'))
  .catch(err => console.error('⚠️ Failed to publish metadata:', err));

// — 5) Subscribe to any kind=1 note that tags your bot —
console.log(`🚀 Subscribing for notes tagging ${BOT_PK} on ${RELAYS.join(', ')}`);
pool.subscribe(
  RELAYS,
  { kinds: [1], '#p': [BOT_PK] },
  {
    onevent: async (event) => {
      try {
        console.log('▶️  Mention:', event);

        // a) extract all Spotify track IDs
        const ids = [...event.content.matchAll(
          /open\.spotify\.com\/track\/([A-Za-z0-9]+)/g
        )].map(m => m[1]);
        if (!ids.length) return;

        // b) get (or create) this user’s playlist
        const { playlistId, accessToken } =
          await getOrCreatePlaylistForPubKey(event.pubkey);

        // c) add tracks to Spotify
        const spotify = new SpotifyWebApi();
        spotify.setAccessToken(accessToken);
        await spotify.addTracksToPlaylist(
          playlistId,
          ids.map(id => `spotify:track:${id}`)
        );

        // d) build & sign a reply note
        const reply = {
          kind:       1,
          pubkey:     BOT_PK,
          created_at: Math.floor(Date.now() / 1000),
          tags:       [['e', event.id]],
          content:    `✅ Added ${ids.length} track(s): https://open.spotify.com/playlist/${playlistId}`
        };
        const signedReply = finalizeEvent(reply, BOT_SK);

        // e) publish confirmation back to all relays
        await pool.publish(RELAYS, signedReply);
        console.log('✔️  Replied and added tracks.');
      } catch (err) {
        console.error('❌ Error handling mention:', err);
      }
    },
    onerror: (err, relayUrl) => {
      console.error(`⚠️ Subscription error on ${relayUrl}:`, err);
    }
  }
);
