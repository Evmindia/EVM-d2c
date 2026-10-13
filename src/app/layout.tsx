import type { Metadata, Viewport } from 'next';
import './globals.css';
import { siteUrl, siteMeta } from '@/lib/config/site';
import { organizationJsonLd, websiteJsonLd } from '@/lib/seo/structured-data';

export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  themeColor: '#ffffff',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

/**
 * Global Root Metadata optimized for Google/Bing ranking and social sharing.
 * Fully subdomain-aware: canonical and OpenGraph URLs resolve dynamically from NEXT_PUBLIC_SITE_URL.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${siteMeta.name} — Official Store | High-Performance Power Banks & Audio`,
    template: `%s | ${siteMeta.name}`,
  },
  description: siteMeta.description,
  keywords: [...siteMeta.keywords],
  authors: [{ name: siteMeta.name, url: siteUrl() }],
  creator: siteMeta.name,
  publisher: siteMeta.name,
  category: 'Consumer Electronics & Mobile Accessories',
  alternates: {
    canonical: './',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: siteUrl(),
    siteName: siteMeta.shortName,
    title: `${siteMeta.name} — Official Store | High-Performance Power Banks & Audio`,
    description: siteMeta.description,
    images: [
      {
        url: '/hero-headphones.webp',
        width: 1200,
        height: 630,
        alt: `${siteMeta.name} — Official D2C Store`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteMeta.name} — Official Store`,
    description: siteMeta.description,
    creator: '@evmzone',
    site: '@evmzone',
    images: ['/hero-headphones.webp'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const orgSchema = organizationJsonLd();
  const siteSchema = websiteJsonLd();

  return (
    <html lang="en" className="scroll-smooth" style={{ colorScheme: 'light' }}>
      <head>
        {/* Resource Hints for High-Speed Image Loading (CDN Preconnect) */}
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://firebasestorage.googleapis.com" />

        {/* Global Organization & WebSite Schemas */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema) }}
        />
      </head>
      <body className="min-h-screen bg-white text-gray-900 antialiased">{children}</body>
    </html>
  );
}

