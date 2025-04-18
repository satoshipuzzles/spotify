// pages/index.js
import React, { useState, useEffect } from 'react';
import { nip19 } from 'nostr-tools';

// Bot information
const BOT_NAME = process.env.NEXT_PUBLIC_BOT_NAME;
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

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(d => setStats(d));
    fetch('/api/leaderboard').then(r => r.json()).then(d => setBoard(d));
  }, []);

  const handleCopyNpub = () => {
    navigator.clipboard.writeText(BOT_NPUB);
    setMessage('Copied to clipboard!');
    setTimeout(() => setMessage(''), 2000);
  };

  const connectNostr = async () => {
    try {
      if (typeof window.nostr === 'undefined') {
        alert('Please install a NIP-07 browser extension like Alby or nos2x!');
        return;
      }
      
      const pubkey = await window.nostr.getPublicKey();
      setUserPubkey(pubkey);
    } catch (error) {
      console.error('Error connecting to Nostr:', error);
      alert('Error connecting to Nostr extension');
    }
  };

  const sendSpotifyTrack = async () => {
    if (!userPubkey) {
      alert('Please connect your Nostr account first!');
      return;
    }
    
    if (!spotifyLink || !spotifyLink.includes('open.spotify.com/track/')) {
      alert('Please enter a valid Spotify track link!');
      return;
    }
    
    try {
      setLoading(true);
      
      // Create event content
      let content = `https://open.spotify.com/track/${spotifyLink.split('track/')[1]}`;
      if (playlistName) {
        content += `\n#${playlistName}`;
      }
      
      // Create and publish event
      const event = {
        kind: 1, // Use kind 1 for compatibility
        created_at: Math.floor(Date.now() / 1000),
        tags: [['p', nip19.decode(BOT_NPUB).data]],
        content: content
      };
      
      await window.nostr.signEvent(event);
      
      // Publish to relays
      const relays = ['wss://relay.damus.io', 'wss://relay.nostrfreaks.com'];
      const pubPromises = relays.map(relay => 
        new Promise((resolve) => {
          const ws = new WebSocket(relay);
          ws.onopen = () => {
            ws.send(JSON.stringify(['EVENT', event]));
            setTimeout(() => {
              ws.close();
              resolve();
            }, 1500);
          };
          ws.onerror = () => {
            resolve();
          };
        })
      );
      
      await Promise.all(pubPromises);
      
      setSpotifyLink('');
      setPlaylistName('');
      setMessage('Track sent successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error sending track:', error);
      alert('Error sending track: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-6 font-sans">
      {/* Bot Info */}
      <section className="text-center mb-8 bg-gradient-to-r from-purple-700 to-blue-500 p-6 rounded-lg text-white">
        <div className="flex items-center justify-center mb-4">
          {BOT_AVATAR && (
            <img 
              src={BOT_AVATAR} 
              alt={BOT_NAME} 
              className="w-20 h-20 rounded-full border-4 border-white"
            />
          )}
          <div className="ml-4 text-left">
            <h1 className="text-3xl font-bold mb-1">{BOT_NAME || 'Spotify Nostr Bot'}</h1>
            <div className="flex items-center">
              <code className="text-sm bg-black/20 px-2 py-1 rounded">{BOT_NPUB}</code>
              <button 
                onClick={handleCopyNpub} 
                className="ml-2 text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
        {message && (
          <div className="mt-2 text-sm bg-white/20 py-1 px-3 rounded-full inline-block">
            {message}
          </div>
        )}
      </section>

      {/* How to Use */}
      <section className="mb-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-3">How to Use</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-bold mb-2">Option 1: Via Nostr Client</h3>
            <ol className="list-decimal ml-5 space-y-2">
              <li>In your Nostr client, compose a note with <code className="bg-gray-100 px-1">@{BOT_NPUB.substring(0, 10)}...</code> and a Spotify track URL.</li>
              <li>Publish the note. The bot will reply and add the track to your private playlist!</li>
              <li>To name your playlist, include a hashtag with your desired name: <code className="bg-gray-100 px-1">#MyAwesomePlaylist</code></li>
            </ol>
          </div>
          <div>
            <h3 className="font-bold mb-2">Option 2: Send Directly</h3>
            <div className="space-y-3">
              {!userPubkey ? (
                <button 
                  onClick={connectNostr} 
                  className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                >
                  Connect with Nostr
                </button>
              ) : (
                <>
                  <p className="text-sm text-gray-600">Connected as: <code className="bg-gray-100 px-1">{userPubkey.substring(0, 10)}...</code></p>
                  <div>
                    <input 
                      type="text" 
                      value={spotifyLink} 
                      onChange={(e) => setSpotifyLink(e.target.value)} 
                      placeholder="Paste Spotify track URL" 
                      className="w-full px-3 py-2 border rounded mb-2"
                    />
                    <input 
                      type="text" 
                      value={playlistName} 
                      onChange={(e) => setPlaylistName(e.target.value)} 
                      placeholder="Playlist name (optional)" 
                      className="w-full px-3 py-2 border rounded mb-2"
                    />
                    <button 
                      onClick={sendSpotifyTrack} 
                      disabled={loading} 
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
                    >
                      {loading ? 'Sending...' : 'Send Track'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="mb-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-3">📊 Stats</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <p className="text-sm text-gray-600">Total Playlists</p>
            <p className="text-2xl font-bold text-blue-600">{stats.total || 0}</p>
          </div>
          {/* More stats can be added here */}
        </div>
      </section>

      {/* Leaderboard */}
      <section className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-3">🎵 Playlists</h2>
        {leaderboard.length === 0 ? (
          <p className="text-gray-500">No playlists yet — be the first!</p>
        ) : (
          <div className="space-y-4">
            {leaderboard.map(({ pubkey, playlistUrl }) => (
              <div key={pubkey} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-center mb-2">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                    {pubkey.substring(0, 2)}
                  </div>
                  <div className="ml-3">
                    <p className="font-medium">{`Playlist by ${pubkey.substring(0, 8)}...`}</p>
                    <a 
                      href={playlistUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View on Spotify
                    </a>
                  </div>
                </div>
                <div className="mt-2">
                  <iframe 
                    src={`https://open.spotify.com/embed/playlist/${playlistUrl.split('playlist/')[1]}`} 
                    width="100%" 
                    height="80" 
                    frameBorder="0" 
                    allow="encrypted-media"
                  ></iframe>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
