// bot.js
import 'dotenv/config';
import { relayInit, getPublicKey, getEventHash, signEvent } from 'nostr-tools';
import SpotifyWebApi from 'spotify-web-api-node';
import { getOrCreatePlaylistForPubKey } from './lib/db';

const BOT_SK = process.env.BOT_NOSTR_PRIVATE_KEY;
if (!BOT_SK) throw new Error('Missing BOT_NOSTR_PRIVATE_KEY');
const BOT_PK = getPublicKey(BOT_SK);
const RELAYS = process.env.NOSTR_RELAYS.split(',');

async function main() {
  const conns = await Promise.all(RELAYS.map(url => relayInit(url).connect()));
  const sub = conns[0].sub([{ kinds: [1], '#p': [BOT_PK] }]);  // mentions

  sub.on('event', async evt => {
    try {
      const user = evt.pubkey;
      const tracks = [...evt.content.matchAll(/open\.spotify\.com\/track\/([A-Za-z0-9]+)/g)]
                     .map(m => m[1]);
      if (!tracks.length) return;

      const { playlistId, accessToken } = await getOrCreatePlaylistForPubKey(user);
      const spotify = new SpotifyWebApi();
      spotify.setAccessToken(accessToken);
      await spotify.addTracksToPlaylist(playlistId, tracks.map(id => `spotify:track:${id}`));

      const reply = {
        kind: 1,
        pubkey: BOT_PK,
        created_at: Math.floor(Date.now()/1000),
        tags: [['e', evt.id]],
        content: `✅ Added ${tracks.length} track(s)! 🎶\nhttps://open.spotify.com/playlist/${playlistId}`
      };
      reply.id = getEventHash(reply);
      reply.sig = signEvent(reply, BOT_SK);
      conns.forEach(c => c.publish(reply));
    } catch (e) {
      console.error(e);
    }
  });
}

main();
