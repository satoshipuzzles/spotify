// pages/api/leaderboard.js
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fetchUserProfile } from '../../lib/nostr';

export default async (req, res) => {
  try {
    // First try reading from temp file (where bot saves data)
    const tmpPath = path.join(os.tmpdir(), 'spotify-bot-db.json');
    const srcPath = path.resolve(process.cwd(), 'db.json');
    
    const dbPath = fs.existsSync(tmpPath) ? tmpPath : srcPath;
    console.log('Reading data from:', dbPath);
    
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    
    // Get relay list from environment variables or use defaults
    const relays = process.env.NOSTR_RELAYS ? 
      process.env.NOSTR_RELAYS.split(',') : 
      [
        'wss://relay.damus.io',
        'wss://nos.lol',
        'wss://relay.nostr.band'
      ];
    
    // Create base playlist data
    const playlistEntries = Object.entries(db.botSpotify.playlistMap).map(([pubkey, pid]) => ({
      pubkey,
      playlistUrl: `https://open.spotify.com/playlist/${pid}`,
      name: null,
      profilePic: null
    }));
    
    // If we're in a serverless environment, return basic data quickly
    // to avoid timeout issues
    if (process.env.VERCEL) {
      res.json(playlistEntries);
      return;
    }
    
    // For local development, fetch profile data
    // Use Promise.all with a timeout for each fetch
    const withProfiles = await Promise.all(
      playlistEntries.map(async (entry) => {
        try {
          // Wrap each profile fetch in a timeout
          const profilePromise = fetchUserProfile(entry.pubkey, relays);
          const profile = await Promise.race([
            profilePromise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
            )
          ]);
          
          return {
            ...entry,
            name: profile.name || `nostr:${entry.pubkey.slice(0, 8)}...`,
            profilePic: profile.picture
          };
        } catch (error) {
          console.warn(`Failed to fetch profile for ${entry.pubkey}:`, error.message);
          // Return entry with default values on error
          return entry;
        }
      })
    );
    
    res.json(withProfiles);
  } catch (error) {
    console.error('Error in leaderboard API:', error);
    res.status(500).json({ error: 'Failed to load playlists', details: error.message });
  }
};
