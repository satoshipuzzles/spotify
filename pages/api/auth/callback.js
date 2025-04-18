// pages/api/auth/callback.js
import SpotifyWebApi from 'spotify-web-api-node';

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
    
    // Display tokens to the user (just for this debugging phase)
    res.send(`
      <h1>✅ Spotify connected!</h1>
      <p>Copy these tokens to your .env file:</p>
      <pre>
SPOTIFY_ACCESS_TOKEN=${body.access_token}
SPOTIFY_REFRESH_TOKEN=${body.refresh_token}
      </pre>
      <p>Then restart both your web server and bot.</p>
    `);
  } catch (err) {
    console.error("AUTH ERROR:", err);
    res.status(500).send('❌ Error connecting to Spotify: ' + err.message);
  }
};
