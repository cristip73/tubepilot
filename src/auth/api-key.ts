// Re-export from config for centralized auth checking
export { hasApiKey } from '../config.js';

import { getConfig } from '../config.js';

export function getApiKey(): string | null {
  const config = getConfig();
  return config.youtubeApiKey || null;
}

export function getApiKeyInstructions(): string {
  return `This feature requires a YouTube API key.

To enable search, video details, and other features:

1. Get a free API key at https://console.cloud.google.com
   - Create a project → Enable "YouTube Data API v3" → Create credentials → API Key

2. Add it to your Claude Desktop config (claude_desktop_config.json):

{
  "mcpServers": {
    "tubepilot": {
      "command": "npx",
      "args": ["-y", "tubepilot"],
      "env": {
        "YOUTUBE_API_KEY": "your_api_key_here"
      }
    }
  }
}

3. Restart Claude Desktop`;
}
