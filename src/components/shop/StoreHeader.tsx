'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { CartCount } from './CartCount';
import { AccountNav } from '@/components/auth/AccountNav';
import { MobileMenu } from './MobileMenu';

/**
 * Site header (client, route-aware). On the home page it starts transparent and
 * overlaid on the dark hero, becoming solid dark with blur on scroll. On every
 * other page it is a sticky solid dark bar. White text throughout.
 */
const NAV_LINKS: { label: string; href: string }[] = [
  { label: 'Home', href: '/' },
  { label: 'Products', href: '/products' },
  { label: 'About', href: '/about' },
  { label: 'Support', href: 'https://evmzone.com/evm-pickup-and-drop' },
];

export function StoreHeader() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`z-40 w-full text-white transition-all duration-300 ${
        isHome
          ? `fixed inset-x-0 top-0 ${
              scrolled
                ? 'bg-neutral-950/90 border-b border-white/10 backdrop-blur-md shadow-lg'
                : 'bg-transparent border-b border-transparent'
            }`
          : 'sticky top-0 border-b border-white/10 bg-neutral-950/95 backdrop-blur-md'
      }`}
    >
      <div className="mx-auto flex h-20 w-full max-w-[1600px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
        {/* Hamburger (mobile) + brand */}
        <div className="flex shrink-0 items-center gap-2">
          <MobileMenu links={NAV_LINKS} />
          <Logo href="/" height={28} priority />
        </div>

        {/* Center nav */}
        <nav
          aria-label="Primary"
          className="hidden items-center gap-10 lg:flex"
        >
          {NAV_LINKS.map((link) => {
            const isExternal = link.href.startsWith('http');
            const active = !isExternal && (link.href === pathname || (link.label === 'Home' && isHome));

            if (isExternal) {
              return (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative text-xs font-medium uppercase tracking-widest text-white/80 transition hover:text-white"
                >
                  {link.label}
                </a>
              );
            }

            return (
              <Link
                key={link.label}
                href={link.href}
                className="relative text-xs font-medium uppercase tracking-widest text-white/80 transition hover:text-white"
              >
                {link.label}
                {active && (
                  <span className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-white" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-3">
          <AccountNav />
          <CartCount />
        </div>
      </div>
    </header>
  );
}
