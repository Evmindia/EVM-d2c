'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { parseVideoSource } from '@/lib/media/video-source';

interface ProductTag {
  name: string;
  image: string;
  price: number;
  mrp: number;
  discount: string;
  href: string;
}

interface ReelItem {
  id: string;
  title: string;
  handle: string;
  views: string;
  likes: number;
  shares: number;
  poster: string;
  videoUrl?: string;
  product: ProductTag;
}

const BRAND_REELS: ReelItem[] = [
  {
    id: 'reel-powerbank-1',
    title: 'Snap. Charge. Go. The ultimate MagSafe carry ⚡',
    handle: '@evmzone • Daily Carry',
    views: '38.4K',
    likes: 1420,
    shares: 312,
    poster: '/cat-powerbank.jpg',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    product: {
      name: 'Encase 10,000mAh MagSafe Power Bank',
      image: '/cat-powerbank.jpg',
      price: 1499,
      mrp: 2999,
      discount: '50% OFF',
      href: '/products',
    },
  },
  {
    id: 'reel-headphone-1',
    title: 'Deep bass, zero distraction. 50H battery beast 🎧',
    handle: '@evmzone • Audio Lab',
    views: '52.1K',
    likes: 2890,
    shares: 540,
    poster: '/cat-headphone.jpg',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    product: {
      name: 'Wave Wireless ANC Over-Ear Headphones',
      image: '/cat-headphone.jpg',
      price: 2499,
      mrp: 4999,
      discount: '50% OFF',
      href: '/products',
    },
  },
  {
    id: 'reel-earphone-1',
    title: 'Pocket-sized audio bliss for daily city commutes 🎶',
    handle: '@evmzone • Commute Sound',
    views: '27.8K',
    likes: 980,
    shares: 165,
    poster: '/cat-earphone.jpg',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    product: {
      name: 'AirRhythm True Wireless Earphones',
      image: '/cat-earphone.jpg',
      price: 999,
      mrp: 1999,
      discount: '50% OFF',
      href: '/products',
    },
  },
  {
    id: 'reel-charger-1',
    title: 'One brick to charge MacBook, phone & buds at once 🔌',
    handle: '@evmzone • Travel Tech',
    views: '61.3K',
    likes: 3450,
    shares: 620,
    poster: '/moment-work.jpg',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
    product: {
      name: 'ChargeFast 65W Dual Type-C GaN Charger',
      image: '/moment-work.jpg',
      price: 1799,
      mrp: 3499,
      discount: '49% OFF',
      href: '/products',
    },
  },
  {
    id: 'reel-slim-1',
    title: 'Super thin, featherlight. Fits in any jeans pocket 🔋',
    handle: '@evmzone • Lifestyle',
    views: '19.6K',
    likes: 750,
    shares: 124,
    poster: '/moment-everyday.jpg',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    product: {
      name: 'MagPack Ultra-Slim 5,000mAh Battery',
      image: '/moment-everyday.jpg',
      price: 1199,
      mrp: 2299,
      discount: '48% OFF',
      href: '/products',
    },
  },
  {
    id: 'reel-commute-1',
    title: 'Block the train noise, feel every beat. Pure freedom 🚆',
    handle: '@evmzone • City Life',
    views: '44.9K',
    likes: 1830,
    shares: 290,
    poster: '/moment-commute.jpg',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    product: {
      name: 'Commute Pro Wireless Headset',
      image: '/moment-commute.jpg',
      price: 2199,
      mrp: 3999,
      discount: '45% OFF',
      href: '/products',
    },
  },
];

export function BrandReels() {
  const [reels, setReels] = useState<ReelItem[]>(BRAND_REELS);
  const [activeReelIndex, setActiveReelIndex] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [likedReels, setLikedReels] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    BRAND_REELS.forEach((r) => {
      counts[r.id] = r.likes;
    });
    return counts;
  });
  const [shareToast, setShareToast] = useState(false);

  const carouselRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fetch active reels from backend API
  useEffect(() => {
    fetch('/api/reels')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.data?.reels) && data.data.reels.length > 0) {
          setReels(data.data.reels);
          setLikeCounts((prev) => {
            const counts = { ...prev };
            data.data.reels.forEach((r: ReelItem) => {
              if (counts[r.id] === undefined) {
                counts[r.id] = r.likes;
              }
            });
            return counts;
          });
        }
      })
      .catch(() => {
        // Fallback to initial preset reels gracefully
      });
  }, []);

  // Scroll left/right in carousel
  const handleScroll = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const scrollAmount = direction === 'left' ? -270 : 270;
    carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  // Open modal for a specific reel
  const openReelModal = (index: number) => {
    setActiveReelIndex(index);
    setIsPlaying(true);
  };

  const closeReelModal = () => {
    setActiveReelIndex(null);
  };

  const nextReel = useCallback(() => {
    if (activeReelIndex === null) return;
    setActiveReelIndex((prev) => ((prev ?? 0) + 1) % reels.length);
    setIsPlaying(true);
  }, [activeReelIndex, reels.length]);

  const prevReel = useCallback(() => {
    if (activeReelIndex === null) return;
    setActiveReelIndex((prev) =>
      (prev ?? 0) === 0 ? reels.length - 1 : (prev ?? 0) - 1
    );
    setIsPlaying(true);
  }, [activeReelIndex, reels.length]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (activeReelIndex !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activeReelIndex]);

  // Keyboard navigation inside modal
  useEffect(() => {
    if (activeReelIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeReelModal();
      if (e.key === 'ArrowRight') nextReel();
      if (e.key === 'ArrowLeft') prevReel();
      if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeReelIndex, nextReel, prevReel]);

  // Sync video play/pause with state
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.play().catch(() => {
        // Autoplay policies may reject unmuted play
      });
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying, activeReelIndex]);

  const toggleLike = (reelId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLikedReels((prev) => {
      const isCurrentlyLiked = !!prev[reelId];
      const nextState = !isCurrentlyLiked;
      setLikeCounts((c) => ({
        ...c,
        [reelId]: (c[reelId] ?? 0) + (nextState ? 1 : -1),
      }));
      return { ...prev, [reelId]: nextState };
    });
  };

  const handleShare = async (reel: ReelItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      try {
        await navigator.share({
          title: reel.title,
          text: `Check out ${reel.product.name} on EVM`,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2500);
    }
  };

  const activeReel = activeReelIndex !== null ? reels[activeReelIndex] : null;
  const mediaSource = activeReel ? parseVideoSource(activeReel.videoUrl) : { type: 'none' as const };

  return (
    <section
      aria-label="Brand Community Reels"
      className="bg-[#f4f1ec] py-10 sm:py-14 text-neutral-900 overflow-hidden"
    >
      <div className="mx-auto max-w-[1600px] px-6 sm:px-10">
        {/* Editorial Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#b3a291] mb-1.5">
              Community &amp; Creators
            </p>
            <h2
              className="text-3xl font-light tracking-tight text-neutral-900 sm:text-4xl lg:text-[40px]"
              style={{ fontFamily: 'Didot, Bodoni MT, "Times New Roman", serif' }}
            >
              Watch EVM in action
            </h2>
          </div>

          {/* Carousel Arrow Controls */}
          <div className="hidden sm:flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleScroll('left')}
              aria-label="Previous reels"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 bg-white/80 text-neutral-800 transition hover:bg-neutral-900 hover:text-white hover:border-neutral-900 shadow-sm"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => handleScroll('right')}
              aria-label="Next reels"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 bg-white/80 text-neutral-800 transition hover:bg-neutral-900 hover:text-white hover:border-neutral-900 shadow-sm"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Reels Horizontal Carousel (Scrollbar hidden across all browsers) */}
        <div
          ref={carouselRef}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          className="flex gap-4 sm:gap-5 overflow-x-auto pb-2 pt-1 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory scroll-smooth -mx-6 px-6 sm:-mx-10 sm:px-10"
        >
          {reels.map((reel, index) => {
            const isLiked = !!likedReels[reel.id];

            return (
              <div
                key={reel.id}
                className="group relative flex flex-col w-[210px] sm:w-[235px] shrink-0 snap-start overflow-hidden rounded-2xl border border-neutral-300/80 bg-white shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                {/* 9:13 Compact Video Thumbnail Container */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => openReelModal(index)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openReelModal(index);
                    }
                  }}
                  aria-label={`Play reel: ${reel.title}`}
                  className="relative aspect-[9/13] w-full cursor-pointer overflow-hidden bg-neutral-950 select-none"
                >
                  <Image
                    src={reel.poster}
                    alt={reel.title}
                    fill
                    sizes="(max-width: 640px) 210px, 235px"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />

                  {/* Gradient overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />

                  {/* Play Button Indicator on Hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/30 backdrop-blur-md border border-white/40 text-white shadow-lg transform transition-transform group-hover:scale-110">
                      <svg className="h-5 w-5 fill-current translate-x-0.5" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>

                  {/* Top Reel Tag */}
                  <div className="absolute top-2.5 left-2.5 z-10">
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/50 backdrop-blur-md px-2 py-0.5 text-[9.5px] font-medium tracking-wide text-white/90 border border-white/10">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                      EVM Reel
                    </span>
                  </div>

                  {/* Bottom Preview Overlay Info */}
                  <div className="absolute inset-x-0 bottom-0 p-3 z-10 flex items-end justify-between gap-2">
                    {/* View Count Badge */}
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-white/95 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10">
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      {reel.views}
                    </span>

                    {/* Quick Like & Share Icons */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => toggleLike(reel.id, e)}
                        aria-label="Like reel"
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white/90 hover:text-white transition hover:scale-110 border border-white/10"
                      >
                        <svg
                          className={`h-3.5 w-3.5 ${isLiked ? 'fill-red-500 text-red-500' : 'fill-transparent'}`}
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleShare(reel, e)}
                        aria-label="Share reel"
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white/90 hover:text-white transition hover:scale-110 border border-white/10"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="m22 2-7 20-4-9-9-4Z" />
                          <path d="M22 2 11 13" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Attached Shoppable Product Card (SuperYou Style - Compact) */}
                <div className="flex flex-col justify-between p-3 bg-white border-t border-neutral-200/80">
                  <div className="flex items-start gap-2">
                    {/* Small Product Thumbnail */}
                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-neutral-100 border border-neutral-200">
                      <Image
                        src={reel.product.image}
                        alt={reel.product.name}
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    </div>

                    {/* Title and Pricing */}
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-[11px] font-semibold text-neutral-900 leading-tight">
                        {reel.product.name}
                      </h4>
                      <div className="mt-0.5 flex items-baseline gap-1">
                        <span className="text-[11px] font-bold text-neutral-950">
                          ₹{reel.product.price.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[9.5px] text-neutral-400 line-through">
                          ₹{reel.product.mrp.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[8.5px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded">
                          {reel.product.discount}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Buy Now Button */}
                  <Link
                    href={reel.product.href}
                    className="mt-2.5 inline-flex w-full items-center justify-center rounded-lg bg-neutral-900 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-white transition hover:bg-neutral-800 active:scale-[0.99]"
                  >
                    Buy Now
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============ INTERACTIVE REELS POPUP MODAL ============ */}
      {activeReel && activeReelIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activeReel.title}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-6"
          onClick={closeReelModal}
        >
          {/* Main Modal Container (9:16 Vertical Phone Aspect Ratio) */}
          <div
            className="relative w-full max-w-[380px] sm:max-w-[420px] aspect-[9/16] max-h-[92vh] rounded-3xl overflow-hidden bg-neutral-950 border border-white/15 shadow-2xl flex flex-col justify-between select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Background Video / Poster / Embed */}
            <div
              className={`absolute inset-0 z-0 bg-neutral-950 ${mediaSource.type === 'direct' ? 'cursor-pointer' : ''}`}
              onClick={() => {
                if (mediaSource.type === 'direct') {
                  setIsPlaying((p) => !p);
                }
              }}
            >
              {mediaSource.type === 'instagram' ? (
                <div className="relative h-full w-full bg-black overflow-hidden flex items-center justify-center">
                  <iframe
                    key={activeReel.id}
                    src={mediaSource.embedUrl}
                    title={activeReel.title}
                    className="h-full w-full border-0"
                    allowFullScreen
                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                    loading="eager"
                  />
                </div>
              ) : mediaSource.type === 'youtube' ? (
                <div className="relative h-full w-full bg-black overflow-hidden flex items-center justify-center">
                  <iframe
                    key={activeReel.id}
                    src={mediaSource.embedUrl}
                    title={activeReel.title}
                    className="h-full w-full border-0"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    loading="eager"
                  />
                </div>
              ) : mediaSource.type === 'direct' ? (
                <video
                  ref={videoRef}
                  src={mediaSource.videoUrl}
                  poster={activeReel.poster}
                  loop
                  muted={isMuted}
                  autoPlay
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                <Image
                  src={activeReel.poster}
                  alt={activeReel.title}
                  fill
                  priority
                  sizes="(max-width: 640px) 100vw, 420px"
                  className="object-cover"
                />
              )}

              {/* Pause Icon Overlay (Direct video only) */}
              {mediaSource.type === 'direct' && !isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] pointer-events-none">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60 text-white border border-white/30">
                    <svg className="h-8 w-8 fill-current translate-x-0.5" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              )}

              {/* Gradient Overlays for UI readability (only on direct video / poster to preserve embed visibility) */}
              {mediaSource.type !== 'instagram' && mediaSource.type !== 'youtube' && (
                <>
                  <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/80 via-black/30 to-transparent pointer-events-none" />
                  <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none" />
                </>
              )}
            </div>

            {/* Top Controls Bar */}
            <div className="relative z-20 flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-semibold text-white/90 drop-shadow-md">
                  EVM Shorts
                </span>
                {mediaSource.type === 'instagram' && (
                  <a
                    href={mediaSource.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 px-2.5 py-1 text-[10px] font-semibold text-white shadow-md transition hover:opacity-95 active:scale-95"
                    title="Watch on Instagram"
                  >
                    <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                    <span>Instagram Reel ↗</span>
                  </a>
                )}
                {mediaSource.type === 'youtube' && (
                  <a
                    href={mediaSource.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-semibold text-white shadow-md transition hover:bg-red-700 active:scale-95"
                    title="Watch on YouTube"
                  >
                    <span>YouTube ↗</span>
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Mute/Unmute Toggle (Direct video only) */}
                {mediaSource.type === 'direct' && (
                  <button
                    type="button"
                    onClick={() => setIsMuted((m) => !m)}
                    aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 backdrop-blur-md text-white/90 hover:text-white border border-white/15 transition"
                  >
                    {isMuted ? (
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M11 5 6 9H2v6h4l5 4V5Z" />
                        <line x1="22" x2="16" y1="9" y2="15" />
                        <line x1="16" x2="22" y1="9" y2="15" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M11 5 6 9H2v6h4l5 4V5Z" />
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                      </svg>
                    )}
                  </button>
                )}

                {/* Close Button */}
                <button
                  type="button"
                  onClick={closeReelModal}
                  aria-label="Close reels player"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 backdrop-blur-md text-white hover:text-white border border-white/15 transition hover:scale-105"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Middle Section: Floating Side Actions Bar (SuperYou Style) */}
            <div className="relative z-20 flex flex-1 items-end justify-end p-4 pb-2 pointer-events-none">
              <div className="flex flex-col items-center gap-4 text-white pointer-events-auto">
                {/* Views Counter */}
                <div className="flex flex-col items-center gap-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/90">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-semibold text-white/80">{activeReel.views}</span>
                </div>

                {/* Interactive Like Button */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleLike(activeReel.id)}
                    aria-label="Like this reel"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/90 hover:scale-110 transition active:scale-95"
                  >
                    <svg
                      className={`h-5 w-5 transition-colors ${
                        likedReels[activeReel.id] ? 'fill-red-500 text-red-500' : 'fill-transparent text-white'
                      }`}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                    </svg>
                  </button>
                  <span className="text-[10px] font-semibold text-white/80">
                    {likeCounts[activeReel.id] ?? activeReel.likes}
                  </span>
                </div>

                {/* Share Button */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleShare(activeReel)}
                    aria-label="Share this reel"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/90 hover:scale-110 transition active:scale-95"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m22 2-7 20-4-9-9-4Z" />
                      <path d="M22 2 11 13" />
                    </svg>
                  </button>
                  <span className="text-[10px] font-semibold text-white/80">{activeReel.shares}</span>
                </div>

                {/* Cart / Bag Link */}
                <Link
                  href="/products"
                  aria-label="Explore store products"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/90 hover:scale-110 transition"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                    <path d="M3 6h18" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Bottom Pinned Shoppable Product Banner (SuperYou Style) */}
            <div className="relative z-20 p-3 sm:p-4 space-y-2">
              <p className="text-xs text-white/90 line-clamp-2 drop-shadow-md font-medium px-1">
                {activeReel.title}
              </p>

              {/* Product Card Container */}
              <div className="flex flex-col gap-2 rounded-2xl bg-neutral-900/90 backdrop-blur-md p-3 border border-white/15 shadow-xl">
                <div className="flex items-center gap-2.5">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-neutral-800 border border-white/10">
                    <Image
                      src={activeReel.product.image}
                      alt={activeReel.product.name}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white">
                      {activeReel.product.name}
                    </p>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-xs font-bold text-white">
                        ₹{activeReel.product.price.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-white/50 line-through">
                        ₹{activeReel.product.mrp.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-500/30">
                        {activeReel.product.discount}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Direct Buy Now CTA */}
                <Link
                  href={activeReel.product.href}
                  className="flex items-center justify-center rounded-xl bg-white text-neutral-950 py-2 text-xs font-bold uppercase tracking-wider transition hover:bg-white/90 active:scale-[0.99] shadow-md"
                >
                  Buy Now
                </Link>
              </div>
            </div>
          </div>

          {/* Floating Navigation Arrows Outside Modal on Desktop */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prevReel();
            }}
            aria-label="Previous reel"
            className="hidden md:flex absolute left-8 top-1/2 -translate-y-1/2 h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white transition hover:bg-white hover:text-neutral-950 hover:scale-110 shadow-xl"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              nextReel();
            }}
            aria-label="Next reel"
            className="hidden md:flex absolute right-8 top-1/2 -translate-y-1/2 h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white transition hover:bg-white hover:text-neutral-950 hover:scale-110 shadow-xl"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>

          {/* Share Toast Notification */}
          {shareToast && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-full bg-white text-neutral-950 px-4 py-2 text-xs font-semibold shadow-2xl animate-fade-in">
              Link copied to clipboard! 📋
            </div>
          )}
        </div>
      )}
    </section>
  );
}
