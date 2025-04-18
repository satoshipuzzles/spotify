// pages/api/auth/callback.js
import SpotifyWebApi from 'spotify-web-api-node';
import { saveSpotifyTokens } from '../../../lib/db';
import fs from 'fs';
import path from 'path';

export default async (req, res) => {
  try {
    const { code } = req.query;
    console.log("Auth callback received code:", code ? "VALID CODE" : "NO CODE");
    
    const spotify = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      redirectUri: process.env.SPOTIFY_REDIRECT_URI
    });
    
    console.log("Spotify API initialized with:", {
      clientId: process.env.SPOTIFY_CLIENT_ID ? "PRESENT" : "MISSING",
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET ? "PRESENT" : "MISSING",
      redirectUri: process.env.SPOTIFY_REDIRECT_URI
    });
    
    const { body } = await spotify.authorizationCodeGrant(code);
    console.log("Received tokens:", {
      accessToken: body.access_token ? "PRESENT" : "MISSING",
      refreshToken: body.refresh_token ? "PRESENT" : "MISSING"
    });
    
    // Try direct file save as a backup
    try {
      const db = JSON.parse(fs.readFileSync('./db.json', 'utf-8'));
      db.botSpotify.accessToken = body.access_token;
      db.botSpotify.refreshToken = body.refresh_token;
      fs.writeFileSync('./db.json', JSON.stringify(db, null, 2));
      console.log("Directly wrote tokens to db.json");
    } catch (fileErr) {
      console.error("Error directly writing to db.json:", fileErr);
    }
    
    console.log("About to save tokens using lib/db.js");
    saveSpotifyTokens(body.access_token, body.refresh_token);
    console.log("Tokens saved using lib/db.js (or attempted to save)");
    
    res.send('✅ Spotify connected! You can close this window.');
  } catch (err) {
    console.error("AUTH ERROR:", err);
    res.status(500).send('❌ Error connecting to Spotify: ' + err.message);
  }
};
