// pages/index.js - Modern stylish feed with fixed profile handling
import React, { useState, useEffect } from 'react';
import Head from 'next/head';

// Constants that can be moved to environment variables
const BOT_NAME = process.env.NEXT_PUBLIC_BOT_NAME || 'Nostr Spotify Bot';
const BOT_AVATAR = process.env.NEXT_PUBLIC_BOT_AVATAR || 'https://nostr.build/i/nostr.png';
const BOT_NPUB = process.env.NEXT_PUBLIC_BOT_PUBKEY || 'npub1...';
const BOT_ABOUT = process.env.NEXT_PUBLIC_BOT_ABOUT || 'Create Spotify playlists via Nostr mentions';

// Relay list for profile fetching - using multiple relays for redundancy
const RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
  'wss://nostr.wine',
  'wss://purplepag.es'
];

export default function Home() {
  // State management
  const [playlists, setPlaylists] = useState([]);
  const [stats, setStats] = useState({ playlists: 0, tracks: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('explore'); // 'explore' or 'how-to'
  const [fetchQueue, setFetchQueue] = useState([]);
  const [isFetching, setIsFetching] = useState(false);

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Function to fetch playlists and stats
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch playlists
      const playlistRes = await fetch('/api/leaderboard');
      if (!playlistRes.ok) throw new Error('Failed to load playlists');
      let playlistData = await playlistRes.json();
      
      // Initialize playlist data with placeholder profiles
      playlistData = playlistData.map(playlist => ({
        ...playlist,
        name: null,
        profilePic: null,
        profileLoaded: false,
        profileError: false
      }));
      
      setPlaylists(playlistData);
      
      // Fetch stats
      const statsRes = await fetch('/api/stats');
      if (!statsRes.ok) throw new Error('Failed to load stats');
      const statsData = await statsRes.json();
      
      setStats({
        playlists: statsData.total || 0,
        tracks: statsData.tracks || 0
      });
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Function to safely fetch profile with fallbacks
  const fetchProfile = async (pubkey) => {
    if (typeof window === 'undefined') return null;
    
    try {
      // Dynamic import to avoid SSR issues
      const nostrTools = await import('nostr-tools');
      
      // Create a pool for the relays
      const pool = new nostrTools.SimplePool();
      
      // Only use one relay at a time to avoid rate limiting
      // Choose a random relay from our list to distribute load
      const relay = RELAYS[Math.floor(Math.random() * RELAYS.length)];
      console.log(`Fetching profile for ${pubkey.substring(0, 8)} from ${relay}`);
      
      // Create subscription filter
      const filter = {
        kinds: [0],
        authors: [pubkey],
        limit: 1
      };
      
      // Set a timeout to avoid hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
      );
      
      // Try to fetch profile
      const eventPromise = pool.list([relay], [filter]);
      
      // Race between fetch and timeout
      const events = await Promise.race([eventPromise, timeoutPromise]);
      
      // Clean up
      try {
        pool.close([relay]);
      } catch (e) {
        console.warn('Error closing pool:', e);
      }
      
      // Parse the profile data if available
      if (events && events.length > 0) {
        try {
          const content = JSON.parse(events[0].content);
          return {
            name: content.name || null,
            picture: content.picture || null,
            about: content.about || null
          };
        } catch (e) {
          console.error('Error parsing profile data:', e);
        }
      }
      
    } catch (e) {
      console.error(`Error fetching profile for ${pubkey.substring(0, 8)}:`, e);
    }
    
    return null;
  };

  // Process the queue with rate limiting
  const processQueue = async () => {
    if (isFetching || fetchQueue.length === 0) return;
    
    setIsFetching(true);
    
    const nextIndex = fetchQueue[0];
    setFetchQueue(prevQueue => prevQueue.slice(1));
    
    try {
      // Only process if the playlist still exists and profile isn't loaded
      if (playlists[nextIndex] && !playlists[nextIndex].profileLoaded) {
        const profile = await fetchProfile(playlists[nextIndex].pubkey);
        
        setPlaylists(prevPlaylists => {
          const updated = [...prevPlaylists];
          updated[nextIndex] = {
            ...updated[nextIndex],
            name: profile?.name || null,
            profilePic: profile?.picture || null,
            profileLoaded: true,
            profileError: !profile
          };
          return updated;
        });
      }
    } catch (e) {
      console.error('Error processing queue item:', e);
      
      // Mark as error but still as loaded
      setPlaylists(prevPlaylists => {
        const updated = [...prevPlaylists];
        if (updated[nextIndex]) {
          updated[nextIndex] = {
            ...updated[nextIndex],
            profileLoaded: true,
            profileError: true
          };
        }
        return updated;
      });
    }
    
    // Add delay to avoid rate limiting (1 request per second)
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    setIsFetching(false);
  };

  // Queue a profile for loading
  const queueProfileForLoading = (index) => {
    if (!playlists[index] || playlists[index].profileLoaded) return;
    
    // Check if this index is already in the queue
    if (!fetchQueue.includes(index)) {
      setFetchQueue(prevQueue => [...prevQueue, index]);
    }
  };

  // Effect to start loading profiles once playlists are loaded
  useEffect(() => {
    if (playlists.length > 0 && !loading) {
      // Queue the first few visible playlists
      const initialLoadCount = Math.min(5, playlists.length);
      for (let i = 0; i < initialLoadCount; i++) {
        queueProfileForLoading(i);
      }
    }
  }, [playlists, loading]);

  // Effect to process the queue
  useEffect(() => {
    processQueue();
  }, [fetchQueue, isFetching]);

  // Function to copy NPUB to clipboard
  const copyNpub = () => {
    navigator.clipboard.writeText(BOT_NPUB);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Handle image load errors
  const handleImageError = (index) => {
    setPlaylists(prev => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          profilePic: null, // Reset to null so we use fallback
          profileError: true
        };
      }
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Head>
        <title>{BOT_NAME}</title>
        <meta name="description" content="Create and share Spotify playlists via Nostr" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style>{`
          :root {
            --spotify-green: #1DB954;
            --spotify-green-hover: #1ed760;
            --dark-bg: #121212;
            --card-bg: #181818;
            --highlight: #282828;
          }
          
          body {
            font-family: 'Inter', sans-serif;
            background-color: var(--dark-bg);
            color: #fff;
          }
          
          h1, h2, h3, h4, h5, h6 {
            font-family: 'Manrope', sans-serif;
          }
          
          .spotify-card iframe {
            max-height: 80px !important;
            border-radius: 0 0 8px 8px;
          }
          
          .npub-box {
            font-family: monospace;
            overflow-wrap: break-word;
            word-wrap: break-word;
            word-break: break-all;
          }
          
          .profile-image {
            width: 32px;
            height: 32px;
            object-fit: cover;
          }
          
          .spotify-icon {
            width: 14px;
            height: 14px;
          }
          
          .step-number {
            width: 24px;
            height: 24px;
            font-size: 12px;
          }
          
          .nav-tab {
            transition: all 0.3s ease;
            position: relative;
          }
          
          .nav-tab.active::after {
            content: '';
            position: absolute;
            bottom: -1px;
            left: 25%;
            width: 50%;
            height: 2px;
            background-color: var(--spotify-green);
            border-radius: 1px;
          }
          
          .nav-tab.active {
            color: var(--spotify-green);
          }
          
          .btn {
            transition: all 0.2s ease;
            font-weight: 500;
          }
          
          .btn:hover {
            transform: translateY(-1px);
          }
          
          .btn:active {
            transform: translateY(1px);
          }
          
          .btn-primary {
            background-color: var(--spotify-green);
          }
          
          .btn-primary:hover {
            background-color: var(--spotify-green-hover);
          }
          
          .spotify-btn {
            background-color: var(--spotify-green);
            color: #000;
            font-weight: 600;
            letter-spacing: 0.5px;
            transition: all 0.2s ease;
          }
          
          .spotify-btn:hover {
            background-color: var(--spotify-green-hover);
            transform: scale(1.03);
          }
          
          .card {
            background-color: var(--card-bg);
            border: 1px solid var(--highlight);
            transition: all 0.2s ease;
          }
          
          .card:hover {
            background-color: #202020;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          }
          
          .shimmer {
            background: linear-gradient(90deg, 
              rgba(255,255,255,0.05) 0%, 
              rgba(255,255,255,0.1) 50%, 
              rgba(255,255,255,0.05) 100%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }
          
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}</style>
      </Head>

      {/* Header */}
      <header className="border-b border-gray-800 bg-gradient-to-r from-gray-900 to-black">
        <div className="container mx-auto max-w-2xl px-4 py-3">
          <div className="flex items-center">
            <img 
              src={BOT_AVATAR} 
              alt={BOT_NAME} 
              className="w-10 h-10 rounded-full border border-gray-700"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%231DB954'%3E%3Cpath d='M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.059 14.406c-.182.304-.547.406-.851.205-2.334-1.424-5.268-1.75-8.72-.963-.365.086-.742-.15-.828-.518-.085-.367.148-.742.517-.828 3.78-.869 7.082-.478 9.68 1.143.305.181.407.547.202.851zm1.082-2.412c-.229.38-.684.501-1.064.271-2.669-1.639-6.738-2.114-9.893-1.157-.408.123-.842-.108-.964-.517-.123-.408.108-.842.517-.964 3.603-1.092 8.082-.566 11.127 1.303.379.23.5.686.277 1.064zm.093-2.509c-3.2-1.9-8.48-2.076-11.54-1.148-.49.152-1.006-.123-1.157-.613-.152-.49.124-1.007.614-1.158 3.517-1.068 9.361-.855 13.058 1.322.455.283.595.877.312 1.333-.283.456-.878.596-1.334.312z'/%3E%3C/svg%3E";
              }}
            />
            <div className="ml-3">
              <h1 className="text-xl font-bold text-green-400">{BOT_NAME}</h1>
              <p className="text-xs text-gray-400">{BOT_ABOUT}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="border-b border-gray-800 bg-black sticky top-0 z-10">
        <div className="container mx-auto max-w-2xl px-4">
          <div className="flex">
            <button 
              onClick={() => setActiveTab('explore')}
              className={`nav-tab py-3 px-4 font-medium text-sm ${activeTab === 'explore' ? 'active' : 'text-gray-400'}`}
            >
              Explore Playlists
            </button>
            <button 
              onClick={() => setActiveTab('how-to')}
              className={`nav-tab py-3 px-4 font-medium text-sm ${activeTab === 'how-to' ? 'active' : 'text-gray-400'}`}
            >
              How It Works
            </button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto max-w-2xl px-4 py-4">
        {activeTab === 'explore' ? (
          <>
            {/* Stats Card */}
            <div className="card rounded-lg p-4 mb-4 flex justify-between">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{stats.playlists}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">Playlists</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{stats.tracks || '—'}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">Tracks</div>
              </div>
            </div>

            {/* Playlists Feed */}
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block w-10 h-10 rounded-full border-2 border-green-500 border-t-transparent animate-spin"></div>
                  <p className="mt-2 text-gray-400">Loading playlists...</p>
                </div>
              ) : error ? (
                <div className="card rounded-lg p-4 text-center">
                  <p className="text-red-400">Error: {error}</p>
                  <button 
                    onClick={fetchData}
                    className="mt-2 btn btn-primary px-4 py-2 rounded-full text-black text-sm"
                  >
                    Try Again
                  </button>
                </div>
              ) : playlists.length === 0 ? (
                <div className="card rounded-lg p-6 text-center">
                  <p className="text-gray-400">No playlists yet. Be the first to create one!</p>
                </div>
              ) : (
                playlists.map((playlist, index) => {
                  // Get display name - try profile name first, fall back to pubkey
                  const displayName = playlist.name || `nostr:${playlist.pubkey.substring(0, 8)}`;
                  
                  // Extract playlist ID for embed
                  const playlistId = playlist.playlistUrl.split('playlist/')[1];
                  
                  // Show loading state if profile not yet loaded
                  const isLoading = !playlist.profileLoaded;

                  return (
                    <div key={playlist.pubkey} className="card rounded-lg overflow-hidden spotify-card">
                      {/* Playlist Creator Info */}
                      <div className="p-3 border-b border-gray-800 flex justify-between items-center">
                        <div className="flex items-center">
                          {isLoading ? (
                            // Loading placeholder
                            <div className="profile-image rounded-full shimmer"></div>
                          ) : playlist.profilePic ? (
                            // Profile picture from Nostr
                            <img 
                              src={playlist.profilePic} 
                              alt=""
                              className="profile-image rounded-full border border-gray-700" 
                              onError={() => handleImageError(index)}
                            />
                          ) : (
                            // Fallback for no profile picture
                            <div className="profile-image flex items-center justify-center bg-gradient-to-br from-purple-600 to-purple-900 rounded-full text-xs font-bold">
                              {playlist.pubkey.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          
                          <div className="ml-2 overflow-hidden">
                            <div className="font-medium text-sm truncate">
                              {isLoading ? (
                                <div className="w-24 h-4 rounded shimmer"></div>
                              ) : (
                                displayName
                              )}
                            </div>
                            <div className="text-xs text-gray-500 font-mono truncate">
                              {playlist.pubkey.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                        <a 
                          href={playlist.playlistUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="spotify-btn px-3 py-1.5 rounded-full flex items-center text-xs"
                        >
                          <svg className="spotify-icon mr-1.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                          </svg>
                          Open
                        </a>
                      </div>

                      {/* Spotify Embed */}
                      <iframe 
                        src={`https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=0`}
                        width="100%" 
                        height="80" 
                        frameBorder="0" 
                        allowtransparency="true" 
                        allow="encrypted-media"
                        loading="lazy"
                      ></iframe>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          // How It Works tab content
          <div className="space-y-6">
            {/* Bot Info */}
            <div className="card rounded-lg p-4">
              <h2 className="font-bold text-lg mb-2 text-green-400">About This Bot</h2>
              <p className="text-sm text-gray-300 mb-3">
                This bot creates Spotify playlists from tracks you share in Nostr posts.
                Each user gets their own playlist that grows as they add more tracks.
              </p>
              
              {/* Full NPUB Display */}
              <div className="bg-gray-800 rounded-lg p-3 mt-4">
                <div className="text-xs text-gray-500 mb-1">Bot NPUB</div>
                <div className="flex items-center justify-between">
                  <div className="npub-box text-xs text-gray-300 overflow-hidden pr-2 flex-1">
                    {BOT_NPUB}
                  </div>
                  <button 
                    onClick={copyNpub}
                    className="btn spotify-btn px-3 py-1.5 rounded text-xs flex items-center"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* Steps to Use */}
            <div className="card rounded-lg p-4">
              <h2 className="font-bold text-lg mb-3 text-green-400">How To Use</h2>
              <div className="space-y-4">
                <div className="flex">
                  <div className="step-number bg-green-900 rounded-full flex items-center justify-center text-white mr-3 flex-shrink-0">1</div>
                  <div>
                    <h3 className="font-medium text-sm">Mention the bot in a Nostr post</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Include <code className="bg-gray-800 px-1.5 py-0.5 rounded">@{BOT_NPUB.substring(0, 8)}...</code> in your post
                    </p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="step-number bg-green-900 rounded-full flex items-center justify-center text-white mr-3 flex-shrink-0">2</div>
                  <div>
                    <h3 className="font-medium text-sm">Add a Spotify track link</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Include a link to any Spotify track in the same post
                      <br />
                      <span className="text-green-400">Example: spotify:track:... or open.spotify.com/track/...</span>
                    </p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="step-number bg-green-900 rounded-full flex items-center justify-center text-white mr-3 flex-shrink-0">3</div>
                  <div>
                    <h3 className="font-medium text-sm">Optional: Name your playlist</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Add <code className="bg-gray-800 px-1.5 py-0.5 rounded">#PlaylistName</code> to customize your playlist name
                    </p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="step-number bg-green-900 rounded-full flex items-center justify-center text-white mr-3 flex-shrink-0">4</div>
                  <div>
                    <h3 className="font-medium text-sm">Get your playlist</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      The bot will reply with a link to your Spotify playlist
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Example Post */}
            <div className="card rounded-lg p-4">
              <h2 className="font-bold text-lg mb-2 text-green-400">Example Post</h2>
              <div className="bg-gray-800 rounded-lg p-3 text-sm text-gray-300">
                <p>Hey @{BOT_NPUB.substring(0, 8)}... check out this amazing track!</p>
                <p className="text-green-400 mt-2">https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT</p>
                <p className="mt-2">#FavoriteJams</p>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-gray-800 py-4 text-center text-xs text-gray-500">
        <div className="container mx-auto">
          <p>Created with ⚡ using Nostr + Spotify</p>
          <p className="mt-1">© {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}
