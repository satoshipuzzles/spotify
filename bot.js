// bot.js
import 'dotenv/config';

// 1) Polyfill WebSocket
import WebSocket from 'ws';
import { useWebSocketImplementation, SimplePool } from 'nostr-tools/pool';
globalThis.WebSocket = WebSocket;
useWebSocketImplementation(WebSocket);

// 2) Nostr helpers
import { getPublicKey, finalizeEvent } from 'nostr-tools/pure';

// 3) Spotify helper
import SpotifyWebApi from 'spotify-web-api-node';
import { getOrCreatePlaylistForPubKey } from './lib/db.js';

// — Bot config —
const BOT_SK = process.env.BOT_NOSTR_PRIVATE_KEY;
if (!BOT_SK) throw new Error('Missing BOT_NOSTR_PRIVATE_KEY');
const BOT_PK   = getPublicKey(BOT_SK);
const RELAYS   = process.env.NOSTR_RELAYS.split(',');
const pool     = new SimplePool();

// — Publish Kind 0 metadata —
const meta = {
  kind:       0,
  pubkey:     BOT_PK,
  created_at: Math.floor(Date.now() / 1000),
  tags:       [],
  content:    JSON.stringify({
    name:    process.env.NEXT_PUBLIC_BOT_NAME,
    picture: process.env.NEXT_PUBLIC_BOT_AVATAR,
    about:   process.env.NEXT_PUBLIC_BOT_ABOUT,
  })
};
try {
  pool.publish(RELAYS, finalizeEvent(meta, BOT_SK));
  console.log('📡 Bot metadata published');
} catch (e) {
  console.error('⚠️ Metadata publish failed:', e);
}

// — Subscribe! callbacks in the 3rd arg, no .on() needed —
console.log(`🚀 Listening for mentions of ${BOT_PK}`);
pool.subscribe(
  RELAYS,
  { kinds: [1], '#p': [BOT_PK] },
  {
    onevent: async (event) => {
      console.log('▶️  Mention:', event);
      // 1) get track IDs
      const ids = [...event.content.matchAll(
        /open\.spotify\.com\/track\/([A-Za-z0-9]+)/g
      )].map(m => m[1]);
      if (!ids.length) return;

      // 2) fetch/create playlist
      const { playlistId, accessToken } =
        await getOrCreatePlaylistForPubKey(event.pubkey);

      // 3) add to Spotify
      const api = new SpotifyWebApi();
      api.setAccessToken(accessToken);
      await api.addTracksToPlaylist(
        playlistId,
        ids.map(i => `spotify:track:${i}`)
      );

      // 4) reply on Nostr
      const reply = {
        kind:       1,
        pubkey:     BOT_PK,
        created_at: Math.floor(Date.now() / 1000),
        tags:       [['e', event.id]],
        content:    `✅ Added ${ids.length} track(s): https://open.spotify.com/playlist/${playlistId}`
      };
      pool.publish(RELAYS, finalizeEvent(reply, BOT_SK));
      console.log('✔️  Replied and added tracks.');
    },
    onerror: (err, relay) => {
      console.error(`⚠️ Subscription error on ${relay}:`, err);
    }
  }
);
