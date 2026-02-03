import type { VideoDetails, ChannelDetails, SearchResult } from '../types/youtube.js';

/**
 * Format ISO 8601 duration to human readable
 * PT1H2M3S -> 1:02:03
 */
export function formatDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return isoDuration;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format large numbers with K, M, B suffixes
 */
export function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

/**
 * Format video details for display
 */
export function formatVideoDetails(video: VideoDetails): string {
  return `
**${video.title}**
Channel: ${video.channelTitle}
Duration: ${formatDuration(video.duration)}
Views: ${formatNumber(video.viewCount)} | Likes: ${formatNumber(video.likeCount)} | Comments: ${formatNumber(video.commentCount)}
Published: ${new Date(video.publishedAt).toLocaleDateString()}
URL: https://youtube.com/watch?v=${video.id}

**Description:**
${video.description.substring(0, 500)}${video.description.length > 500 ? '...' : ''}

${video.tags.length > 0 ? `**Tags:** ${video.tags.slice(0, 10).join(', ')}` : ''}
`.trim();
}

/**
 * Format channel details for display
 */
export function formatChannelDetails(channel: ChannelDetails): string {
  return `
**${channel.title}**${channel.customUrl ? ` (@${channel.customUrl})` : ''}
Subscribers: ${formatNumber(channel.subscriberCount)} | Videos: ${formatNumber(channel.videoCount)} | Total Views: ${formatNumber(channel.viewCount)}
${channel.country ? `Country: ${channel.country}` : ''}
Created: ${new Date(channel.publishedAt).toLocaleDateString()}
URL: https://youtube.com/channel/${channel.id}

**About:**
${channel.description.substring(0, 500)}${channel.description.length > 500 ? '...' : ''}
`.trim();
}

/**
 * Format search results for display
 */
export function formatSearchResults(results: SearchResult[]): string {
  return results
    .map((result, index) => {
      const typeIcon = result.type === 'video' ? '🎬' : result.type === 'channel' ? '📺' : '📋';
      const url =
        result.type === 'video'
          ? `https://youtube.com/watch?v=${result.id}`
          : result.type === 'channel'
            ? `https://youtube.com/channel/${result.id}`
            : `https://youtube.com/playlist?list=${result.id}`;

      return `${index + 1}. ${typeIcon} **${result.title}**
   ${result.channelTitle} • ${new Date(result.publishedAt).toLocaleDateString()}
   ${url}`;
    })
    .join('\n\n');
}

/**
 * Extract video ID from various YouTube URL formats
 */
export function extractVideoId(urlOrId: string): string {
  // If it's already just an ID (11 chars, alphanumeric with _ and -)
  if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) {
    return urlOrId;
  }

  // Try to extract from URL
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = urlOrId.match(pattern);
    if (match) {
      return match[1];
    }
  }

  // Return as-is if no pattern matches
  return urlOrId;
}

/**
 * Extract channel ID from various formats
 */
export function extractChannelId(urlOrId: string): string {
  // If it's already a channel ID (starts with UC)
  if (/^UC[a-zA-Z0-9_-]{22}$/.test(urlOrId)) {
    return urlOrId;
  }

  // Try to extract from URL
  const match = urlOrId.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]+)/);
  if (match) {
    return match[1];
  }

  return urlOrId;
}

/**
 * Extract playlist ID from various formats
 */
export function extractPlaylistId(urlOrId: string): string {
  // If it's already a playlist ID (starts with PL or similar)
  if (/^[A-Z]{2}[a-zA-Z0-9_-]+$/.test(urlOrId)) {
    return urlOrId;
  }

  // Try to extract from URL
  const match = urlOrId.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (match) {
    return match[1];
  }

  return urlOrId;
}
