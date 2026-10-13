import 'server-only';

/**
 * Server-only environment access (secrets). Isolated from lib/config/env.ts so
 * that importing the client-safe `publicEnv` never drags secret variable names
 * or the secret-reading code into a client bundle. The `server-only` marker
 * makes any accidental client import a build error.
 *
 * Values are read lazily and validated for shape; many are blank/PENDING in
 * dev. Code that needs a specific secret throws a clear, safe error at call time.
 */
import { z } from 'zod';

const serverSchema = z.object({
  APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  FIREBASE_ADMIN_PROJECT_ID: z.string().default(''),
  FIREBASE_ADMIN_CLIENT_EMAIL: z.string().default(''),
  FIREBASE_ADMIN_PRIVATE_KEY: z.string().default(''),
  PAYMENT_PROVIDER: z.enum(['pending', 'razorpay', 'cashfree', 'smartgateway']).default('pending'),
  PAYMENT_KEY_ID: z.string().default(''),
  PAYMENT_KEY_SECRET: z.string().default(''),
  PAYMENT_WEBHOOK_SECRET: z.string().default(''),
  // Razorpay (server-only). key_id is public and may be returned to the browser
  // by the API; key_secret + webhook_secret must NEVER leave the server.
  RAZORPAY_KEY_ID: z.string().default(''),
  RAZORPAY_KEY_SECRET: z.string().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().default(''),
  // HDFC SmartGateway (Juspay)
  HDFC_SMARTGATEWAY_API_KEY: z.string().default(''),
  HDFC_SMARTGATEWAY_MERCHANT_ID: z.string().default(''),
  HDFC_SMARTGATEWAY_RESPONSE_KEY: z.string().default(''),
  HDFC_SMARTGATEWAY_PAYMENT_PAGE_CLIENT_ID: z.string().default('hdfcmaster'),
  HDFC_SMARTGATEWAY_BASE_URL: z.string().default('https://smartgateway.hdfcuat.bank.in'),
  SHIPPING_PROVIDER: z.enum(['bluedart']).default('bluedart'),
  RATE_LIMIT_PROVIDER: z.enum(['memory', 'upstash', 'firestore']).default('memory'),
  UPSTASH_REDIS_REST_URL: z.string().default(''),
  UPSTASH_REDIS_REST_TOKEN: z.string().default(''),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cachedServerEnv: ServerEnv | null = null;

/** Server-only. Do NOT import from client components (build error via server-only). */
export function serverEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;
  cachedServerEnv = serverSchema.parse({
    APP_ENV: process.env.APP_ENV,
    FIREBASE_ADMIN_PROJECT_ID: process.env.FIREBASE_ADMIN_PROJECT_ID,
    FIREBASE_ADMIN_CLIENT_EMAIL: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    FIREBASE_ADMIN_PRIVATE_KEY: process.env.FIREBASE_ADMIN_PRIVATE_KEY,
    PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER,
    PAYMENT_KEY_ID: process.env.PAYMENT_KEY_ID,
    PAYMENT_KEY_SECRET: process.env.PAYMENT_KEY_SECRET,
    PAYMENT_WEBHOOK_SECRET: process.env.PAYMENT_WEBHOOK_SECRET,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
    HDFC_SMARTGATEWAY_API_KEY: process.env.HDFC_SMARTGATEWAY_API_KEY,
    HDFC_SMARTGATEWAY_MERCHANT_ID: process.env.HDFC_SMARTGATEWAY_MERCHANT_ID,
    HDFC_SMARTGATEWAY_RESPONSE_KEY: process.env.HDFC_SMARTGATEWAY_RESPONSE_KEY,
    HDFC_SMARTGATEWAY_PAYMENT_PAGE_CLIENT_ID: process.env.HDFC_SMARTGATEWAY_PAYMENT_PAGE_CLIENT_ID,
    HDFC_SMARTGATEWAY_BASE_URL: process.env.HDFC_SMARTGATEWAY_BASE_URL,
    SHIPPING_PROVIDER: process.env.SHIPPING_PROVIDER,
    RATE_LIMIT_PROVIDER: process.env.RATE_LIMIT_PROVIDER,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  return cachedServerEnv;
}
