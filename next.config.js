// next.config.mjs - Using .mjs extension for ES modules
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Import WebSocket polyfill only on the client side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        ws: false,
        // Add other polyfills if needed
        crypto: false,
        stream: false,
        buffer: false
      };
    }
    
    return config;
  },
  // Add these env vars to the client side
  publicRuntimeConfig: {
    NEXT_PUBLIC_BOT_NAME: process.env.NEXT_PUBLIC_BOT_NAME,
    NEXT_PUBLIC_BOT_AVATAR: process.env.NEXT_PUBLIC_BOT_AVATAR,
    NEXT_PUBLIC_BOT_PUBKEY: process.env.NEXT_PUBLIC_BOT_PUBKEY,
    NEXT_PUBLIC_BOT_ABOUT: process.env.NEXT_PUBLIC_BOT_ABOUT,
  },
  // Configure headers for CORS if needed
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },
};

export default nextConfig;
