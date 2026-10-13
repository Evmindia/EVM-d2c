# EVM D2C — Security Policy & Architecture

This document is the source of truth for how the EVM D2C storefront + admin is
secured. It is maintained as the app evolves. Security is a first-class,
cross-cutting requirement, not a phase.

## 1. Threat Model

**Assets:** customer PII (name, phone, email, addresses), orders, payments,
inventory, shipment data, admin accounts, and vendor secrets (payment gateway,
shipping, Meta CAPI, Firebase Admin).

**Assumed attacker:** bypasses the frontend entirely and scripts our APIs,
Firebase resources, and auth flows directly; replays/forges requests and
webhooks; attempts IDOR, price/quantity/coupon tampering, concurrent-checkout
races, token forgery/reuse, direct Firestore/Storage access, and endpoint abuse.

**Core assumption:** *the frontend provides zero security.* Every guarantee is
enforced server-side. The client proposes; the server disposes.

## 2. Security Assumptions

- All client-supplied values (body, query, headers, cookies, DOM, localStorage)
  are untrusted.
- Identity is established only by verifying a Firebase Auth token/session
  server-side. `uid`, `role`, and `permissions` are read from verified custom
  claims, never from request input.
- Money, inventory, order state, payment state, and refund state are computed
  and owned server-side.

## 3. Authentication Model

- Firebase Authentication issues ID tokens; the server verifies every protected
  request with the Admin SDK (`verifyIdToken` / `verifySessionCookie`, with
  `checkRevoked=true`).
- Expired → `token_expired` (client refreshes and retries once). Invalid/forged
  → `token_invalid`. Missing → `unauthenticated`.
- Session invalidation / logout revokes refresh tokens so stolen tokens die on
  next check.
- See `src/lib/security/auth.ts`.

## 4. Authorization Model

- Principals: `customer`, `admin`, `superadmin` (+ fine-grained `permissions`),
  expressed as Firebase custom claims set only by a secure server process.
- Guards (`src/lib/security/authorize.ts`): `requireAdmin`, `requireSuperadmin`,
  `requirePermission`, `requireOwnership` (the core IDOR control — resource owner
  compared against the verified token uid).
- Admin routes are protected by middleware (pre-filter) AND per-handler
  server-side role checks. Middleware is never the sole authorization.

## 5. Sensitive Resources (server-only)

These Firestore collections deny ALL client access (Admin SDK only):
`payments, refunds, inventory, shipments, admin_users, audit_logs,
analytics_events, notifications, coupons, processed_webhooks, rate_limits`.
Firestore and Storage rules are **default-deny** (`firestore.rules`,
`storage.rules`).

## 6. Webhook Security (payment + shipping)

- Verify the provider signature/HMAC over the RAW request body.
- Idempotency: dedupe by provider event id (`processed_webhooks`); repeats are
  no-ops.
- Replay protection: validate signature + timestamp/nonce window.
- Payment status is never trusted from frontend requests — only from verified
  provider signals. Order/payment/inventory updates run in transactions.

## 7. Secret Management

- No secret uses the `NEXT_PUBLIC_` prefix. Only non-secret public config is
  public (Firebase web config, site URL, public analytics IDs).
- Server secrets: Firebase Admin credentials, payment gateway secret + webhook
  secret, Blue Dart credentials, Meta CAPI token, messaging provider secrets.
- Provided via the platform secret store per environment. `.env.example` holds
  blank placeholders; real env files are gitignored. Secret scanning (gitleaks)
  runs in CI.

## 8. Logging Policy

- Structured server logs with redaction (`src/lib/logger.ts`). NEVER log:
  passwords, OTPs, payment card data, auth tokens, API secrets, full signatures.
- Append-only audit logs for sensitive admin/superadmin actions
  (`src/lib/audit/audit.ts`).
- API error responses use a safe typed envelope with a correlation id; no stack
  traces, paths, DB internals, or secrets ever reach the client
  (`src/lib/security/errors.ts`).

## 9. HTTP Security

- Headers set in `src/lib/security/http-headers.ts`: CSP (documented allowlist),
  `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`,
  `Permissions-Policy`, and HSTS in production.
- The CSP allowlist is documented in that file and finalized once the payment
  gateway and analytics IDs are confirmed. The app is CDN/WAF-ready: an edge/WAF
  can add or override headers without app changes.

## 10. Rate Limiting & Abuse Protection

- Provider-agnostic (`src/lib/security/rate-limit/`). Interface + service; the
  app calls only the service. Providers: memory (dev), Upstash (preferred prod),
  Firestore (fallback), chosen by `RATE_LIMIT_PROVIDER`.
- Named policies with tighter limits for auth, checkout, payment, review,
  support, and search.

## 11. Environment Separation

- Isolated development / staging / production, each with its own Firebase
  project and secrets. Production secrets are never used in dev/test.

## 12. Incident Response (basics)

1. **Contain** — revoke affected tokens/keys, disable compromised accounts,
   rotate secrets.
2. **Assess** — scope via structured/audit logs and correlation ids.
3. **Notify** — inform stakeholders; follow applicable legal/data-protection
   obligations.
4. **Remediate** — patch root cause, add a regression test, document.

## 12a. Accepted Residual Vulnerabilities

Tracked, management-accepted residuals (not suppressed). Revisit when a clean
upstream fix ships.

- **uuid buffer-bounds (GHSA-w5hq-g745-h8pq), 8 moderate (as of 2026-08-16).**
  All eight `npm audit` moderates trace to this single advisory propagating up
  firebase-admin's Google Cloud transitive chain
  (`uuid → gaxios/teeny-request/retry-request → google-gax →
  @google-cloud/firestore, @google-cloud/storage → firebase-admin`).
  - **Reachability: low.** The advisory triggers only when the caller passes an
    attacker-controlled `buf` output buffer to uuid v3/v5/v6. The Google Cloud
    libraries use uuid to *generate* IDs and never pass such a buffer, so the
    vulnerable path is not reachable through our usage.
  - **Fix status:** no clean non-major fix. npm suggests a firebase-admin
    downgrade (rejected — regressive). firebase-admin@14 clears only 2 of 8 and
    forces Node ≥22; **explicitly declined** — we do NOT upgrade
    firebase-admin/Node solely to reduce the audit count.
  - **Decision:** accepted for the pilot; re-evaluate when firebase-admin ships a
    patched chain or when the platform Node baseline moves to 22.

## 13. Pre-Launch Security Checklist

Testing targets ONLY our own EVM staging/production environments. No offensive
tooling; no third-party systems.

**Authentication:** invalid token · expired token · another user's token ·
privilege escalation (client-set role/claims) · revoked-token reuse · session
abuse.
**Authorization:** IDOR · cross-user data read · customer hitting admin API ·
admin invoking superadmin-only action.
**Orders:** price · quantity · order-ID · unauthorized cancellation · duplicate
order (idempotency).
**Payments:** fake client success · amount mismatch · duplicate payment ·
replayed/forged/duplicate webhook · unauthorized refund.
**Inventory:** concurrent checkout · overselling · negative stock · duplicate
deduction.
**Firebase:** direct Firestore read/write · cross-user document access ·
unauthorized Storage access.
**Input:** XSS · injection · malformed payload · oversized payload · malicious
file upload.
**Abuse:** rate-limit enforcement · API enumeration · checkout/review/support
spam.

Automated coverage exists in CI (`npm run check` + gitleaks). Security tests are
written alongside each feature, not deferred.
