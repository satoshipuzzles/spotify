// bot.js
import 'dotenv/config';
import WebSocket from 'ws';
import SpotifyWebApi from 'spotify-web-api-node';
import { getOrCreatePlaylistForPubKey } from './lib/db.js';

// Nostr-tools v1.x imports:
import { relayInit } from 'nostr-tools';
import { getPublicKey, finalizeEvent } from 'nostr-tools';

// Polyfill WebSocket globally
globalThis.WebSocket = WebSocket;

// Bot config
const BOT_SK   = process.env.BOT_NOSTR_PRIVATE_KEY;
if (!BOT_SK) throw new Error('Missing BOT_NOSTR_PRIVATE_KEY');
const BOT_PK   = getPublicKey(BOT_SK);
const RELAYS   = process.env.NOSTR_RELAYS.split(',');

// 1) Connect to each relay
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

// 2) Publish metadata (Kind 0)
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
relays.forEach(r => r.publish(signedMeta));
console.log('📡 Bot metadata published');

// 3) Subscribe for kind=1 mentions
console.log(`🎧 Listening for mentions of ${BOT_PK}`);
relays.forEach(relay => {
  const sub = relay.sub([{ kinds: [1], '#p': [BOT_PK] }]);

  sub.on('event', async event => {
    try {
      console.log('▶️  Mention:', event);

      // Extract Spotify IDs
      const ids = [...event.content.matchAll(
        /open\.spotify\.com\/track\/([A-Za-z0-9]+)/g
      )].map(m => m[1]);
      if (!ids.length) return;

      // Get/create playlist
      const { playlistId, accessToken } =
        await getOrCreatePlaylistForPubKey(event.pubkey);

      // Add to Spotify
      const spotify = new SpotifyWebApi();
      spotify.setAccessToken(accessToken);
      await spotify.addTracksToPlaylist(
        playlistId,
        ids.map(id => `spotify:track:${id}`)
      );

      // Reply on Nostr
      const reply = {
        kind:       1,
        pubkey:     BOT_PK,
        created_at: Math.floor(Date.now()/1000),
        tags:       [['e', event.id]],
        content:    `✅ Added ${ids.length} track(s): https://open.spotify.com/playlist/${playlistId}`
      };
      const signedReply = finalizeEvent(reply, BOT_SK);
      relays.forEach(r2 => r2.publish(signedReply));
      console.log('✔️  Replied and added tracks.');
    } catch (err) {
      console.error('❌ Error handling mention:', err);
    }
  });

  sub.on('error', err => {
    console.error('⚠️ Subscription error:', err);
  });
});
