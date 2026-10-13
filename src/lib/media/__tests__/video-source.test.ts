import { describe, it, expect } from 'vitest';
import { parseVideoSource, getVideoSourceBadge } from '../video-source';
import { contentSecurityPolicy } from '../../security/http-headers';

describe('parseVideoSource', () => {
  it('parses an Instagram Reel URL with query parameters', () => {
    const url = 'https://www.instagram.com/reel/DY2FMOZovfV/?utm_source=ig_web_button_share_sheet&stkn=MzRlODBiNWFlZA==';
    const result = parseVideoSource(url);
    expect(result.type).toBe('instagram');
    if (result.type === 'instagram') {
      expect(result.shortcode).toBe('DY2FMOZovfV');
      expect(result.embedUrl).toBe('https://www.instagram.com/reel/DY2FMOZovfV/embed/');
      expect(result.originalUrl).toBe(url);
    }
  });

  it('parses Instagram post and reels variants', () => {
    expect(parseVideoSource('https://instagram.com/p/DY2FMOZovfV/').type).toBe('instagram');
    expect(parseVideoSource('https://instagr.am/reel/DY2FMOZovfV').type).toBe('instagram');
    expect(parseVideoSource('https://www.instagram.com/reels/DY2FMOZovfV/').type).toBe('instagram');
    expect(parseVideoSource('https://www.instagram.com/tv/DY2FMOZovfV/').type).toBe('instagram');
  });

  it('parses YouTube Shorts and Videos', () => {
    const shorts = parseVideoSource('https://www.youtube.com/shorts/3lO77c0yRj8');
    expect(shorts.type).toBe('youtube');
    if (shorts.type === 'youtube') {
      expect(shorts.videoId).toBe('3lO77c0yRj8');
      expect(shorts.embedUrl).toContain('3lO77c0yRj8');
    }

    const watch = parseVideoSource('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(watch.type).toBe('youtube');
    if (watch.type === 'youtube') {
      expect(watch.videoId).toBe('dQw4w9WgXcQ');
    }

    const shortlink = parseVideoSource('https://youtu.be/dQw4w9WgXcQ');
    expect(shortlink.type).toBe('youtube');
  });

  it('parses direct MP4 video URLs', () => {
    const direct = parseVideoSource('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
    expect(direct.type).toBe('direct');
    if (direct.type === 'direct') {
      expect(direct.videoUrl).toBe('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
    }
  });

  it('handles empty and null values gracefully', () => {
    expect(parseVideoSource('')).toEqual({ type: 'none' });
    expect(parseVideoSource(null)).toEqual({ type: 'none' });
    expect(parseVideoSource(undefined)).toEqual({ type: 'none' });
    expect(parseVideoSource('   ')).toEqual({ type: 'none' });
  });
});

describe('getVideoSourceBadge', () => {
  it('returns Instagram metadata for instagram URLs', () => {
    const badge = getVideoSourceBadge('https://www.instagram.com/reel/DY2FMOZovfV/');
    expect(badge.type).toBe('instagram');
    expect(badge.label).toBe('Instagram Reel');
    expect(badge.isEmbed).toBe(true);
  });

  it('returns YouTube metadata for youtube URLs', () => {
    const badge = getVideoSourceBadge('https://www.youtube.com/shorts/3lO77c0yRj8');
    expect(badge.type).toBe('youtube');
    expect(badge.isEmbed).toBe(true);
  });

  it('returns Direct MP4 metadata for mp4 URLs', () => {
    const badge = getVideoSourceBadge('https://example.com/video.mp4');
    expect(badge.type).toBe('direct');
    expect(badge.isEmbed).toBe(false);
  });

  it('returns Poster only for empty URLs', () => {
    const badge = getVideoSourceBadge('');
    expect(badge.type).toBe('none');
    expect(badge.isEmbed).toBe(false);
  });
});

describe('Content Security Policy for Video Embeds & Media', () => {
  it('includes instagram and youtube in frame-src', () => {
    const csp = contentSecurityPolicy('test-nonce');
    expect(csp).toContain('frame-src');
    expect(csp).toContain('https://www.instagram.com');
    expect(csp).toContain('https://www.youtube.com');
  });

  it('includes media-src directive for video streams', () => {
    const csp = contentSecurityPolicy('test-nonce');
    expect(csp).toContain('media-src');
    expect(csp).toContain('https://commondatastorage.googleapis.com');
    expect(csp).toContain('https://firebasestorage.googleapis.com');
  });
});
