// bot.js
import 'dotenv/config';

// 1) Polyfill WebSocket in Node.js via ws
import WebSocket from 'ws';
globalThis.WebSocket = WebSocket;

// 2) Load nostr-tools via CommonJS (so we get relayInit)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { relayInit } = require('nostr-tools');
const { getPublicKey, finalizeEvent } = require('nostr-tools/pure');

// 3) Spotify helper
import SpotifyWebApi from 'spotify-web-api-node';
import { getOrCreatePlaylistForPubKey } from './lib/db.js';

// — Bot config & sanity check —
const BOT_SK = process.env.BOT_NOSTR_PRIVATE_KEY;
if (!BOT_SK) throw new Error('Missing BOT_NOSTR_PRIVATE_KEY');
const BOT_PK = getPublicKey(BOT_SK);

const RELAYS = process.env.NOSTR_RELAYS.split(',');

// — Connect to each relay —
const relays = await Promise.all(
  RELAYS.map(async url => {
    const r = relayInit(url);
    r.on('connect',    () => console.log(`✅ Connected to ${url}`));
    r.on('error',      e => console.error(`❌ Relay error on ${url}:`, e));
    r.on('disconnect', () => console.warn(`⚠️ Disconnected from ${url}`));
    await r.connect();
    return r;
  })
);

console.log(`🎧 Listening for mentions of ${BOT_PK} on ${RELAYS.join(', ')}`);

// — Publish Kind 0 metadata so clients see name/avatar —
const meta = {
  kind:       0,
  pubkey:     BOT_PK,
  created_at: Math.floor(Date.now()/1000),
  tags:       [],
  content:    JSON.stringify({
    name:    process.env.NEXT_PUBLIC_BOT_NAME,
    picture: process.env.NEXT_PUBLIC_BOT_AVATAR,
    about:   process.env.NEXT_PUBLIC_BOT_ABOUT,
  })
};
const signedMeta = finalizeEvent(meta, BOT_SK);
for (const r of relays) r.publish(signedMeta);
console.log('📡 Bot metadata published');

// — For each relay, subscribe to kind=1 notes tagging your bot —
for (const relay of relays) {
  const sub = relay.sub([{ kinds: [1], '#p': [BOT_PK] }]);

  sub.on('event', async event => {
    try {
      console.log('▶️  Mention:', event);

      // extract track IDs
      const ids = [...event.content.matchAll(
        /open\.spotify\.com\/track\/([A-Za-z0-9]+)/g
      )].map(m => m[1]);
      if (!ids.length) return;

      // get or create playlist
      const { playlistId, accessToken } = await getOrCreatePlaylistForPubKey(event.pubkey);

      // add tracks
      const spotify = new SpotifyWebApi();
      spotify.setAccessToken(accessToken);
      await spotify.addTracksToPlaylist(
        playlistId,
        ids.map(id => `spotify:track:${id}`)
      );

      // reply event
      const reply = {
        kind:       1,
        pubkey:     BOT_PK,
        created_at: Math.floor(Date.now()/1000),
        tags:       [['e', event.id]],
        content:    `✅ Added ${ids.length} track(s): https://open.spotify.com/playlist/${playlistId}`
      };
      const signed = finalizeEvent(reply, BOT_SK);

      // publish reply everywhere
      for (const r2 of relays) r2.publish(signed);
      console.log('✔️  Replied and added tracks.');
    } catch (err) {
      console.error('❌ Error handling mention:', err);
    }
  });

  sub.on('error', e => console.error('⚠️ Subscription error:', e));
}
