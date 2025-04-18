// lib/nostr.js
import WebSocket from 'ws';
import { nip19 } from 'nostr-tools';

// Cache for user profiles to avoid repeated requests
const profileCache = new Map();

/**
 * Fetch user profile metadata from Nostr relays
 * @param {string} pubkey - Hex pubkey of the user
 * @param {string[]} relays - Array of relay URLs
 * @returns {Promise<Object>} - User profile data { name, about, picture }
 */
export async function fetchUserProfile(pubkey, relays = getDefaultRelays()) {
  // Check cache first
  if (profileCache.has(pubkey)) {
    return profileCache.get(pubkey);
  }

  // Convert npub to hex if needed
  let hexPubkey = pubkey;
  if (pubkey.startsWith('npub1')) {
    try {
      const { data } = nip19.decode(pubkey);
      hexPubkey = data;
    } catch (e) {
      console.error('Invalid npub format:', e);
    }
  }

  // Default profile
  const defaultProfile = {
    name: `nostr:${hexPubkey.slice(0, 8)}...`,
    about: null,
    picture: null
  };

  // Try to fetch profile from relays
  try {
    const profile = await Promise.race([
      fetchProfileFromRelays(hexPubkey, relays),
      // Timeout after 3 seconds to not block the UI
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
    ]);
    
    // Cache the result
    profileCache.set(pubkey, profile);
    return profile;
  } catch (error) {
    console.warn(`Failed to fetch profile for ${pubkey}:`, error.message);
    return defaultProfile;
  }
}

/**
 * Internal function to fetch profile from multiple relays
 */
async function fetchProfileFromRelays(pubkey, relays) {
  // Create a unique subscription ID
  const subId = `profile_${Math.random().toString(36).slice(2)}`;
  
  // Try each relay until we get a result
  const profilePromises = relays.map(url => {
    return new Promise((resolve, reject) => {
      let ws;
      try {
        ws = new WebSocket(url);
      } catch (e) {
        return reject(new Error(`Invalid WebSocket URL: ${url}`));
      }
      
      // Set timeout
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error(`Timeout connecting to ${url}`));
      }, 5000);
      
      ws.onerror = (err) => {
        clearTimeout(timeout);
        ws.close();
        reject(new Error(`WebSocket error on ${url}: ${err.message}`));
      };
      
      ws.onopen = () => {
        // Subscribe to kind 0 (metadata) events for this pubkey
        const subscribeMsg = JSON.stringify([
          "REQ", 
          subId,
          {
            kinds: [0],
            authors: [pubkey],
            limit: 1
          }
        ]);
        ws.send(subscribeMsg);
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Handle EVENT messages only
          if (message[0] === "EVENT" && message[1] === subId && message[2]) {
            const profileEvent = message[2];
            
            // Parse JSON content (metdata is stored as JSON string)
            let parsedContent;
            try {
              parsedContent = JSON.parse(profileEvent.content);
            } catch (e) {
              console.error("Failed to parse profile content:", e);
              parsedContent = {};
            }
            
            // Extract profile data
            const profile = {
              name: parsedContent.name || `nostr:${pubkey.slice(0, 8)}...`,
              about: parsedContent.about || null,
              picture: parsedContent.picture || null
            };
            
            // Clean up and resolve
            clearTimeout(timeout);
            ws.close();
            resolve(profile);
          }
          
          // Handle EOSE (End of Stored Events)
          if (message[0] === "EOSE" && message[1] === subId) {
            // No events found, use default
            clearTimeout(timeout);
            ws.close();
            resolve({
              name: `nostr:${pubkey.slice(0, 8)}...`,
              about: null,
              picture: null
            });
          }
        } catch (err) {
          console.error("Error processing message:", err);
        }
      };
    });
  });
  
  // Use the first successful response
  return Promise.any(profilePromises).catch(() => {
    // All relays failed, return default profile
    return {
      name: `nostr:${pubkey.slice(0, 8)}...`,
      about: null,
      picture: null
    };
  });
}

/**
 * Get default relays if none specified
 */
function getDefaultRelays() {
  // These are popular Nostr relays
  return [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.nostr.band',
    'wss://nostr-pub.wellorder.net',
    'wss://relay.current.fyi'
  ];
}

/**
 * Convert hex pubkey to npub format
 */
export function hexToNpub(hex) {
  try {
    return nip19.npubEncode(hex);
  } catch (e) {
    console.error('Failed to convert hex to npub:', e);
    return `npub_error_${hex.slice(0, 8)}`;
  }
}

/**
 * Convert npub to hex format
 */
export function npubToHex(npub) {
  try {
    const { data } = nip19.decode(npub);
    return data;
  } catch (e) {
    console.error('Failed to convert npub to hex:', e);
    return npub;
  }
}
