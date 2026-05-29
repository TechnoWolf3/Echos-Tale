import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { EchoApiProfile } from '@/services/echo-api';

const sessionTokenKey = 'echo.sessionToken';
const sessionProfileKey = 'echo.linkedProfile';
const devPasswordKey = 'echo.devPassword';
const sessionCookieName = 'echo_session_token';
const sessionMaxAgeSeconds = 60 * 60 * 24 * 90;

function webStorage() {
  if (typeof globalThis.localStorage === 'undefined') {
    return null;
  }

  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function readCookie(name: string) {
  if (typeof document === 'undefined') {
    return null;
  }

  const prefix = `${name}=`;
  const cookie = document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(prefix));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.slice(prefix.length));
}

function writeCookie(name: string, value: string) {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${sessionMaxAgeSeconds}; Path=/; SameSite=Lax; Secure`;
}

function clearCookie(name: string) {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax; Secure`;
}

export async function getStoredSessionToken() {
  if (Platform.OS === 'web') {
    try {
      return webStorage()?.getItem(sessionTokenKey) ?? readCookie(sessionCookieName);
    } catch {
      return readCookie(sessionCookieName);
    }
  }

  return SecureStore.getItemAsync(sessionTokenKey);
}

export async function getStoredLinkedProfile() {
  if (Platform.OS !== 'web') {
    return null;
  }

  try {
    const value = webStorage()?.getItem(sessionProfileKey);
    return value ? (JSON.parse(value) as EchoApiProfile) : null;
  } catch {
    return null;
  }
}

export async function setStoredSessionToken(token: string) {
  if (Platform.OS === 'web') {
    writeCookie(sessionCookieName, token);

    try {
      webStorage()?.setItem(sessionTokenKey, token);
    } catch {
      // Cookie fallback above keeps mobile Safari and in-app browsers from losing the bridge.
    }

    return;
  }

  await SecureStore.setItemAsync(sessionTokenKey, token);
}

export async function setStoredLinkedProfile(profile: EchoApiProfile) {
  if (Platform.OS !== 'web') {
    return;
  }

  try {
    webStorage()?.setItem(sessionProfileKey, JSON.stringify(profile));
  } catch {
    // Profile cache is only a convenience for web restore; the token remains the source of auth.
  }
}

export async function clearStoredSessionToken() {
  if (Platform.OS === 'web') {
    clearCookie(sessionCookieName);

    try {
      webStorage()?.removeItem(sessionTokenKey);
      webStorage()?.removeItem(sessionProfileKey);
    } catch {
      // Nothing else to clear if localStorage is unavailable.
    }

    return;
  }

  await SecureStore.deleteItemAsync(sessionTokenKey);
}

export async function getStoredDevPassword() {
  if (Platform.OS === 'web') {
    try {
      return webStorage()?.getItem(devPasswordKey) ?? null;
    } catch {
      return null;
    }
  }

  return SecureStore.getItemAsync(devPasswordKey);
}

export async function setStoredDevPassword(password: string) {
  if (Platform.OS === 'web') {
    try {
      webStorage()?.setItem(devPasswordKey, password);
    } catch {
      // Backend controls will simply ask again if browser storage is unavailable.
    }

    return;
  }

  await SecureStore.setItemAsync(devPasswordKey, password);
}

export async function clearStoredDevPassword() {
  if (Platform.OS === 'web') {
    try {
      webStorage()?.removeItem(devPasswordKey);
    } catch {
      // Nothing to clear if browser storage is unavailable.
    }

    return;
  }

  await SecureStore.deleteItemAsync(devPasswordKey);
}
