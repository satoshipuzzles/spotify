import React, { useState, useEffect } from 'react';

export default function Home() {
  return (
    <main style={{ maxWidth: 600, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <h1>🎵 Nostr → Spotify Bot</h1>
      <p>
        1. First, <a href="/api/auth">connect your Spotify account</a>.<br/>
        2. Then mention me in any note with <code>@{process.env.NEXT_PUBLIC_BOT_PUBKEY}</code> plus a Spotify track URL.<br/>
        3. I’ll add it to <strong>your</strong> private playlist.
      </p>
      <section style={{ marginTop: '2rem' }}>
        <h2>📊 KPIs</h2>
        <ul>
          <li>Total playlists created: <Stats /></li>
        </ul>
      </section>
    </main>
  );
}

function Stats() {
  const [n, setN] = useState('—');

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setN(data.total))
      .catch(() => setN('0'));
  }, []);

  return n;
}
