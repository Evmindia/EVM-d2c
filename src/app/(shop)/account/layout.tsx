import type { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { AccountGuard } from '@/components/auth/AccountGuard';
import { AccountShell } from '@/components/auth/AccountShell';

export const metadata: Metadata = {
  title: 'My account',
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <Container className="py-6">
      <h1 className="text-xl font-semibold text-gray-900">My account</h1>
      <div className="mt-4">
        <AccountGuard>
          <AccountShell>{children}</AccountShell>
        </AccountGuard>
      </div>
    </Container>
  );
}
