// pages/index.js
import React, { useState, useEffect } from 'react';
import Head from 'next/head';

const BOT_NAME = process.env.NEXT_PUBLIC_BOT_NAME || 'Nostr Spotify Bot';
const BOT_AVATAR = process.env.NEXT_PUBLIC_BOT_AVATAR;
const BOT_NPUB = process.env.NEXT_PUBLIC_BOT_PUBKEY;

export default function Home() {
  const [stats, setStats] = useState({ total: 0 });
  const [leaderboard, setBoard] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchData();
    // Refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const statsResp = await fetch('/api/stats');
      const statsData = await statsResp.json();
      setStats(statsData);

      const boardResp = await fetch('/api/leaderboard');
      const boardData = await boardResp.json();
      setBoard(boardData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleCopyNpub = () => {
    navigator.clipboard.writeText(BOT_NPUB);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <Head>
        <title>{BOT_NAME} - Nostr Spotify Bot</title>
        <meta name="description" content="Create and share Spotify playlists via Nostr" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Hero Section - Much more compact */}
        <section className="mb-8">
          <div className="flex items-center space-x-4">
            {BOT_AVATAR && (
              <img 
                src={BOT_AVATAR} 
                alt={BOT_NAME} 
                className="w-14 h-14 rounded-full" 
              />
            )}
            <div>
              <h1 className="text-2xl font-bold mb-1 bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text">
                {BOT_NAME}
              </h1>
              <div className="relative group">
                <div className="flex items-center space-x-2 bg-gray-800 rounded-full px-3 py-1">
                  <code className="text-xs font-mono text-gray-300 truncate max-w-[180px] md:max-w-[220px]">
                    {BOT_NPUB}
                  </code>
                  <button 
                    onClick={handleCopyNpub}
                    className="text-purple-400 hover:text-purple-300 transition-colors"
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
            </div>
          </div>
          <p className="text-gray-400 mt-4 text-sm">
            Create and share Spotify playlists with friends via Nostr. 
            Tag this bot in your Nostr post with a Spotify track link to add songs to your playlist.
          </p>
        </section>

        {/* How to Use Section - More compact */}
        <section className="mb-8 bg-gray-800 rounded-lg p-4">
          <h2 className="text-xl font-bold mb-3 text-purple-300">
            How to Use
          </h2>
          <div className="text-sm space-y-2 text-gray-300">
            <p>1. Mention <code className="px-1 py-0.5 bg-gray-900 rounded text-xs">@{BOT_NPUB.substring(0, 8)}...</code> in a Nostr post</p>
            <p>2. Include a Spotify track link in your post</p>
            <p>3. Optionally add <code className="px-1 py-0.5 bg-gray-900 rounded text-xs">#PlaylistName</code> to name your playlist</p>
            <p>4. The bot will add your track and reply with your playlist link</p>
          </div>
        </section>

        {/* Stats Section - More compact */}
        <section className="mb-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800 p-3 rounded-lg text-center">
              <p className="text-gray-400 text-xs mb-1">Total Playlists</p>
              <p className="text-xl font-bold text-purple-400">{stats.total || 0}</p>
            </div>
            <div className="bg-gray-800 p-3 rounded-lg text-center">
              <p className="text-gray-400 text-xs mb-1">Tracks Added</p>
              <p className="text-xl font-bold text-purple-400">
                {stats.tracks || '—'}
              </p>
            </div>
          </div>
        </section>

        {/* Playlists Section - Better layout */}
        <section>
          <h2 className="text-xl font-bold mb-4 text-purple-300">
            Public Playlists
          </h2>
          
          {leaderboard.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <p className="text-gray-400 text-sm">No playlists yet. Be the first to create one!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {leaderboard.map(({ pubkey, playlistUrl, name, profilePic }) => (
                <div key={pubkey} className="bg-gray-800 rounded-lg overflow-hidden">
                  <div className="p-3 border-b border-gray-700 flex items-center justify-between">
                    <div className="flex items-center">
                      {/* Profile pic or fallback */}
                      {profilePic ? (
                        <img src={profilePic} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-xs text-white font-bold">
                          {pubkey.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="ml-2">
                        <h3 className="font-medium text-sm text-gray-200">{name || `User ${pubkey.substring(0, 6)}...`}</h3>
                      </div>
                    </div>
                    <a 
                      href={playlistUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs bg-green-700 hover:bg-green-600 text-white px-2 py-1 rounded-full inline-flex items-center transition-colors"
                    >
                      <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                      Open
                    </a>
                  </div>
                  <div className="embed-container w-full">
                    <iframe 
                      src={`https://open.spotify.com/embed/playlist/${playlistUrl.split('playlist/')[1]}`} 
                      width="100%" 
                      height="152" 
                      frameBorder="0" 
                      allowtransparency="true" 
                      allow="encrypted-media"
                    ></iframe>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="mt-8 py-4 text-center text-gray-500 text-xs">
        <p>Created with ⚡ using Nostr + Spotify</p>
      </footer>
    </div>
  );
}
