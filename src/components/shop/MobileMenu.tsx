'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';

/**
 * Mobile navigation (client island). Shows a hamburger button below the `lg`
 * breakpoint that toggles a slide-down panel with the primary nav links. The
 * desktop nav in StoreHeader stays hidden until `lg`. Closes on route change,
 * Escape, or link tap.
 */
export function MobileMenu({ links }: { links: { label: string; href: string }[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close when the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape and lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="mobile-nav"
        className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10"
      >
        {open ? (
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        ) : (
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 top-20 z-20 bg-black/20"
          />
          {/* Panel */}
          <nav
            id="mobile-nav"
            aria-label="Mobile"
            className="absolute left-0 right-0 top-20 z-30 border-b border-gray-100 bg-white shadow-lg"
          >
            <div className="border-b border-gray-100 px-6 py-4">
              <Logo href="/" height={24} variant="dark" />
            </div>
            <ul className="flex flex-col px-4 py-2">
              {links.map((link) => {
                const isExternal = link.href.startsWith('http');
                return (
                  <li key={link.label}>
                    {isExternal ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setOpen(false)}
                        className="block rounded-lg px-3 py-3 text-base font-medium text-gray-800 transition hover:bg-gray-100"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="block rounded-lg px-3 py-3 text-base font-medium text-gray-800 transition hover:bg-gray-100"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}
