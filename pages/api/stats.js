// pages/api/stats.js
import fs from 'fs';
import path from 'path';
import os from 'os';
import SpotifyWebApi from 'spotify-web-api-node';

export default async (req, res) => {
  try {
    // First try reading from temp file (where bot saves data)
    const tmpPath = path.join(os.tmpdir(), 'spotify-bot-db.json');
    const srcPath = path.resolve(process.cwd(), 'db.json');
    
    // Try both paths
    let dbPath;
    if (fs.existsSync(tmpPath)) {
      dbPath = tmpPath;
    } else if (fs.existsSync(srcPath)) {
      dbPath = srcPath;
    } else {
      // Use environment variables as fallback
      const playlistMap = process.env.PLAYLIST_MAP ? 
        JSON.parse(process.env.PLAYLIST_MAP) : {};
      
      return res.json({ 
        total: Object.keys(playlistMap).length,
        tracks: 0
      });
    }
    
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    const totalPlaylists = Object.keys(db.botSpotify.playlistMap).length;
    
    // Get track count if we have access token and playlists
    let trackCount = 0;
    if (db.botSpotify.accessToken && totalPlaylists > 0) {
      try {
        const spotify = new SpotifyWebApi();
        spotify.setAccessToken(db.botSpotify.accessToken);
        
        // Get first playlist to check track count
        const playlistId = Object.values(db.botSpotify.playlistMap)[0];
        const { body: playlist } = await spotify.getPlaylist(playlistId);
        trackCount = playlist.tracks.total;
      } catch (err) {
        console.error('Error getting track count:', err);
      }
    }
    
    res.json({ 
      total: totalPlaylists,
      tracks: trackCount
    });
  } catch (error) {
    console.error('Error in stats API:', error);
    res.status(500).json({ error: 'Failed to load stats' });
  }
};
