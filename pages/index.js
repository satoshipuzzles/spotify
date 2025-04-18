// pages/index.js
import React, { useState, useEffect } from 'react';
import Head from 'next/head';

const BOT_NAME = process.env.NEXT_PUBLIC_BOT_NAME || 'Nostr Spotify Bot';
const BOT_AVATAR = process.env.NEXT_PUBLIC_BOT_AVATAR;
const BOT_NPUB = process.env.NEXT_PUBLIC_BOT_PUBKEY;

export default function Home() {
  const [stats, setStats] = useState({ total: 0 });
  const [leaderboard, setBoard] = useState([]);
  const [userPubkey, setUserPubkey] = useState(null);
  const [spotifyLink, setSpotifyLink] = useState('');
  const [playlistName, setPlaylistName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
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

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero Section */}
        <section className="mb-12 text-center">
          <div className="flex flex-col items-center justify-center">
            {BOT_AVATAR && (
              <img 
                src={BOT_AVATAR} 
                alt={BOT_NAME} 
                className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-purple-500 mb-4"
              />
            )}
            <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text">
              {BOT_NAME}
            </h1>
            <div className="relative mt-2 mb-4 group">
              <div className="flex items-center space-x-2 bg-gray-800 rounded-full px-4 py-2">
                <code className="text-xs md:text-sm font-mono text-gray-300 truncate max-w-[200px] md:max-w-md">
                  {BOT_NPUB}
                </code>
                <button 
                  onClick={handleCopyNpub}
                  className="text-purple-400 hover:text-purple-300 transition-colors"
                >
                  {copied ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  )}
                </button>
              </div>
              {copied && (
                <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-purple-400">
                  Copied!
                </span>
              )}
            </div>
            <p className="text-gray-400 max-w-2xl">
              Create and share Spotify playlists with friends via Nostr. 
              Tag this bot in your Nostr post with a Spotify track link to add songs to your playlist.
            </p>
          </div>
        </section>

        {/* How to Use Section */}
        <section className="mb-12 bg-gray-800 rounded-xl p-6">
          <h2 className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text">
            How to Use
          </h2>
          <div className="space-y-8 md:space-y-0 md:grid md:grid-cols-2 md:gap-8">
            <div className="bg-gray-700/50 p-5 rounded-xl">
              <h3 className="text-xl font-semibold mb-3 text-purple-300">From any Nostr client</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300">
                <li>Open your favorite Nostr client (Damus, Iris, etc.)</li>
                <li>
                  Compose a note mentioning the bot: 
                  <code className="mx-1 px-1 py-0.5 bg-gray-900 rounded text-sm">@{BOT_NPUB.substring(0, 8)}...</code>
                </li>
                <li>
                  Include a Spotify track link:
                  <code className="mx-1 px-1 py-0.5 bg-gray-900 rounded text-sm">https://open.spotify.com/track/...</code>
                </li>
                <li>
                  <span className="text-purple-300">(Optional)</span> Add a hashtag to name your playlist:
                  <code className="mx-1 px-1 py-0.5 bg-gray-900 rounded text-sm">#MyAwesomePlaylist</code>
                </li>
                <li>Publish the note and the bot will add the track to your playlist!</li>
              </ol>
            </div>
            
            <div className="bg-gray-700/50 p-5 rounded-xl">
              <h3 className="text-xl font-semibold mb-3 text-purple-300">Example</h3>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <p className="text-gray-300 mb-2">
                  Hey <span className="text-purple-400">@{BOT_NPUB.substring(0, 8)}...</span> check out this song!
                </p>
                <p className="text-blue-400 mb-2">
                  https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT
                </p>
                <p className="text-green-400">
                  #ChillVibes
                </p>
              </div>
              <div className="mt-4 text-gray-400 text-sm">
                The bot will create a playlist named "ChillVibes" and add the track.
                You'll receive a reply with a link to your playlist.
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text">
            Stats
          </h2>
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-700/50 p-4 rounded-lg text-center">
                <p className="text-gray-400 text-sm mb-1">Total Playlists</p>
                <p className="text-3xl font-bold text-purple-400">{stats.total || 0}</p>
              </div>
              <div className="bg-gray-700/50 p-4 rounded-lg text-center">
                <p className="text-gray-400 text-sm mb-1">Tracks Added</p>
                <p className="text-3xl font-bold text-purple-400">
                  {stats.tracks || '—'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Playlists Section */}
        <section>
          <h2 className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text">
            Public Playlists
          </h2>
          
          {leaderboard.length === 0 ? (
            <div className="bg-gray-800 rounded-xl p-8 text-center">
              <p className="text-gray-400">No playlists yet. Be the first to create one!</p>
              <button 
                onClick={() => handleCopyNpub()}
                className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-full transition-colors"
              >
                Copy Bot Npub
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {leaderboard.map(({ pubkey, playlistUrl }) => (
                <div key={pubkey} className="bg-gray-800 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-gray-700">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        {pubkey.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="ml-3">
                        <h3 className="font-medium text-gray-200">Playlist by {pubkey.substring(0, 8)}...</h3>
                      </div>
                      <div className="ml-auto">
                        <a 
                          href={playlistUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-full inline-flex items-center transition-colors"
                        >
                          <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                          </svg>
                          Open in Spotify
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="playlist-embed bg-black">
                    <iframe 
                      src={`https://open.spotify.com/embed/playlist/${playlistUrl.split('playlist/')[1]}`} 
                      width="100%" 
                      height="352" 
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

      <footer className="mt-12 py-6 text-center text-gray-500 text-sm">
        <p>Created with ⚡ using Nostr + Spotify</p>
      </footer>
    </div>
  );
}
