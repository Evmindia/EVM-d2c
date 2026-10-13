# EVM D2C Storefront (Pilot)

Production-ready, mobile-first D2C storefront + admin for EVM, built as a single
Next.js (App Router) application. **Phase 1 (foundation) only** — storefront and
admin features arrive in later phases.

> **PENDING — Final D2C subdomain (`<FINAL_D2C_SUBDOMAIN>`).** No domain is
> hardcoded anywhere. The whole app derives absolute URLs from
> `NEXT_PUBLIC_SITE_URL`; changing the subdomain is a config change only.

## Tech

Next.js · TypeScript (strict) · Tailwind · Firebase (Auth/Firestore/Storage) ·
Firebase Admin (server) · Zod · Vitest.

Payment gateway (Razorpay/Cashfree/…) and shipping (Blue Dart) sit behind
provider-agnostic interfaces and are **not implemented yet** (PENDING).

## Getting started

```bash
npm install
cp .env.example .env.local   # fill per-environment values; NEVER commit secrets
npm run dev
```

## Scripts

```bash
npm run typecheck   # tsc --noEmit (strict)
npm run lint        # eslint
npm test            # vitest (unit + security tests)
npm run build       # next production build
npm run audit       # npm audit (high+)
npm run check       # typecheck + lint + test + build
```

## Architecture (Phase 1)

- `src/lib/config/` — validated env + site-URL config (no hardcoded domain).
- `src/lib/firebase/` — client (public) and admin (server-only) SDK init.
- `src/lib/security/` — errors (safe envelope), headers/CSP, auth, authorize
  (IDOR guards), validate (Zod + body limits), rate-limit abstraction.
- `src/services/payments/` — provider-agnostic payment interface + service +
  Razorpay/Cashfree stubs (PENDING).
- `src/services/shipping/` — provider-agnostic shipping interface + service +
  Blue Dart stub (PENDING).
- `firestore.rules` / `storage.rules` — **default-deny**.
- `middleware.ts` — admin pre-filter + security headers.

See [SECURITY.md](SECURITY.md) for the threat model and security architecture.

## Firebase setup (operator steps — not in code)

Create separate **development / staging / production** Firebase projects. For
each, set the public web config (`NEXT_PUBLIC_FIREBASE_*`) and the server-only
Admin credentials (`FIREBASE_ADMIN_*`) in that environment's secret store.
Service-account JSON files must never be committed. Deploy `firestore.rules` and
`storage.rules` with the Firebase CLI.

## Deployment

Origin-agnostic and CDN/WAF-ready. No subdomain- or provider-specific deploy
config is committed while those decisions are PENDING.
