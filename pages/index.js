// pages/index.js
export default function Home() {
  return (
    <main style={{ maxWidth: 600, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <h1>🎵 Nostr → Spotify Bot</h1>
      <p>
        1. First, <a href="/api/auth">connect your Spotify account</a>.<br/>
        2. Then mention me in any note with <code>@&lt;your‑bot‑npub&gt;</code> plus a Spotify track URL.<br/>
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
  const [n, setN] = React.useState('—');
  React.useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => setN(d.total));
  }, []);
  return n;
}
