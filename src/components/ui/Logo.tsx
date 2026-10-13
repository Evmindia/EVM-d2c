import Image from 'next/image';
import Link from 'next/link';

export interface LogoProps {
  /**
   * Color variant:
   * - 'light': White logo (for dark backgrounds like header, footer, hero)
   * - 'dark': Black logo (for light backgrounds like drawer, light cards)
   * Default is 'light'.
   */
  variant?: 'light' | 'dark';
  /**
   * Display height in pixels. Default is 28.
   */
  height?: number;
  /**
   * Additional custom Tailwind classes.
   */
  className?: string;
  /**
   * Set true for LCP/Header logos.
   */
  priority?: boolean;
  /**
   * Wrap with home link if specified.
   */
  href?: string;
}

/**
 * Official EVM® brand logo component.
 * Renders high-resolution transparent logo matching exact brand guidelines.
 */
export function Logo({
  variant = 'light',
  height = 28,
  className = '',
  priority = false,
  href,
}: LogoProps) {
  // Aspect ratio: 461 x 183 (~2.519)
  const width = Math.round(height * (461 / 183));
  const src = variant === 'dark' ? '/logo-dark.png' : '/logo-white.png';

  const content = (
    <Image
      src={src}
      alt="EVM®"
      width={width}
      height={height}
      priority={priority}
      className={`h-auto w-auto object-contain shrink-0 ${className}`}
      style={{ height: `${height}px`, width: 'auto' }}
    />
  );

  if (href) {
    return (
      <Link href={href} aria-label="EVM Home" className="inline-flex items-center shrink-0">
        {content}
      </Link>
    );
  }

  return content;
}
