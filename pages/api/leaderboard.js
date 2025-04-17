// pages/api/leaderboard.js
import fs from 'fs';

export default (req, res) => {
  const db = JSON.parse(fs.readFileSync('./db.json','utf-8'));
  const list = Object.entries(db.botSpotify.playlistMap).map(([pubkey, pid]) => ({
    pubkey, playlistUrl: `https://open.spotify.com/playlist/${pid}`
  }));
  res.json(list);
};
