// components/NostrProfileLoader.js
import React, { useState, useEffect } from 'react';

// Simple browser-side nostr profile loader 
// This helps when server-side profile fetching fails or times out
export default function NostrProfileLoader({ pubkey, initialName, initialPicture, relays }) {
  const [profileData, setProfileData] = useState({
    name: initialName || `nostr:${pubkey.slice(0, 8)}...`,
    picture: initialPicture
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If we already have data from the server, don't fetch again
    if (initialName && initialName.indexOf('nostr:') !== 0 && initialPicture) {
      return;
    }

    let isMounted = true;
    const defaultRelays = [
      'wss://relay.damus.io',
      'wss://nos.lol',
      'wss://relay.nostr.band'
    ];
    
    const relayList = relays || defaultRelays;
    
    const fetchProfile = async () => {
      setIsLoading(true);
      
      try {
        // Dynamically import nostr libraries only in the browser
        const nostrTools = await import('nostr-tools');
        
        // Create a temporary web socket pool for fetching
        const pool = new nostrTools.SimplePool();
        
        // Subscribe to metadata events for this pubkey
        const filter = {
          kinds: [0],
          authors: [pubkey],
          limit: 1
        };
        
        // Set a timeout to avoid hanging
        const timeoutId = setTimeout(() => {
          if (isMounted) {
            setIsLoading(false);
          }
          pool.close(relayList);
        }, 5000);
        
        // Fetch from relays
        const events = await pool.list(relayList, [filter]);
        
        clearTimeout(timeoutId);
        
        if (!isMounted) return;
        
        // Process events
        if (events && events.length > 0) {
          try {
            const profileEvent = events[0];
            const content = JSON.parse(profileEvent.content);
            
            setProfileData({
              name: content.name || profileData.name,
              picture: content.picture || profileData.picture
            });
          } catch (e) {
            console.error('Error parsing profile content:', e);
          }
        }
      } catch (error) {
        console.warn('Error fetching profile:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    fetchProfile();
    
    return () => {
      isMounted = false;
    };
  }, [pubkey, initialName, initialPicture, relays]);
  
  return { ...profileData, isLoading };
}
