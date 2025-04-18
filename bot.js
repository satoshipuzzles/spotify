// bot.js
import 'dotenv/config';

// 1) Polyfill WebSocket in Node.js
import WebSocket from 'ws';
import { SimplePool } from 'nostr-tools/pool';
import { useWebSocketImplementation } from 'nostr-tools/pool';
globalThis.WebSocket = WebSocket;
useWebSocketImplementation(WebSocket);

// 2) Nostr crypto & event helpers
import { getPublicKey, finalizeEvent } from 'nostr-tools/pure';

// 3) Spotify helper
import SpotifyWebApi from 'spotify-web-api-node';
import { getOrCreatePlaylistForPubKey } from './lib/db.js';

// — Bot config & sanity check —
const BOT_SK = process.env.BOT_NOSTR_PRIVATE_KEY;
if (!BOT_SK) throw new Error('Missing BOT_NOSTR_PRIVATE_KEY');
const BOT_PK = getPublicKey(BOT_SK);
const RELAYS = process.env.NOSTR_RELAYS.split(',');
const pool = new SimplePool({ eoseTimeout: 10000, getTimeout: 7000 });

// — Publish Kind 0 metadata (name/avatar/about) —
(async () => {
  try {
    const meta = {
      kind: 0,
      pubkey: BOT_PK,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: JSON.stringify({
        name: process.env.NEXT_PUBLIC_BOT_NAME,
        picture: process.env.NEXT_PUBLIC_BOT_AVATAR,
        about: process.env.NEXT_PUBLIC_BOT_ABOUT,
      })
    };
    const signed = finalizeEvent(meta, BOT_SK);
    
    // Try to publish to each relay individually to handle failures gracefully
    for (const relay of RELAYS) {
      try {
        await pool.publish([relay], signed);
        console.log(`📡 Bot metadata published to ${relay}`);
      } catch (err) {
        console.error(`⚠️ Failed to publish metadata to ${relay}:`, err.message);
      }
    }
    
    // — Subscribe for kind=1 notes tagging your bot's pubkey —  
    console.log(`🚀 Subscribing for mentions of ${BOT_PK} on ${RELAYS.join(', ')}`);
    
    pool.subscribe(
      RELAYS,
      // **array** of filter objects:
      [{ kinds: [1], '#p': [BOT_PK] }],
      {
        onevent: async (event) => {
          try {
            console.log('▶️  Mention:', event);

            // extract Spotify track IDs
            const ids = [...event.content.matchAll(
              /open\.spotify\.com\/track\/([A-Za-z0-9]+)/g
            )].map(m => m[1]);
            
            if (!ids.length) {
              console.log('⚠️ No Spotify track links found in the message');
              return;
            }

            // get or create playlist
            console.log(`🎵 Finding/creating playlist for pubkey: ${event.pubkey}`);
            const { playlistId, accessToken } =
              await getOrCreatePlaylistForPubKey(event.pubkey);

            // add tracks to Spotify
            console.log(`🎵 Adding ${ids.length} tracks to playlist: ${playlistId}`);
            const spotify = new SpotifyWebApi();
            spotify.setAccessToken(accessToken);
            await spotify.addTracksToPlaylist(
              playlistId,
              ids.map(id => `spotify:track:${id}`)
            );

            // build & sign reply
            const reply = {
              kind: 1,
              pubkey: BOT_PK,
              created_at: Math.floor(Date.now() / 1000),
              tags: [['e', event.id]],
              content: `✅ Added ${ids.length} track(s): https://open.spotify.com/playlist/${playlistId}`
            };
            
            // Try to publish to each relay individually
            for (const relay of RELAYS) {
              try {
                await pool.publish([relay], finalizeEvent(reply, BOT_SK));
                console.log(`✔️ Reply published to ${relay}`);
              } catch (err) {
                console.error(`⚠️ Failed to publish reply to ${relay}:`, err.message);
              }
            }
            
            console.log('✔️ Replied and added tracks.');
          } catch (err) {
            console.error('❌ Error processing event:', err);
          }
        },
        onerror: (err, relay) => {
          console.error(`⚠️ Subscription error on ${relay}:`, err);
        }
      }
    );
  } catch (err) {
    console.error('❌ Error in bot setup:', err);
  }
})();

// Keep the process running
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});
