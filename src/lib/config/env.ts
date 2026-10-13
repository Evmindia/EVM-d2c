/**
 * Central, validated environment access.
 *
 * - `publicEnv` holds ONLY non-secret values that are safe for the browser
 *   (NEXT_PUBLIC_*). Never add a secret here.
 * - `serverEnv()` validates and returns server-only secrets. It must never be
 *   imported into a client component. Values are read lazily so the client
 *   bundle never references secret env vars.
 *
 * Missing values are tolerated in Phase 1 (many are PENDING) but validated for
 * shape. Runtime code that actually needs a PENDING secret throws a clear,
 * safe error at call time (see NotImplemented / config guards).
 */
import { z } from 'zod';

export type AppEnvironment = 'development' | 'staging' | 'production';

// ---- Public (browser-safe) --------------------------------------------------
const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().or(z.literal('')).default(''),
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().default(''),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().default(''),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().default(''),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().default(''),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().default(''),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().default(''),
  NEXT_PUBLIC_GA4_MEASUREMENT_ID: z.string().default(''),
  NEXT_PUBLIC_META_PIXEL_ID: z.string().default(''),
});

// Reference each var explicitly so Next inlines them into the client bundle.
export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_GA4_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID,
  NEXT_PUBLIC_META_PIXEL_ID: process.env.NEXT_PUBLIC_META_PIXEL_ID,
});

export const appEnv: AppEnvironment =
  (process.env.APP_ENV as AppEnvironment | undefined) ?? 'development';

export const isProduction = appEnv === 'production';

// ---- Server (secret) --------------------------------------------------------
// Server-only env access lives in ./server-env (guarded by `server-only`).
// Import { serverEnv } from '@/lib/config/server-env' in server code. It is
// intentionally NOT re-exported here so a client import of publicEnv can never
// pull secret variable names or the secret-reading code into the client bundle.
