// components/PlaylistItem.js - With improved sizing
import React, { useState, useEffect } from 'react';

export default function PlaylistItem({ pubkey, playlistUrl, name, profilePic }) {
  const [profileData, setProfileData] = useState({
    name: name || `nostr:${pubkey.slice(0, 8)}...`,
    picture: profilePic,
    isLoading: false
  });

  useEffect(() => {
    // If we already have complete data from the server, don't fetch again
    if (name && name.indexOf('nostr:') !== 0 && profilePic) {
      return;
    }

    let isMounted = true;
    setProfileData(prev => ({ ...prev, isLoading: true }));
    
    // Only attempt client-side fetching in browser environment
    if (typeof window !== 'undefined') {
      const fetchProfile = async () => {
        try {
          // Attempt to import nostr-tools dynamically
          const nostrTools = await import('nostr-tools');
          
          // Create a web socket pool
          const pool = new nostrTools.SimplePool();
          
          // Use some default relays
          const relayList = [
            'wss://relay.damus.io',
            'wss://nos.lol',
            'wss://relay.nostr.band'
          ];
          
          // Subscribe to kind 0 events for this pubkey
          const filter = {
            kinds: [0],
            authors: [pubkey],
            limit: 1
          };
          
          // Set a timeout to avoid hanging
          const timeoutId = setTimeout(() => {
            if (isMounted) {
              setProfileData(prev => ({ ...prev, isLoading: false }));
            }
            pool.close(relayList);
          }, 5000);
          
          // Fetch from relays
          const events = await pool.list(relayList, [filter]);
          clearTimeout(timeoutId);
          
          if (!isMounted) return;
          
          // Process events if we got any
          if (events && events.length > 0) {
            try {
              const profileEvent = events[0];
              const content = JSON.parse(profileEvent.content);
              
              setProfileData({
                name: content.name || profileData.name,
                picture: content.picture || profileData.picture,
                isLoading: false
              });
            } catch (e) {
              console.error('Error parsing profile content:', e);
              setProfileData(prev => ({ ...prev, isLoading: false }));
            }
          } else {
            setProfileData(prev => ({ ...prev, isLoading: false }));
          }
        } catch (error) {
          console.warn('Error fetching profile:', error);
          if (isMounted) {
            setProfileData(prev => ({ ...prev, isLoading: false }));
          }
        }
      };
      
      fetchProfile();
    }
    
    return () => {
      isMounted = false;
    };
  }, [pubkey, name, profilePic]);
  
  // Destructure the state for convenience
  const { name: displayName, picture: displayPic, isLoading } = profileData;

  // Format pubkey to show only the start
  const shortPubkey = pubkey.substring(0, 6);

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-md border border-gray-700 mb-3">
      <div className="p-3 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center">
          {/* Profile pic or fallback with loading state */}
          {isLoading ? (
            <div className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center animate-pulse">
              <span className="sr-only">Loading profile</span>
            </div>
          ) : displayPic ? (
            <img 
              src={displayPic} 
              alt="" 
              className="w-7 h-7 rounded-full border border-gray-600 object-cover"
              onError={(e) => {
                // If image fails to load, show fallback
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'flex';
              }} 
            />
          ) : null}
          
          {/* Always render fallback div but hide it if we have a valid image */}
          <div 
            className={`w-7 h-7 bg-gradient-to-br from-purple-600 to-purple-800 rounded-full flex items-center justify-center text-xs text-white font-bold ${displayPic ? 'hidden' : ''}`}
          >
            {shortPubkey.substring(0, 2).toUpperCase()}
          </div>
          
          <div className="ml-2.5">
            <h3 className="font-medium text-gray-200 text-sm">
              {displayName}
              {isLoading && <span className="ml-1.5 inline-block w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse"></span>}
            </h3>
            <p className="text-xs text-gray-400 font-mono">{shortPubkey}...</p>
          </div>
        </div>
        <a 
          href={playlistUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs bg-green-800 hover:bg-green-700 text-white px-2.5 py-1 rounded-full inline-flex items-center transition-colors"
        >
          <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
          Open
        </a>
      </div>
      <div className="w-full bg-black spotify-embed">
        <iframe 
          src={`https://open.spotify.com/embed/playlist/${playlistUrl.split('playlist/')[1]}`} 
          width="100%" 
          height="80" 
          frameBorder="0" 
          allowtransparency="true" 
          allow="encrypted-media"
          loading="lazy"
          title={`Playlist by ${displayName}`}
        ></iframe>
      </div>
    </div>
  );
}
