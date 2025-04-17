// pages/api/stats.js
import fs from 'fs';
export default (req, res) => {
  const db = JSON.parse(fs.readFileSync('./db.json', 'utf-8'));
  res.json({ total: Object.keys(db.botSpotify.playlistMap).length });
};
