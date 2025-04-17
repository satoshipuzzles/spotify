// pages/index.js
import React, { useState, useEffect } from 'react';

const BOT_NAME   = process.env.NEXT_PUBLIC_BOT_NAME;
const BOT_AVATAR = process.env.NEXT_PUBLIC_BOT_AVATAR;
const BOT_NPUB   = process.env.NEXT_PUBLIC_BOT_PUBKEY;  // corrected

export default function Home() {
  const [stats, setStats]       = useState({ total: 0 });
  const [leaderboard, setBoard] = useState([]);

  useEffect(() => {
    fetch('/api/stats').then(r=>r.json()).then(d=>setStats(d));
    fetch('/api/leaderboard').then(r=>r.json()).then(d=>setBoard(d));
  }, []);

  return (
    <main style={{ maxWidth: 800, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      {/* Bot Info */}
      <section style={{ textAlign: 'center', marginBottom: '2rem' }}>
        {BOT_AVATAR && <img src={BOT_AVATAR} alt={BOT_NAME} width={80} height={80} style={{ borderRadius: '50%' }} />}
        <h1 style={{ fontSize: '2rem', margin: '0.5rem 0' }}>{BOT_NAME}</h1>
        <code>@{BOT_NPUB}</code>
      </section>

      {/* How it works */}
      <section style={{ marginBottom: '2rem' }}>
        <h2>How to Use</h2>
        <ol>
          <li>Connect the bot to Spotify: <a href="/api/auth">Click here</a> (one‑time setup).</li>
          <li>In your Nostr client, compose a note with <code>@{BOT_NPUB}</code> <strong>and</strong> a Spotify track URL.</li>
          <li>Publish the note. The bot will reply and add the track to your private playlist!</li>
        </ol>
        <p style={{ fontSize: '0.9rem', color: '#666' }}>
          Example:
          <br/>
          <code>@{BOT_NPUB} https://open.spotify.com/track/2TpxZ7JUBn3uw46aR7qd6V</code>
        </p>
      </section>

      {/* KPIs */}
      <section style={{ marginBottom: '2rem' }}>
        <h2>📊 Key Metrics</h2>
        <p>Total playlists created: <strong>{stats.total}</strong></p>
      </section>

      {/* Leaderboard */}
      <section>
        <h2>🏆 Playlist Leaderboard</h2>
        {leaderboard.length === 0
          ? <p>No playlists yet — be the first!</p>
          : <ul>
              {leaderboard.map(({ pubkey, playlistUrl }) => (
                <li key={pubkey} style={{ margin: '0.5rem 0' }}>
                  <code>@{pubkey}</code> → <a href={playlistUrl} target="_blank">{playlistUrl}</a>
                </li>
              ))}
            </ul>
        }
      </section>
    </main>
  );
}
