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
    
    const dbPath = fs.existsSync(tmpPath) ? tmpPath : srcPath;
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    
    const totalPlaylists = Object.keys(db.botSpotify.playlistMap).length;
    
    // Default response with just playlist count
    let response = { 
      total: totalPlaylists,
      tracks: '—' 
    };
    
    // For local development or if we have tokens, try to get track counts
    if (!process.env.VERCEL && db.botSpotify.accessToken) {
      try {
        const spotify = new SpotifyWebApi();
        spotify.setAccessToken(db.botSpotify.accessToken);
        
        // Get track counts from first 5 playlists (to avoid rate limits)
        const playlistIds = Object.values(db.botSpotify.playlistMap).slice(0, 5);
        
        let totalTracks = 0;
        
        // Get the track count for each playlist
        const countPromises = playlistIds.map(async (playlistId) => {
          try {
            const { body: playlist } = await spotify.getPlaylist(playlistId);
            return playlist.tracks.total;
          } catch (err) {
            console.error(`Error fetching playlist ${playlistId}:`, err);
            return 0;
          }
        });
        
        const trackCounts = await Promise.all(countPromises);
        totalTracks = trackCounts.reduce((sum, count) => sum + count, 0);
        
        // If we only checked some playlists, estimate the total
        if (playlistIds.length < totalPlaylists && playlistIds.length > 0) {
          const avgTracksPerPlaylist = totalTracks / playlistIds.length;
          totalTracks = Math.round(avgTracksPerPlaylist * totalPlaylists);
        }
        
        response.tracks = totalTracks;
      } catch (spotifyError) {
        console.error('Error fetching track counts:', spotifyError);
        // Keep the default '—' for tracks count
      }
    }
    
    res.json(response);
  } catch (error) {
    console.error('Error in stats API:', error);
    res.status(500).json({ error: 'Failed to load stats' });
  }
};
