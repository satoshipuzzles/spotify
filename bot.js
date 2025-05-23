// bot.js
import 'dotenv/config';

// 1) Polyfill WebSocket in Node.js
import WebSocket from 'ws';
import { useWebSocketImplementation } from 'nostr-tools/pool';
import { nip19 } from 'nostr-tools';
globalThis.WebSocket = WebSocket;
useWebSocketImplementation(WebSocket);

// 2) Nostr crypto & event helpers
import { getPublicKey, finalizeEvent } from 'nostr-tools/pure';

// 3) Spotify helper
import SpotifyWebApi from 'spotify-web-api-node';
import { getOrCreatePlaylistForPubKey, getOrCreateGlobalPlaylist } from './lib/db.js';

// — Bot config & sanity check —
const BOT_SK = process.env.BOT_NOSTR_PRIVATE_KEY;
if (!BOT_SK) throw new Error('Missing BOT_NOSTR_PRIVATE_KEY');
const BOT_PK = getPublicKey(BOT_SK);
const RELAYS = process.env.NOSTR_RELAYS.split(',');

// Debug info for the pubkey
console.log('Bot pubkey (hex):', BOT_PK);
try {
  const npub = nip19.npubEncode(BOT_PK);
  console.log('Bot npub:', npub);
  console.log('Expected npub:', process.env.NEXT_PUBLIC_BOT_PUBKEY || 'not set in env');
} catch (e) {
  console.error('Failed to encode npub:', e);
}

// Function to connect to a relay
function connectToRelay(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error(`Connection timeout to ${url}`));
    }, 10000);
    
    ws.on('open', () => {
      clearTimeout(timeout);
      console.log(`✅ Connected to ${url}`);
      resolve(ws);
    });
    
    ws.on('error', (err) => {
      clearTimeout(timeout);
      console.error(`❌ WS error on ${url}:`, err);
      reject(err);
    });
  });
}

// Extract playlist name from event content
function extractPlaylistName(content) {
  const hashtagMatch = content.match(/#(\w+)/);
  return hashtagMatch ? hashtagMatch[1] : null;
}

// Find original event ID in a thread
function findOriginalEventId(event) {
  // Look for e-tags that mark the original event in a thread
  const rootTag = event.tags.find(tag => tag.length >= 3 && tag[0] === 'e' && tag[3] === 'root');
  if (rootTag) {
    return rootTag[1]; // Return the event ID from the root tag
  }
  
  // If no root tag, check for a reply tag
  const replyTag = event.tags.find(tag => tag.length >= 2 && tag[0] === 'e');
  if (replyTag) {
    return replyTag[1]; // Return the event ID from the reply tag
  }
  
  // If neither found, this is the original event
  return event.id;
}

// — Main execution —
(async () => {
  try {
    // 1) Connect to relays
    const connections = [];
    for (const url of RELAYS) {
      try {
        const ws = await connectToRelay(url);
        connections.push(ws);
      } catch (err) {
        console.error(`Failed to connect to ${url}:`, err.message);
      }
    }
    
    if (connections.length === 0) {
      console.error("❌ Failed to connect to any relays. Exiting.");
      process.exit(1);
    }
    
    // 2) Publish Kind 0 metadata
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
    const signedMeta = finalizeEvent(meta, BOT_SK);
    
    for (const ws of connections) {
      try {
        ws.send(JSON.stringify(['EVENT', signedMeta]));
        console.log(`📡 Metadata published to ${ws.url}`);
      } catch (err) {
        console.error(`Failed to publish metadata to ${ws.url}:`, err.message);
      }
    }
    
    // 3) Set up subscription
    console.log(`🚀 Subscribing for mentions of ${BOT_PK}`);
    for (const ws of connections) {
      try {
        // Create subscription for mentions
        const subId = 'sub_' + Math.random().toString(36).slice(2);
        ws.send(JSON.stringify(['REQ', subId, { kinds: [1], '#p': [BOT_PK] }]));
        
        ws.on('message', async (data) => {
          try {
            // Log raw message for debugging
            console.log(`Raw message from ${ws.url}:`, data.toString().substring(0, 200) + '...');
            
            const message = JSON.parse(data.toString());
            
            // Handle NOTICE messages (for debugging)
            if (message[0] === 'NOTICE') {
              console.log(`NOTICE from ${ws.url}: ${message[1]}`);
              return;
            }
            
            // Only handle EVENT messages
            if (message[0] !== 'EVENT') return;
            
            // Extract the event
            const event = message[2];
            if (!event || event.kind !== 1) {
              console.log('Not a kind 1 event, ignoring:', event ? `kind=${event.kind}` : 'undefined event');
              return;
            }
            
            console.log('Received kind 1 event:', JSON.stringify(event).substring(0, 300) + '...');
            console.log('Event tags:', JSON.stringify(event.tags));
            
            // Check if event tags mention our bot
            const containsTag = event.tags.some(tag => {
              const isMatch = tag.length >= 2 && tag[0] === 'p' && tag[1] === BOT_PK;
              console.log(`Tag check: ${tag} - matches our pubkey? ${isMatch}`);
              return isMatch;
            });
            
            if (!containsTag) {
              console.log('⚠️ Event does not contain our pubkey tag, ignoring');
              return;
            }
            
            console.log('▶️ Mention received:', event);
            
            // Extract Spotify track IDs
            const trackMatches = [...event.content.matchAll(
              /open\.spotify\.com\/track\/([A-Za-z0-9]+)/g
            )];
            console.log('Track matches:', trackMatches);
            
            const ids = trackMatches.map(m => m[1]);
            console.log('Extracted track IDs:', ids);
            
            if (!ids.length) {
              console.log('⚠️ No Spotify track IDs found in mention');
              return;
            }
            
            // Extract playlist name if present
            const playlistName = extractPlaylistName(event.content);
            console.log('Playlist name:', playlistName || 'Not specified');
            
            // Determine if this is a reply in a thread
            const originalEventId = findOriginalEventId(event);
            let authorToUse = event.pubkey;
            
            // If this is a reply and not the original event, we need to look up the original author
            if (originalEventId !== event.id) {
              // Here we would normally fetch the original event to get its author
              // For now, we'll use the current author as fallback
              console.log(`This is a reply in a thread. Original event: ${originalEventId}`);
              
              // You could add code here to fetch the original event and use its author
              // For now we just use the current author
            }
            
            // Get/create user's personal playlist
            console.log(`Finding playlist for pubkey: ${authorToUse}`);
            const { playlistId, accessToken } = 
              await getOrCreatePlaylistForPubKey(authorToUse, playlistName);
            
            // Also get/create global playlist
            const { globalPlaylistId } = await getOrCreateGlobalPlaylist();
            
            // Check for duplicates before adding tracks
            const spotify = new SpotifyWebApi();
            spotify.setAccessToken(accessToken);
            
            // Function to add tracks to a playlist
            const addTracksToPlaylist = async (playlist, trackIds) => {
              try {
                // Get current tracks in the playlist
                const { body: currentPlaylist } = await spotify.getPlaylist(playlist);
                const existingTrackIds = currentPlaylist.tracks.items.map(item => 
                  item.track.uri.split(':').pop()
                );
                
                // Filter out tracks that are already in the playlist
                const newTrackIds = trackIds.filter(id => !existingTrackIds.includes(id));
                
                if (newTrackIds.length > 0) {
                  console.log(`Adding ${newTrackIds.length} tracks to playlist ${playlist}`);
                  await spotify.addTracksToPlaylist(
                    playlist,
                    newTrackIds.map(id => `spotify:track:${id}`)
                  );
                  return newTrackIds.length;
                } else {
                  console.log(`All tracks already exist in playlist ${playlist}`);
                  return 0;
                }
              } catch (error) {
                console.error(`Error adding tracks to playlist ${playlist}:`, error);
                // Fallback to adding all tracks without deduplication
                try {
                  console.log('Falling back to adding all tracks without deduplication');
                  await spotify.addTracksToPlaylist(
                    playlist,
                    trackIds.map(id => `spotify:track:${id}`)
                  );
                  return trackIds.length;
                } catch (fallbackError) {
                  console.error('Failed even with fallback approach:', fallbackError);
                  return 0;
                }
              }
            };
            
            // Add tracks to user's personal playlist
            const addedToPersonal = await addTracksToPlaylist(playlistId, ids);
            
            // Add to global playlist
            const addedToGlobal = await addTracksToPlaylist(globalPlaylistId, ids);
            
            // Reply with confirmation
            let replyContent = `✅ Added ${addedToPersonal} track(s) to your playlist: https://open.spotify.com/playlist/${playlistId}`;
            
            // If tracks were also added to global playlist, mention it
            if (addedToGlobal > 0) {
              replyContent += `\n\nAlso added to our global playlist: https://open.spotify.com/playlist/${globalPlaylistId}`;
            }
            
            const reply = {
              kind: 1,
              pubkey: BOT_PK,
              created_at: Math.floor(Date.now() / 1000),
              tags: [['e', event.id], ['p', event.pubkey]],
              content: replyContent
            };
            const signedReply = finalizeEvent(reply, BOT_SK);
            
            for (const connection of connections) {
              try {
                connection.send(JSON.stringify(['EVENT', signedReply]));
                console.log(`✔️ Reply sent via ${connection.url}`);
              } catch (error) {
                console.error(`Failed to send reply via ${connection.url}:`, error);
              }
            }
            
          } catch (err) {
            console.error('❌ Error processing message:', err);
          }
        });
        
        console.log(`✅ Subscribed to ${ws.url} with ID: ${subId}`);
      } catch (err) {
        console.error(`Failed to subscribe to ${ws.url}:`, err.message);
      }
    }
    
    console.log('🤖 Bot is now running and listening for mentions...');
    
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
})();

// Keep the process alive
process.stdin.resume();

// Handle unexpected errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});
