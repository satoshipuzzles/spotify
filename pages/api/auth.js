// pages/api/auth.js
import SpotifyWebApi from 'spotify-web-api-node';

export default (req, res) => {
  const spotify = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI
  });
  const scopes = ['playlist-modify-private','playlist-modify-public'];
  const url = spotify.createAuthorizeURL(scopes, 'nostr-bot-state');
  res.redirect(url);
};
