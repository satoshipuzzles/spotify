// bot.js
import 'dotenv/config';

// 1) Polyfill WebSockets for Node.js
import 'websocket-polyfill';

// 2) Nostr relay & pure helpers
import { relayInit } from 'nostr-tools';
import { getPublicKey, finalizeEvent } from 'nostr-tools/pure';

// 3) Spotify helper
import SpotifyWebApi from 'spotify-web-api-node';
import { getOrCreatePlaylistForPubKey } from './lib/db.js';

// — Bot config & sanity check —
const BOT_SK = process.env.BOT_NOSTR_PRIVATE_KEY;
if (!BOT_SK) throw new Error('Missing BOT_NOSTR_PRIVATE_KEY');
const BOT_PK = getPublicKey(BOT_SK);

// — Parse our comma‑separated relays —
const RELAYS = process.env.NOSTR_RELAYS.split(',');

// — Connect to each relay and subscribe —
const relayConnections = await Promise.all(
  RELAYS.map(async (url) => {
    const relay = relayInit(url);
    relay.on('connect',    () => console.log(`✅ Connected to ${url}`));
    relay.on('error',      () => console.error(`❌ Relay error on ${url}`));
    relay.on('disconnect', () => console.warn(`⚠️ Disconnected from ${url}`));
    await relay.connect();
    return relay;
  })
);

console.log(`🎧 Listening for mentions of ${BOT_PK} on ${RELAYS.join(', ')}`);

// — For each relay, subscribe to kind=1 events tagging us —
for (const relay of relayConnections) {
  const sub = relay.sub([{ kinds: [1], '#p': [BOT_PK] }]);

  sub.on('event', async (event) => {
    try {
      console.log('▶️  Mention:', event);

      // extract Spotify track IDs
      const ids = [...event.content.matchAll(
        /open\.spotify\.com\/track\/([A-Za-z0-9]+)/g
      )].map(m => m[1]);
      if (!ids.length) return;

      // get or create this user’s playlist
      const { playlistId, accessToken } =
        await getOrCreatePlaylistForPubKey(event.pubkey);

      // add tracks to Spotify
      const spotify = new SpotifyWebApi();
      spotify.setAccessToken(accessToken);
      await spotify.addTracksToPlaylist(
        playlistId,
        ids.map(id => `spotify:track:${id}`)
      );

      // build & sign a confirmation note
      const template = {
        kind: 1,
        pubkey: BOT_PK,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['e', event.id]],
        content: `✅ Added ${ids.length} track(s): https://open.spotify.com/playlist/${playlistId}`
      };
      const signed = finalizeEvent(template, BOT_SK);

      // publish to all relays
      for (const r of relayConnections) {
        r.publish(signed);
      }
      console.log('✔️  Replied and added tracks.');
    } catch (err) {
      console.error('❌ Error handling mention:', err);
    }
  });
}
