/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App safely (singleton)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const GMAIL_SCOPES = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.metadata',
  'https://www.googleapis.com/auth/gmail.settings.basic',
  'https://www.googleapis.com/auth/gmail.settings.sharing',
  'https://www.googleapis.com/auth/gmail.insert',
  'https://www.googleapis.com/auth/gmail.addons.current.action.compose',
  'https://www.googleapis.com/auth/gmail.addons.current.message.action',
  'https://www.googleapis.com/auth/gmail.addons.current.message.metadata',
  'https://www.googleapis.com/auth/gmail.addons.current.message.readonly'
];

const createGoogleProvider = (includeGmailScopes: boolean) => {
  const gProvider = new GoogleAuthProvider();
  if (includeGmailScopes) {
    GMAIL_SCOPES.forEach((scope) => {
      gProvider.addScope(scope);
    });
    gProvider.setCustomParameters({
      prompt: 'consent',
      access_type: 'offline'
    });
  } else {
    gProvider.setCustomParameters({
      prompt: 'select_account'
    });
  }
  return gProvider;
};

// Flag to track sign-in in progress
let isSigningIn = false;
// In-memory access token cache (CRITICAL: Do NOT store in localStorage per SKILL.md)
let cachedAccessToken: string | null = null;
let cachedGoogleUser: User | null = null;

type AuthCallback = (user: User | null, token: string | null) => void;
const listeners = new Set<AuthCallback>();

export const subscribeToGoogleAuth = (callback: AuthCallback) => {
  listeners.add(callback);
  callback(cachedGoogleUser, cachedAccessToken);
  return () => {
    listeners.delete(callback);
  };
};

const notifyListeners = () => {
  listeners.forEach((cb) => cb(cachedGoogleUser, cachedAccessToken));
};

// Initialize auth state listener
export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    cachedGoogleUser = user;
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token not cached yet (e.g. page reload), prompt login when user triggers action
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      cachedGoogleUser = null;
      if (onAuthFailure) onAuthFailure();
    }
    notifyListeners();
  });
};

// Sign in with Google Popup
export const signInWithGoogle = async (
  options: { includeGmailScopes?: boolean } = {}
): Promise<{ user: User; accessToken: string | null }> => {
  const { includeGmailScopes = true } = options;
  try {
    isSigningIn = true;
    const authProvider = createGoogleProvider(includeGmailScopes);
    const result = await signInWithPopup(auth, authProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (includeGmailScopes && !credential?.accessToken) {
      throw new Error('Failed to obtain Google access token. Please grant the requested permissions.');
    }

    cachedAccessToken = credential?.accessToken || null;
    cachedGoogleUser = result.user;
    notifyListeners();

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (error?.code === 'auth/popup-blocked' || error?.message?.includes('popup-blocked')) {
      const friendlyErr = new Error('Popup blocked by browser or iframe sandbox. Please allow popups for this site, or open the app in a new tab.');
      (friendlyErr as any).code = 'auth/popup-blocked';
      console.warn('Google Sign-In popup was blocked:', error);
      throw friendlyErr;
    }
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.message?.includes('popup-closed-by-user')
    ) {
      const friendlyErr = new Error(
        'Google Sign-In popup was closed before sign-in finished. Keep the Google popup open until it redirects back automatically, or open the app URL directly in a standalone browser tab if embedded preview policies close popups.'
      );
      (friendlyErr as any).code = error?.code || 'auth/popup-closed-by-user';
      console.warn('Google Sign-In popup closed before completion:', error?.code);
      throw friendlyErr;
    }
    console.error('Google Sign-In failed:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getGoogleAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getCachedGoogleUser = (): User | null => {
  return cachedGoogleUser;
};

export const googleSignOut = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  cachedGoogleUser = null;
  notifyListeners();
};
