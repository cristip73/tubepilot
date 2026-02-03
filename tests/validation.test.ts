import { describe, it, expect } from 'vitest';
import {
  extractVideoId,
  extractPlaylistId,
  extractChannelId,
  cleanVideoUrl,
} from '../src/utils/validation';

describe('extractVideoId', () => {
  it('extracts ID from standard watch URL', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from short URL', () => {
    expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from embed URL', () => {
    expect(extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from shorts URL', () => {
    expect(extractVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from URL with playlist param (ignores playlist)', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLtest')).toBe(
      'dQw4w9WgXcQ'
    );
  });

  it('extracts ID from short URL with tracking params', () => {
    expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ?si=abc123')).toBe('dQw4w9WgXcQ');
  });

  it('accepts bare video ID', () => {
    expect(extractVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('throws on empty input', () => {
    expect(() => extractVideoId('')).toThrow('Video ID or URL is required');
  });

  it('throws on input too long', () => {
    const longInput = 'a'.repeat(3000);
    expect(() => extractVideoId(longInput)).toThrow('Input too long');
  });
});

describe('extractPlaylistId', () => {
  it('extracts ID from playlist URL', () => {
    expect(extractPlaylistId('https://www.youtube.com/playlist?list=PLtest123')).toBe('PLtest123');
  });

  it('extracts ID from watch URL with list param', () => {
    expect(extractPlaylistId('https://www.youtube.com/watch?v=abc&list=PLtest123')).toBe(
      'PLtest123'
    );
  });

  it('accepts bare playlist ID', () => {
    expect(extractPlaylistId('PLtest123abc')).toBe('PLtest123abc');
  });
});

describe('extractChannelId', () => {
  it('extracts ID from channel URL', () => {
    expect(extractChannelId('https://www.youtube.com/channel/UCtest123')).toBe('UCtest123');
  });

  it('extracts handle from @ URL', () => {
    expect(extractChannelId('https://www.youtube.com/@testchannel')).toBe('@testchannel');
  });

  it('accepts bare handle', () => {
    expect(extractChannelId('@testchannel')).toBe('@testchannel');
  });

  it('accepts bare channel ID', () => {
    expect(extractChannelId('UCtest123')).toBe('UCtest123');
  });
});

describe('cleanVideoUrl', () => {
  it('extracts video ID and timestamp', () => {
    const result = cleanVideoUrl('https://youtu.be/dQw4w9WgXcQ?t=120');
    expect(result.videoId).toBe('dQw4w9WgXcQ');
    expect(result.timestamp).toBe(120);
  });

  it('handles complex timestamp format', () => {
    const result = cleanVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1h2m30s');
    expect(result.videoId).toBe('dQw4w9WgXcQ');
    expect(result.timestamp).toBe(3750); // 1*3600 + 2*60 + 30
  });

  it('returns undefined timestamp when not present', () => {
    const result = cleanVideoUrl('https://youtu.be/dQw4w9WgXcQ');
    expect(result.videoId).toBe('dQw4w9WgXcQ');
    expect(result.timestamp).toBeUndefined();
  });
});
