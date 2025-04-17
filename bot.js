// bot.js
import 'dotenv/config';
import pkg from 'nostr-tools';
const { relayInit, getPublicKey, getEventHash, signEvent } = pkg;
import SpotifyWebApi from 'spotify-web-api-node';
import { getOrCreatePlaylistForPubKey } from './lib/db.js';

const BOT_SK = process.env.BOT_NOSTR_PRIVATE_KEY;
if (!BOT_SK) throw new Error('Missing BOT_NOSTR_PRIVATE_KEY');
const BOT_PK = getPublicKey(BOT_SK);
const RELAYS = process.env.NOSTR_RELAYS.split(',');

async function main() {
  const conns = await Promise.all(RELAYS.map(url => relayInit(url).connect()));
  const sub = conns[0].sub([{ kinds: [1], '#p': [BOT_PK] }]);

  sub.on('event', async event => {
    try {
      console.log('▶️  Mention:', event);
      const userPk = event.pubkey;
      const ids = [...event.content.matchAll(/open\.spotify\.com\/track\/([A-Za-z0-9]+)/g)]
        .map(m => m[1]);
      if (!ids.length) return;

      const { playlistId, accessToken } = await getOrCreatePlaylistForPubKey(userPk);
      const spotifyApi = new SpotifyWebApi();
      spotifyApi.setAccessToken(accessToken);
      await spotifyApi.addTracksToPlaylist(
        playlistId,
        ids.map(id => `spotify:track:${id}`)
      );

      const reply = {
        kind: 1,
        pubkey: BOT_PK,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['e', event.id]],
        content: `✅ Added ${ids.length} track(s): https://open.spotify.com/playlist/${playlistId}`
      };
      reply.id = getEventHash(reply);
      reply.sig = signEvent(reply, BOT_SK);
      conns.forEach(c => c.publish(reply));
      console.log('✔️  Replied and added tracks.');
    } catch (e) {
      console.error('❌ Error handling mention:', e);
    }
  });
}

main();
