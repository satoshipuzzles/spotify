// bot.js
import 'dotenv/config';

// 1) Wire up WebSocket for Node.js
import { useWebSocketImplementation, SimplePool } from 'nostr-tools/pool';
import WebSocket from 'ws';
useWebSocketImplementation(WebSocket);

// 2) Nostr helpers
import { getPublicKey, finalizeEvent } from 'nostr-tools/pure';

// 3) Spotify helper
import SpotifyWebApi from 'spotify-web-api-node';
import { getOrCreatePlaylistForPubKey } from './lib/db.js';

// --- Bot config & validation ---
const BOT_SK = process.env.BOT_NOSTR_PRIVATE_KEY;
if (!BOT_SK) throw new Error('Missing BOT_NOSTR_PRIVATE_KEY');
const BOT_PK = getPublicKey(BOT_SK);
const RELAYS = process.env.NOSTR_RELAYS.split(',');
const pool = new SimplePool();

// --- Subscribe for kind=1 mentions of our bot ---
const sub = pool.subscribe(
  RELAYS,
  [{ kinds: [1], '#p': [BOT_PK] }]
);

console.log(`▶️  Subscribed for mentions as ${BOT_PK} on ${RELAYS.join(', ')}`);

//  --- Handle incoming events ---
sub.on('event', async (event) => {
  try {
    console.log('▶️  Mention:', event);

    // 1) Pull out all Spotify track IDs
    const ids = [...event.content.matchAll(
      /open\.spotify\.com\/track\/([A-Za-z0-9]+)/g
    )].map(m => m[1]);
    if (!ids.length) return;

    // 2) Create or fetch this user’s playlist
    const { playlistId, accessToken } =
      await getOrCreatePlaylistForPubKey(event.pubkey);

    // 3) Add tracks to Spotify
    const spotify = new SpotifyWebApi();
    spotify.setAccessToken(accessToken);
    await spotify.addTracksToPlaylist(
      playlistId,
      ids.map(id => `spotify:track:${id}`)
    );

    // 4) Build & sign a reply event
    const template = {
      kind: 1,
      pubkey: BOT_PK,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['e', event.id]],
      content: `✅ Added ${ids.length} track(s): https://open.spotify.com/playlist/${playlistId}`
    };
    const signed = finalizeEvent(template, BOT_SK);

    // 5) Publish confirmation
    await pool.publish(RELAYS, signed);
    console.log('✔️  Replied and added tracks.');
  } catch (err) {
    console.error('❌ Error handling mention:', err);
  }
});

sub.on('error', (err, url) => {
  console.error(`⚠️  Subscription error on ${url}:`, err);
});
