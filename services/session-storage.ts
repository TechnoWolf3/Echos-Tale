import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const sessionTokenKey = 'echo.sessionToken';

function webStorage() {
  if (typeof globalThis.localStorage === 'undefined') {
    return null;
  }

  return globalThis.localStorage;
}

export async function getStoredSessionToken() {
  if (Platform.OS === 'web') {
    return webStorage()?.getItem(sessionTokenKey) ?? null;
  }

  return SecureStore.getItemAsync(sessionTokenKey);
}

export async function setStoredSessionToken(token: string) {
  if (Platform.OS === 'web') {
    webStorage()?.setItem(sessionTokenKey, token);
    return;
  }

  await SecureStore.setItemAsync(sessionTokenKey, token);
}

export async function clearStoredSessionToken() {
  if (Platform.OS === 'web') {
    webStorage()?.removeItem(sessionTokenKey);
    return;
  }

  await SecureStore.deleteItemAsync(sessionTokenKey);
}
