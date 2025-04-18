// pages/api/stats.js
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
    
    const totalPlaylists = Object.keys(db.botSpotify.playlistMap).length;
    
    res.json({ 
      total: totalPlaylists,
      tracks: '—' // This would need to be calculated if you're tracking track counts
    });
  } catch (error) {
    console.error('Error in stats API:', error);
    res.status(500).json({ error: 'Failed to load stats' });
  }
};
