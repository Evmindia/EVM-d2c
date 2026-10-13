import Link from 'next/link';

interface BreadcrumbsProps {
  items: { name: string; path: string }[];
  variant?: 'light' | 'dark'; // 'light' = dark text on light bg, 'dark' = white text on dark bg
  className?: string;
}

/** Accessible breadcrumb trail supporting both light and dark backgrounds. */
export function Breadcrumbs({ items, variant = 'light', className = '' }: BreadcrumbsProps) {
  const isDark = variant === 'dark';

  return (
    <nav
      aria-label="Breadcrumb"
      className={`text-xs ${isDark ? 'text-white/60' : 'text-neutral-500'} ${className}`}
    >
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <li key={it.path} className="flex items-center gap-1.5">
              {last ? (
                <span
                  aria-current="page"
                  className={`font-medium ${isDark ? 'text-white' : 'text-neutral-900'}`}
                >
                  {it.name}
                </span>
              ) : (
                <>
                  <Link
                    href={it.path}
                    className={`transition hover:underline ${
                      isDark ? 'hover:text-white' : 'hover:text-neutral-900'
                    }`}
                  >
                    {it.name}
                  </Link>
                  <span aria-hidden="true" className={isDark ? 'text-white/40' : 'text-neutral-400'}>
                    /
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
