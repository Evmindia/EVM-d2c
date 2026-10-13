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
    apiKey: publicEnv.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCmjqab5SUVxq7vu9_xJmaY-6XB-EWrtaA',
    authDomain: publicEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'evm-d2c-dev.firebaseapp.com',
    projectId: publicEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'evm-d2c-dev',
    storageBucket: publicEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'evm-d2c-dev.firebasestorage.app',
    messagingSenderId: publicEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '652116955490',
    appId: publicEnv.NEXT_PUBLIC_FIREBASE_APP_ID || '1:652116955490:web:291487742931b639951c3b',
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
