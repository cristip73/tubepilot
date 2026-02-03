import { config as dotenvConfig } from 'dotenv';

// Load .env file
dotenvConfig();

export interface Config {
  youtubeApiKey?: string;
  oauth: {
    clientId?: string;
    clientSecret?: string;
    redirectUri: string;
  };
  cacheTtl: number;
}

export function getConfig(): Config {
  return {
    youtubeApiKey: process.env.YOUTUBE_API_KEY,
    oauth: {
      clientId: process.env.YOUTUBE_CLIENT_ID,
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
      redirectUri: process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3000/oauth/callback',
    },
    cacheTtl: parseInt(process.env.CACHE_TTL || '300', 10),
  };
}

export function hasApiKey(): boolean {
  return !!process.env.YOUTUBE_API_KEY;
}

export function hasOAuthConfig(): boolean {
  return !!(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET);
}
