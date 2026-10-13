import { route, ok } from '@/app/api/_lib/handler';
import { appEnv } from '@/lib/config/env';
import { isSiteUrlConfigured } from '@/lib/config/site';
import { isPaymentProviderConfigured } from '@/services/payments/provider.factory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Public liveness/readiness endpoint. Exposes ONLY non-sensitive booleans and
 * the environment name — never secrets, versions of internals, or config values.
 * Rate-limited under the generic 'public' policy.
 */
export const GET = route(
  async () =>
    ok({
      status: 'ok',
      env: appEnv,
      siteUrlConfigured: isSiteUrlConfigured(),
      paymentProviderConfigured: isPaymentProviderConfigured(),
    }),
  { rateLimit: 'public' },
);
