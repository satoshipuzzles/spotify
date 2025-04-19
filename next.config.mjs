// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Make sure Vercel has access to environment variables
  env: {
    NEXT_PUBLIC_BOT_NAME: process.env.NEXT_PUBLIC_BOT_NAME,
    NEXT_PUBLIC_BOT_AVATAR: process.env.NEXT_PUBLIC_BOT_AVATAR,
    NEXT_PUBLIC_BOT_PUBKEY: process.env.NEXT_PUBLIC_BOT_PUBKEY,
    NEXT_PUBLIC_BOT_ABOUT: process.env.NEXT_PUBLIC_BOT_ABOUT
  }
};

export default nextConfig;
