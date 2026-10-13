/**
 * Video source parsing and formatting utilities for Brand Reels.
 * Supports Instagram Reels, YouTube Shorts/Videos, and direct MP4/WebM video streams.
 */

export type VideoSource =
  | {
      type: 'instagram';
      shortcode: string;
      embedUrl: string;
      originalUrl: string;
    }
  | {
      type: 'youtube';
      videoId: string;
      embedUrl: string;
      originalUrl: string;
    }
  | {
      type: 'direct';
      videoUrl: string;
    }
  | {
      type: 'none';
    };

/**
 * Detects the video platform and extracts embed parameters from a video URL.
 */
export function parseVideoSource(url?: string | null): VideoSource {
  if (!url) return { type: 'none' };
  const cleanUrl = url.trim();
  if (!cleanUrl) return { type: 'none' };

  // Instagram Reels, Posts, and IGTV
  // Example: https://www.instagram.com/reel/DY2FMOZovfV/?utm_source=...
  const igMatch = cleanUrl.match(
    /(?:instagram\.com|instagr\.am)\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i
  );
  if (igMatch && igMatch[1]) {
    const shortcode = igMatch[1];
    return {
      type: 'instagram',
      shortcode,
      embedUrl: `https://www.instagram.com/reel/${shortcode}/embed/`,
      originalUrl: cleanUrl,
    };
  }

  // YouTube Shorts, Videos, and Shortlinks
  // Examples: https://www.youtube.com/shorts/3lO77c0yRj8, https://youtu.be/dQw4w9WgXcQ
  const ytMatch = cleanUrl.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i
  );
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      type: 'youtube',
      videoId,
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&loop=1&playlist=${videoId}&playsinline=1`,
      originalUrl: cleanUrl,
    };
  }

  // Direct video stream URL (e.g. .mp4, .webm, storage bucket URL)
  return {
    type: 'direct',
    videoUrl: cleanUrl,
  };
}

export interface VideoSourceBadge {
  type: VideoSource['type'];
  label: string;
  icon: string;
  badgeClass: string;
  hint: string;
  isEmbed: boolean;
}

/**
 * Returns badge styling and descriptive metadata for admin/UI presentation.
 */
export function getVideoSourceBadge(url?: string | null): VideoSourceBadge {
  const source = parseVideoSource(url);

  switch (source.type) {
    case 'instagram':
      return {
        type: 'instagram',
        label: 'Instagram Reel',
        icon: '📸',
        badgeClass: 'bg-pink-50 text-pink-700 border-pink-200',
        hint: `Shortcode: ${source.shortcode}`,
        isEmbed: true,
      };
    case 'youtube':
      return {
        type: 'youtube',
        label: 'YouTube Video',
        icon: '▶️',
        badgeClass: 'bg-red-50 text-red-700 border-red-200',
        hint: `ID: ${source.videoId}`,
        isEmbed: true,
      };
    case 'direct':
      return {
        type: 'direct',
        label: 'Direct MP4 Stream',
        icon: '🎥',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        hint: 'HTML5 Video Stream',
        isEmbed: false,
      };
    case 'none':
    default:
      return {
        type: 'none',
        label: 'Poster Image Only',
        icon: '🖼️',
        badgeClass: 'bg-gray-50 text-gray-600 border-gray-200',
        hint: 'No video attached',
        isEmbed: false,
      };
  }
}
