// pages/api/auth/callback.js
import SpotifyWebApi from 'spotify-web-api-node';
import fs from 'fs';
import path from 'path';

export default async (req, res) => {
  try {
    const { code } = req.query;
    console.log("Processing auth callback");
    
    const spotify = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      redirectUri: process.env.SPOTIFY_REDIRECT_URI
    });
    
    const { body } = await spotify.authorizationCodeGrant(code);
    console.log("Got tokens from Spotify");
    
    // Direct file write - the simplest approach
    const dbPath = path.resolve(process.cwd(), 'db.json');
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    db.botSpotify.accessToken = body.access_token;
    db.botSpotify.refreshToken = body.refresh_token;
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    console.log("Tokens saved to db.json");
    
    res.send('✅ Spotify connected! You can close this window.');
  } catch (err) {
    console.error("AUTH ERROR:", err);
    res.status(500).send('❌ Error connecting to Spotify: ' + err.message);
  }
};
