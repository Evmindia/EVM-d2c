'use client';

/**
 * Firebase Web SDK — client init using PUBLIC config only.
 * The web API key is NOT a secret (access is governed by Security Rules, which
 * default-deny). Initialization is guarded so it runs once and only when config
 * is present.
 */
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { publicEnv } from '@/lib/config/env';

let app: FirebaseApp | null = null;

function firebaseConfig() {
  return {
    apiKey: publicEnv.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: publicEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: publicEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: publicEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: publicEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: publicEnv.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

export function clientApp(): FirebaseApp {
  if (app) return app;
  app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig());
  return app;
}

export function clientAuth(): Auth {
  return getAuth(clientApp());
}
