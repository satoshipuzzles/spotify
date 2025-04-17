// pages/api/auth/callback.js
import SpotifyWebApi from 'spotify-web-api-node';
import { saveSpotifyTokens } from '../../../lib/db';

export default async (req, res) => {
  const { code } = req.query;
  const spotify = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI
  });
  const { body } = await spotify.authorizationCodeGrant(code);
  saveSpotifyTokens(body.access_token, body.refresh_token);
  res.send('✅ Spotify connected! You can close this window.');
};
