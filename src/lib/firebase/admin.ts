import 'server-only';

/**
 * Firebase Admin SDK — SERVER ONLY.
 *
 * The `server-only` import above makes any accidental client import a build
 * error. Admin credentials come from server env (never NEXT_PUBLIC_). In Phase 1
 * credentials may be blank (PENDING project provisioning); initialization is
 * lazy so importing this module never crashes the build, and code that actually
 * needs Admin access throws a clear, safe error when credentials are absent.
 */
import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';
import { serverEnv } from '@/lib/config/server-env';
import { AppError } from '@/lib/security/errors';

let app: App | null = null;

function adminApp(): App {
  if (app) return app;
  if (getApps().length > 0) {
    app = getApps()[0]!;
    return app;
  }
  const env = serverEnv();
  const projectId =
    env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    'evm-d2c-dev';

  const storageBucket =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    `${projectId}.firebasestorage.app`;

  // Explicit service account credentials (local dev or env-configured)
  if (
    env.FIREBASE_ADMIN_CLIENT_EMAIL &&
    env.FIREBASE_ADMIN_PRIVATE_KEY
  ) {
    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
        // Private keys are stored with literal \n; restore real newlines.
        privateKey: env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      storageBucket,
    });
    return app;
  }

  // Cloud Run / Firebase App Hosting environment: fallback to Application Default Credentials
  const isCloudEnv = Boolean(
    process.env.K_SERVICE ||
    process.env.FUNCTION_NAME ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.FIREBASE_CONFIG
  );

  if (isCloudEnv) {
    app = initializeApp({
      projectId,
      storageBucket,
    });
    return app;
  }

  // Safe error — no secret values leaked. Occurs only when a request truly
  // needs Admin access before credentials are configured.
  throw new AppError('internal_error', {
    internal: 'Firebase Admin credentials are not configured for this environment.',
  });
}

export function adminAuth(): Auth {
  return getAuth(adminApp());
}

export function adminDb(): Firestore {
  return getFirestore(adminApp());
}

export function adminStorageBucketName(): string {
  const env = serverEnv();
  return (
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    `${env.FIREBASE_ADMIN_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || 'evm-d2c-dev'}.firebasestorage.app`
  );
}

export function adminStorage(): Storage {
  return getStorage(adminApp());
}

/** True when Admin credentials or cloud environment are present (useful for health checks). */
export function isAdminConfigured(): boolean {
  const env = serverEnv();
  return Boolean(
    (env.FIREBASE_ADMIN_PROJECT_ID &&
      env.FIREBASE_ADMIN_CLIENT_EMAIL &&
      env.FIREBASE_ADMIN_PRIVATE_KEY) ||
      process.env.K_SERVICE ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCLOUD_PROJECT ||
      process.env.FIREBASE_CONFIG,
  );
}

