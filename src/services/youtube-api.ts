import { google, youtube_v3 } from 'googleapis';
import type {
  VideoDetails,
  ChannelDetails,
  PlaylistDetails,
  PlaylistItem,
  SearchResult,
  Comment,
  TrendingVideo,
} from '../types/youtube.js';

export class YouTubeAPIService {
  private youtube: youtube_v3.Youtube;

  constructor(apiKey: string) {
    this.youtube = google.youtube({
      version: 'v3',
      auth: apiKey,
    });
  }

  async searchVideos(
    query: string,
    options: {
      maxResults?: number;
      order?: 'date' | 'rating' | 'relevance' | 'title' | 'viewCount';
      type?: 'video' | 'channel' | 'playlist';
      videoDuration?: 'any' | 'short' | 'medium' | 'long';
      publishedAfter?: string;
      publishedBefore?: string;
      channelId?: string;
      regionCode?: string;
    } = {}
  ): Promise<SearchResult[]> {
    const response = await this.youtube.search.list({
      part: ['snippet'],
      q: query,
      maxResults: options.maxResults || 10,
      order: options.order || 'relevance',
      type: options.type ? [options.type] : ['video'],
      videoDuration: options.videoDuration,
      publishedAfter: options.publishedAfter,
      publishedBefore: options.publishedBefore,
      channelId: options.channelId,
      regionCode: options.regionCode || 'US',
    });

    return (response.data.items || []).map((item) => ({
      id: item.id?.videoId || item.id?.channelId || item.id?.playlistId || '',
      type: (item.id?.kind?.split('#')[1] || 'video') as 'video' | 'channel' | 'playlist',
      title: item.snippet?.title || '',
      description: item.snippet?.description || '',
      channelId: item.snippet?.channelId || '',
      channelTitle: item.snippet?.channelTitle || '',
      publishedAt: item.snippet?.publishedAt || '',
      thumbnails: {
        default: item.snippet?.thumbnails?.default?.url || undefined,
        medium: item.snippet?.thumbnails?.medium?.url || undefined,
        high: item.snippet?.thumbnails?.high?.url || undefined,
      },
    }));
  }

  async getVideoDetails(videoId: string): Promise<VideoDetails | null> {
    const response = await this.youtube.videos.list({
      part: ['snippet', 'contentDetails', 'statistics'],
      id: [videoId],
    });

    const video = response.data.items?.[0];
    if (!video) return null;

    return {
      id: video.id || '',
      title: video.snippet?.title || '',
      description: video.snippet?.description || '',
      channelId: video.snippet?.channelId || '',
      channelTitle: video.snippet?.channelTitle || '',
      publishedAt: video.snippet?.publishedAt || '',
      thumbnails: {
        default: video.snippet?.thumbnails?.default?.url || undefined,
        medium: video.snippet?.thumbnails?.medium?.url || undefined,
        high: video.snippet?.thumbnails?.high?.url || undefined,
        maxres: video.snippet?.thumbnails?.maxres?.url || undefined,
      },
      duration: video.contentDetails?.duration || '',
      viewCount: parseInt(video.statistics?.viewCount || '0', 10),
      likeCount: parseInt(video.statistics?.likeCount || '0', 10),
      commentCount: parseInt(video.statistics?.commentCount || '0', 10),
      tags: video.snippet?.tags || [],
      categoryId: video.snippet?.categoryId || '',
      defaultLanguage: video.snippet?.defaultLanguage || undefined,
      defaultAudioLanguage: video.snippet?.defaultAudioLanguage || undefined,
    };
  }

  async getMultipleVideoDetails(videoIds: string[]): Promise<VideoDetails[]> {
    const response = await this.youtube.videos.list({
      part: ['snippet', 'contentDetails', 'statistics'],
      id: videoIds,
    });

    return (response.data.items || []).map((video) => ({
      id: video.id || '',
      title: video.snippet?.title || '',
      description: video.snippet?.description || '',
      channelId: video.snippet?.channelId || '',
      channelTitle: video.snippet?.channelTitle || '',
      publishedAt: video.snippet?.publishedAt || '',
      thumbnails: {
        default: video.snippet?.thumbnails?.default?.url || undefined,
        medium: video.snippet?.thumbnails?.medium?.url || undefined,
        high: video.snippet?.thumbnails?.high?.url || undefined,
        maxres: video.snippet?.thumbnails?.maxres?.url || undefined,
      },
      duration: video.contentDetails?.duration || '',
      viewCount: parseInt(video.statistics?.viewCount || '0', 10),
      likeCount: parseInt(video.statistics?.likeCount || '0', 10),
      commentCount: parseInt(video.statistics?.commentCount || '0', 10),
      tags: video.snippet?.tags || [],
      categoryId: video.snippet?.categoryId || '',
      defaultLanguage: video.snippet?.defaultLanguage || undefined,
      defaultAudioLanguage: video.snippet?.defaultAudioLanguage || undefined,
    }));
  }

  async getChannelDetails(channelId: string): Promise<ChannelDetails | null> {
    const response = await this.youtube.channels.list({
      part: ['snippet', 'statistics', 'brandingSettings'],
      id: [channelId],
    });

    const channel = response.data.items?.[0];
    if (!channel) return null;

    return {
      id: channel.id || '',
      title: channel.snippet?.title || '',
      description: channel.snippet?.description || '',
      customUrl: channel.snippet?.customUrl || undefined,
      publishedAt: channel.snippet?.publishedAt || '',
      thumbnails: {
        default: channel.snippet?.thumbnails?.default?.url || undefined,
        medium: channel.snippet?.thumbnails?.medium?.url || undefined,
        high: channel.snippet?.thumbnails?.high?.url || undefined,
      },
      subscriberCount: parseInt(channel.statistics?.subscriberCount || '0', 10),
      videoCount: parseInt(channel.statistics?.videoCount || '0', 10),
      viewCount: parseInt(channel.statistics?.viewCount || '0', 10),
      country: channel.snippet?.country || undefined,
    };
  }

  async getChannelByUsername(username: string): Promise<ChannelDetails | null> {
    // Search for channel by handle/username
    const handle = username.startsWith('@') ? username.slice(1) : username;

    const searchResponse = await this.youtube.search.list({
      part: ['snippet'],
      q: handle,
      type: ['channel'],
      maxResults: 5,
    });

    // Get the first channel result
    const matchingChannel = searchResponse.data.items?.[0];
    if (!matchingChannel?.id?.channelId) return null;

    // Get full channel details
    return this.getChannelDetails(matchingChannel.id.channelId);
  }

  async getChannelVideos(
    channelId: string,
    options: {
      maxResults?: number;
      order?: 'date' | 'rating' | 'relevance' | 'title' | 'viewCount';
    } = {}
  ): Promise<SearchResult[]> {
    return this.searchVideos('', {
      channelId,
      maxResults: options.maxResults || 20,
      order: options.order || 'date',
      type: 'video',
    });
  }

  async getPlaylistDetails(playlistId: string): Promise<PlaylistDetails | null> {
    const response = await this.youtube.playlists.list({
      part: ['snippet', 'contentDetails'],
      id: [playlistId],
    });

    const playlist = response.data.items?.[0];
    if (!playlist) return null;

    return {
      id: playlist.id || '',
      title: playlist.snippet?.title || '',
      description: playlist.snippet?.description || '',
      channelId: playlist.snippet?.channelId || '',
      channelTitle: playlist.snippet?.channelTitle || '',
      publishedAt: playlist.snippet?.publishedAt || '',
      itemCount: playlist.contentDetails?.itemCount || 0,
      thumbnails: {
        default: playlist.snippet?.thumbnails?.default?.url || undefined,
        medium: playlist.snippet?.thumbnails?.medium?.url || undefined,
        high: playlist.snippet?.thumbnails?.high?.url || undefined,
      },
    };
  }

  async getPlaylistItems(
    playlistId: string,
    maxResults: number = 50
  ): Promise<PlaylistItem[]> {
    const response = await this.youtube.playlistItems.list({
      part: ['snippet', 'contentDetails'],
      playlistId,
      maxResults,
    });

    return (response.data.items || []).map((item) => ({
      id: item.id || '',
      videoId: item.contentDetails?.videoId || '',
      title: item.snippet?.title || '',
      description: item.snippet?.description || '',
      position: item.snippet?.position || 0,
      publishedAt: item.snippet?.publishedAt || '',
      thumbnails: {
        default: item.snippet?.thumbnails?.default?.url || undefined,
        medium: item.snippet?.thumbnails?.medium?.url || undefined,
        high: item.snippet?.thumbnails?.high?.url || undefined,
      },
    }));
  }

  async getVideoComments(
    videoId: string,
    options: {
      maxResults?: number;
      order?: 'time' | 'relevance';
    } = {}
  ): Promise<Comment[]> {
    const response = await this.youtube.commentThreads.list({
      part: ['snippet'],
      videoId,
      maxResults: options.maxResults || 20,
      order: options.order || 'relevance',
    });

    return (response.data.items || []).map((item) => {
      const comment = item.snippet?.topLevelComment?.snippet;
      return {
        id: item.id || '',
        authorDisplayName: comment?.authorDisplayName || '',
        authorProfileImageUrl: comment?.authorProfileImageUrl || '',
        authorChannelId: comment?.authorChannelId?.value || '',
        textDisplay: comment?.textDisplay || '',
        textOriginal: comment?.textOriginal || '',
        likeCount: comment?.likeCount || 0,
        publishedAt: comment?.publishedAt || '',
        updatedAt: comment?.updatedAt || '',
        replyCount: item.snippet?.totalReplyCount || 0,
      };
    });
  }

  async getTrendingVideos(
    regionCode: string = 'US',
    categoryId?: string,
    maxResults: number = 20
  ): Promise<TrendingVideo[]> {
    const response = await this.youtube.videos.list({
      part: ['snippet', 'statistics'],
      chart: 'mostPopular',
      regionCode,
      videoCategoryId: categoryId,
      maxResults,
    });

    return (response.data.items || []).map((video) => ({
      id: video.id || '',
      title: video.snippet?.title || '',
      description: video.snippet?.description || '',
      channelId: video.snippet?.channelId || '',
      channelTitle: video.snippet?.channelTitle || '',
      publishedAt: video.snippet?.publishedAt || '',
      thumbnails: {
        default: video.snippet?.thumbnails?.default?.url || undefined,
        medium: video.snippet?.thumbnails?.medium?.url || undefined,
        high: video.snippet?.thumbnails?.high?.url || undefined,
      },
      viewCount: parseInt(video.statistics?.viewCount || '0', 10),
      likeCount: parseInt(video.statistics?.likeCount || '0', 10),
      commentCount: parseInt(video.statistics?.commentCount || '0', 10),
    }));
  }

  async getRelatedVideos(videoId: string, maxResults: number = 10): Promise<SearchResult[]> {
    // Note: Related videos API is deprecated, using search as fallback
    const videoDetails = await this.getVideoDetails(videoId);
    if (!videoDetails) return [];

    // Search using video title keywords
    const keywords = videoDetails.title.split(' ').slice(0, 3).join(' ');
    return this.searchVideos(keywords, {
      maxResults,
      type: 'video',
    });
  }

  async getVideoCategories(regionCode: string = 'US'): Promise<{ id: string; title: string }[]> {
    const response = await this.youtube.videoCategories.list({
      part: ['snippet'],
      regionCode,
    });

    return (response.data.items || []).map((category) => ({
      id: category.id || '',
      title: category.snippet?.title || '',
    }));
  }
}
