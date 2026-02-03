import { config as dotenvConfig } from 'dotenv';

// Load .env file
dotenvConfig();

export interface Config {
  youtubeApiKey: string;
  oauth: {
    clientId?: string;
    clientSecret?: string;
    redirectUri: string;
  };
  cacheTtl: number;
}

export function getConfig(): Config {
  const youtubeApiKey = process.env.YOUTUBE_API_KEY;

  if (!youtubeApiKey) {
    throw new Error(
      'YOUTUBE_API_KEY is required. Get one at https://console.cloud.google.com/apis/credentials'
    );
  }

  return {
    youtubeApiKey,
    oauth: {
      clientId: process.env.YOUTUBE_CLIENT_ID,
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
      redirectUri: process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3000/oauth/callback',
    },
    cacheTtl: parseInt(process.env.CACHE_TTL || '300', 10),
  };
}

export function hasOAuthConfig(): boolean {
  return !!(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET);
}
