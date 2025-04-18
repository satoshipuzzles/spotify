// pages/api/leaderboard.js - Make sure it's reading from the correct location
import fs from 'fs';
import path from 'path';
import os from 'os';

export default (req, res) => {
  try {
    // First try reading from temp file (where bot saves data)
    const tmpPath = path.join(os.tmpdir(), 'spotify-bot-db.json');
    const srcPath = path.resolve(process.cwd(), 'db.json');
    
    const dbPath = fs.existsSync(tmpPath) ? tmpPath : srcPath;
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    
    const list = Object.entries(db.botSpotify.playlistMap).map(([pubkey, pid]) => ({
      pubkey,
      playlistUrl: `https://open.spotify.com/playlist/${pid}`
    }));
    
    res.json(list);
  } catch (error) {
    console.error('Error in leaderboard API:', error);
    res.status(500).json({ error: 'Failed to load playlists' });
  }
};
