import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { siteMeta } from '@/lib/config/site';

/**
 * Storefront footer with exact original content:
 * Left: Shop, Company, Support link columns.
 * Right: Logo, description, newsletter capture, and Follow Us social links.
 * Bottom: Copyright, Privacy Policy, and Terms & Conditions.
 */
const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: 'Shop',
    links: [
      { label: 'Powerbank', href: '/products' },
      { label: 'Headphone', href: '/products' },
      { label: 'Earphone', href: '/products' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About Us', href: '/about' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'Privacy Policy', href: '/privacy-policy' },
      { label: 'Terms & Conditions', href: '/terms-and-conditions' },
    ],
  },
  {
    heading: 'Support',
    links: [
      { label: 'Shipping & Delivery', href: '/shipping-policy' },
      { label: 'Returns & Refunds', href: '/refund-policy' },
      { label: 'Warranty & Service', href: 'https://evmzone.com/evm-pickup-and-drop' },
      { label: 'Customer Helpline', href: '/contact' },
    ],
  },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-neutral-950 text-white">
      <div className="mx-auto max-w-[1600px] px-6 py-16 sm:px-10">
        <div className="grid gap-12 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_1.5fr]">
          {/* Link columns on left */}
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-white/90">
                {col.heading}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => {
                  const isExternal = l.href.startsWith('http');
                  return (
                    <li key={l.label}>
                      {isExternal ? (
                        <a
                          href={l.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-white/55 transition hover:text-white"
                        >
                          {l.label}
                        </a>
                      ) : (
                        <Link href={l.href} className="text-xs text-white/55 transition hover:text-white">
                          {l.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {/* Logo, Newsletter & Social on right */}
          <div className="space-y-4 sm:col-span-2 md:col-span-3 lg:col-span-1 lg:ml-auto">
            <Logo href="/" height={32} variant="light" />
            <p className="max-w-xs text-xs leading-relaxed text-white/50">
              Next-generation high performance electronics, power banks, and audio accessories.
            </p>
            <form suppressHydrationWarning className="mt-5 flex max-w-xs items-center rounded-full border border-white/15 bg-white/5 px-4 py-1">
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                suppressHydrationWarning
                id="newsletter-email"
                type="email"
                placeholder="Enter your email"
                className="h-9 w-full bg-transparent text-xs text-white outline-none placeholder:text-white/40"
              />
              <button
                suppressHydrationWarning
                type="button"
                aria-label="Subscribe"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/80 transition hover:text-white"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </form>

            <div className="pt-2">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-white/90">
                Follow Us
              </h3>
              <div className="mt-3 flex gap-4 text-white/60">
                <SocialIcon label="Instagram">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
                </SocialIcon>
                <SocialIcon label="Twitter">
                  <path d="M22 5.9c-.7.3-1.5.5-2.3.6a4 4 0 0 0 1.8-2.2c-.8.5-1.7.8-2.6 1a4 4 0 0 0-6.9 3.6A11.4 11.4 0 0 1 3.8 4.6a4 4 0 0 0 1.2 5.4c-.6 0-1.2-.2-1.8-.5a4 4 0 0 0 3.2 4c-.5.1-1.1.2-1.7.1a4 4 0 0 0 3.7 2.8A8 8 0 0 1 2 18.1a11.3 11.3 0 0 0 6.1 1.8c7.4 0 11.4-6.1 11.4-11.4v-.5c.8-.6 1.5-1.3 2-2.1Z" />
                </SocialIcon>
                <SocialIcon label="YouTube">
                  <rect x="3" y="6" width="18" height="12" rx="3" />
                  <path d="M11 9.5v5l4-2.5-4-2.5Z" fill="currentColor" stroke="none" />
                </SocialIcon>
              </div>
            </div>
          </div>
        </div>

        {/* Legal & copyright row */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-[11px] text-white/45 sm:flex-row">
          <div>
            <p>© {currentYear} {siteMeta.name}. All rights reserved.</p>
            <p className="text-[10px] text-white/30 mt-0.5">Operated by {siteMeta.legalName}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link href="/privacy-policy" className="transition hover:text-white">Privacy Policy</Link>
            <Link href="/terms-and-conditions" className="transition hover:text-white">Terms &amp; Conditions</Link>
            <Link href="/refund-policy" className="transition hover:text-white">Refund &amp; Cancellation</Link>
            <Link href="/shipping-policy" className="transition hover:text-white">Shipping Policy</Link>
            <Link href="/disclaimer" className="transition hover:text-white">Disclaimer</Link>
            <Link href="/contact" className="transition hover:text-white">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Link href="/products" aria-label={label} className="transition hover:text-white">
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
      </svg>
    </Link>
  );
}
