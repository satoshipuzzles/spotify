// pages/index.js - Updated header with better sizing
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import PlaylistItem from '../components/PlaylistItem';

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

  // Format NPUB to show first 8 chars + ... + last 4 chars
  const formatNpub = (npub) => {
    if (!npub || npub.length < 12) return npub;
    return `${npub.substring(0, 8)}...${npub.substring(npub.length - 4)}`;
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
            height: 80px !important;
          }
          
          /* Global styles */
          body {
            background-color: #111827;
            color: #f3f4f6;
            font-family: 'Inter', sans-serif;
          }
          
          /* Fix icon sizes */
          .icon-sm {
            width: 16px;
            height: 16px;
          }
          
          /* Fix avatar sizes */
          .avatar-sm {
            width: 28px;
            height: 28px;
          }
          
          .avatar-md {
            width: 36px;
            height: 36px;
          }
          
          /* Fix for button animations */
          .copy-btn-animation {
            transition: all 0.2s ease;
          }
          
          .copy-btn-animation:hover {
            transform: scale(1.05);
          }
          
          .copy-btn-animation:active {
            transform: scale(0.95);
          }
        `}</style>
      </Head>

      <main className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Header Section - Resized and improved */}
        <header className="mb-6 border-b border-gray-800 pb-4">
          <div className="flex items-center space-x-3">
            {BOT_AVATAR && (
              <div className="flex-shrink-0">
                <img 
                  src={BOT_AVATAR} 
                  alt={BOT_NAME} 
                  className="avatar-md rounded-full border border-purple-500" 
                />
              </div>
            )}
            <div className="flex-grow">
              <h1 className="text-xl font-bold mb-0.5 bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text">
                {BOT_NAME}
              </h1>
              <p className="text-gray-400 text-xs">{BOT_ABOUT}</p>
            </div>
          </div>
          
          {/* NPUB display with better copy UX */}
          <div className="mt-3">
            <div className="bg-gray-800 rounded-lg px-3 py-2 flex items-center justify-between">
              <div className="flex-grow">
                <div className="text-xs text-gray-500 mb-0.5">Bot NPUB:</div>
                <code className="text-xs font-mono text-gray-300">{formatNpub(BOT_NPUB)}</code>
              </div>
              <button 
                onClick={handleCopyNpub}
                className="bg-gray-700 hover:bg-gray-600 text-purple-300 px-3 py-1.5 rounded-md text-xs font-medium transition-colors copy-btn-animation ml-2 flex items-center"
                aria-label="Copy NPUB"
              >
                {copied ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* How to Use Section - More compact */}
        <section className="mb-6 bg-gray-800 rounded-lg p-4 shadow-md">
          <h2 className="text-lg font-bold mb-2 text-purple-300 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="icon-sm mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            How to Use
          </h2>
          <div className="space-y-2 text-gray-300 text-sm">
            <div className="flex items-start">
              <div className="bg-purple-900 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5 flex-shrink-0">1</div>
              <p>Mention <code className="px-1.5 py-0.5 bg-gray-900 rounded text-xs font-mono">@{BOT_NPUB?.substring(0, 8)}</code> in your Nostr post</p>
            </div>
            <div className="flex items-start">
              <div className="bg-purple-900 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5 flex-shrink-0">2</div>
              <p>Include a Spotify track link in your post</p>
            </div>
            <div className="flex items-start">
              <div className="bg-purple-900 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5 flex-shrink-0">3</div>
              <p>Optionally add <code className="px-1.5 py-0.5 bg-gray-900 rounded text-xs font-mono">#PlaylistName</code> to customize</p>
            </div>
            <div className="flex items-start">
              <div className="bg-purple-900 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5 flex-shrink-0">4</div>
              <p>The bot will add your track and reply with your playlist link</p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="mb-6">
          <h2 className="text-lg font-bold mb-3 text-purple-300 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="icon-sm mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Stats
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-3 rounded-lg shadow-md text-center border border-gray-700">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Playlists</p>
              <p className="text-xl font-bold text-purple-400">{loading ? '...' : stats.total || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-3 rounded-lg shadow-md text-center border border-gray-700">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Tracks</p>
              <p className="text-xl font-bold text-purple-400">
                {loading ? '...' : stats.tracks || '—'}
              </p>
            </div>
          </div>
        </section>

        {/* Playlists Section */}
        <section className="mb-6">
          <h2 className="text-lg font-bold mb-3 text-purple-300 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="icon-sm mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            Public Playlists
          </h2>
          
          {loading ? (
            <div className="bg-gray-800 rounded-lg p-6 text-center">
              <svg className="animate-spin h-6 w-6 mx-auto text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-3 text-gray-400 text-sm">Loading playlists...</p>
            </div>
          ) : error ? (
            <div className="bg-gray-800 rounded-lg p-4 text-center border border-red-900">
              <p className="text-red-400 text-sm">Error loading playlists: {error}</p>
              <button 
                onClick={fetchData} 
                className="mt-3 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-md text-xs font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-4 text-center border border-gray-700">
              <p className="text-gray-400 text-sm">No playlists yet. Be the first to create one!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((playlist) => (
                <PlaylistItem 
                  key={playlist.pubkey}
                  pubkey={playlist.pubkey}
                  playlistUrl={playlist.playlistUrl}
                  name={playlist.name}
                  profilePic={playlist.profilePic}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="py-4 text-center text-gray-500 text-xs border-t border-gray-800">
        <div className="container mx-auto px-4">
          <p>Created with ⚡ using Nostr + Spotify</p>
          <p className="text-xs mt-1">© {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}
