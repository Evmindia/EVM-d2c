import { AuthProvider } from '@/components/auth/AuthProvider';
import { StoreHeader } from '@/components/shop/StoreHeader';
import { Footer } from '@/components/shop/Footer';

/**
 * Storefront layout: a lightweight, accessible, mobile-first header and footer shared by
 * shop pages. Server component (no client JS). Admin has its own layout.
 */
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-gray-900 focus:px-3 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>
      <StoreHeader />
      <main id="main" className="min-h-[calc(100vh-14rem)] overflow-x-clip">{children}</main>
      <Footer />
    </AuthProvider>
  );
}
