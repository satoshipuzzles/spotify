// pages/index.js
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useNostrProfile } from '../components/NostrProfileLoader';

const BOT_NAME = process.env.NEXT_PUBLIC_BOT_NAME || 'Nostr Spotify Bot';
const BOT_AVATAR = process.env.NEXT_PUBLIC_BOT_AVATAR;
const BOT_NPUB = process.env.NEXT_PUBLIC_BOT_PUBKEY;
const BOT_ABOUT = process.env.NEXT_PUBLIC_BOT_ABOUT || 'Create and share Spotify playlists with friends via Nostr.';

export default function Home() {
  const [stats, setStats] = useState({ total: 0, tracks: 0 });
  const [leaderboard, setBoard] = useState([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
    // Refresh data every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch stats
      const statsResp = await fetch('/api/stats');
      if (!statsResp.ok) throw new Error('Failed to fetch stats');
      const statsData = await statsResp.json();
      setStats(statsData);

      // Fetch leaderboard
      const boardResp = await fetch('/api/leaderboard');
      if (!boardResp.ok) throw new Error('Failed to fetch playlists');
      const boardData = await boardResp.json();
      setBoard(boardData);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyNpub = () => {
    navigator.clipboard.writeText(BOT_NPUB);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <Head>
        <title>{BOT_NAME} - Nostr Spotify Bot</title>
        <meta name="description" content="Create and share Spotify playlists via Nostr" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <style>{`
          /* Fix for Spotify iframe sizing */
          .spotify-embed {
            max-width: 100%;
            overflow: hidden;
          }
          .spotify-embed iframe {
            max-width: 100%;
          }
          
          /* Global styles */
          body {
            background-color: #111827;
            color: #f3f4f6;
            font-family: sans-serif;
          }
        `}</style>
      </Head>

      <main className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Header Section */}
        <header className="mb-8 border-b border-gray-800 pb-4">
          <div className="flex items-center space-x-4">
            {BOT_AVATAR && (
              <div className="flex-shrink-0">
                <img 
                  src={BOT_AVATAR} 
                  alt={BOT_NAME} 
                  className="w-12 h-12 rounded-full border-2 border-purple-500" 
                />
              </div>
            )}
            <div className="flex-grow">
              <h1 className="text-2xl font-bold mb-1 bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text">
                {BOT_NAME}
              </h1>
              <p className="text-gray-400 text-sm">{BOT_ABOUT}</p>
            </div>
          </div>
          
          <div className="mt-4 flex items-center">
            <div className="bg-gray-800 rounded-full px-3 py-1.5 flex items-center w-full max-w-md">
              <code className="text-xs font-mono text-gray-300 truncate flex-grow">
                {BOT_NPUB}
              </code>
              <button 
                onClick={handleCopyNpub}
                className="text-purple-400 hover:text-purple-300 transition-colors ml-2 p-1 rounded-full hover:bg-gray-700"
                aria-label="Copy NPUB"
              >
                {copied ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* How to Use Section */}
        <section className="mb-8 bg-gray-800 rounded-lg p-5 shadow-lg">
          <h2 className="text-xl font-bold mb-3 text-purple-300 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            How to Use
          </h2>
          <div className="space-y-3 text-gray-300">
            <div className="flex items-start">
              <div className="bg-purple-900 rounded-full w-6 h-6 flex items-center justify-center text-xs mr-3 mt-0.5 flex-shrink-0">1</div>
              <p>Mention <code className="px-2 py-1 bg-gray-900 rounded text-xs font-mono">@{BOT_NPUB.substring(0, 8)}...</code> in your Nostr post</p>
            </div>
            <div className="flex items-start">
              <div className="bg-purple-900 rounded-full w-6 h-6 flex items-center justify-center text-xs mr-3 mt-0.5 flex-shrink-0">2</div>
              <p>Include a Spotify track link in your post <span className="text-green-400">(spotify:track:... or open.spotify.com/track/...)</span></p>
            </div>
            <div className="flex items-start">
              <div className="bg-purple-900 rounded-full w-6 h-6 flex items-center justify-center text-xs mr-3 mt-0.5 flex-shrink-0">3</div>
              <p>Optionally add <code className="px-2 py-1 bg-gray-900 rounded text-xs font-mono">#PlaylistName</code> to name your playlist</p>
            </div>
            <div className="flex items-start">
              <div className="bg-purple-900 rounded-full w-6 h-6 flex items-center justify-center text-xs mr-3 mt-0.5 flex-shrink-0">4</div>
              <p>The bot will add your track and reply with your playlist link</p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4 text-purple-300 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Stats
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-lg shadow-lg text-center border border-gray-700">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Playlists Created</p>
              <p className="text-2xl font-bold text-purple-400">{loading ? '...' : stats.total || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-lg shadow-lg text-center border border-gray-700">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Total Tracks</p>
              <p className="text-2xl font-bold text-purple-400">
                {loading ? '...' : stats.tracks || '—'}
              </p>
            </div>
          </div>
        </section>

        {/* Playlists Section */}
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4 text-purple-300 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            Public Playlists
          </h2>
          
          {loading ? (
            <div className="bg-gray-800 rounded-lg p-8 text-center">
              <svg className="animate-spin h-8 w-8 mx-auto text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-4 text-gray-400">Loading playlists...</p>
            </div>
          ) : error ? (
            <div className="bg-gray-800 rounded-lg p-6 text-center border border-red-900">
              <p className="text-red-400">Error loading playlists: {error}</p>
              <button 
                onClick={fetchData} 
                className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md text-sm font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-6 text-center border border-gray-700">
              <p className="text-gray-400">No playlists yet. Be the first to create one!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {leaderboard.map(({ pubkey, playlistUrl, name, profilePic }) => {
                // Use the custom hook to fetch profile data
                const { name: enhancedName, picture: enhancedPic, isLoading } = 
                  useNostrProfile(pubkey, name, profilePic);
                
                // Use the enhanced data if available, fall back to server data
                const displayName = enhancedName || name || `User ${pubkey.substring(0, 6)}...`;
                const displayPic = enhancedPic || profilePic;
                
                return (
                  <div key={pubkey} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700">
                    <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                      <div className="flex items-center">
                        {/* Profile pic or fallback with loading state */}
                        {isLoading ? (
                          <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center animate-pulse">
                            <span className="sr-only">Loading profile</span>
                          </div>
                        ) : displayPic ? (
                          <img 
                            src={displayPic} 
                            alt="" 
                            className="w-10 h-10 rounded-full border border-gray-600 object-cover"
                            onError={(e) => {
                              // If image fails to load, show fallback
                              e.target.style.display = 'none';
                              e.target.nextElementSibling.style.display = 'flex';
                            }} 
                          />
                        ) : null}
                        
                        {/* Always render fallback div but hide it if we have a valid image */}
                        <div 
                          className={`w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-800 rounded-full flex items-center justify-center text-sm text-white font-bold ${displayPic ? 'hidden' : ''}`}
                        >
                          {pubkey.substring(0, 2).toUpperCase()}
                        </div>
                        
                        <div className="ml-3">
                          <h3 className="font-medium text-gray-200">
                            {displayName}
                            {isLoading && <span className="ml-2 inline-block w-2 h-2 bg-purple-400 rounded-full animate-pulse"></span>}
                          </h3>
                          <p className="text-xs text-gray-400 font-mono">{pubkey.substring(0, 10)}...</p>
                        </div>
                      </div>
                      <a 
                        href={playlistUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs bg-green-800 hover:bg-green-700 text-white px-3 py-1.5 rounded-full inline-flex items-center transition-colors"
                      >
                        <svg className="w-3.5 h-3.5 mr-1.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                        </svg>
                        Open in Spotify
                      </a>
                    </div>
                    <div className="w-full bg-black spotify-embed">
                      <iframe 
                        src={`https://open.spotify.com/embed/playlist/${playlistUrl.split('playlist/')[1]}`} 
                        width="100%" 
                        height="152" 
                        frameBorder="0" 
                        allowtransparency="true" 
                        allow="encrypted-media"
                        loading="lazy"
                        title={`Playlist by ${displayName}`}
                      ></iframe>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <footer className="py-6 text-center text-gray-500 text-sm border-t border-gray-800">
        <div className="container mx-auto px-4">
          <p>Created with ⚡ using Nostr + Spotify</p>
          <p className="text-xs mt-2">© {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}
