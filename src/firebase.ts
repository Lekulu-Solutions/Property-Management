import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  User,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  getAuth,
  initializeAuth,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  Firestore,
  doc,
  getDocFromServer,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

export interface CloudBootstrapPayload {
  version: number;
  authUser: Record<string, any> | null;
  workspaceAccessToken?: string | null;
  sheetConnections?: Record<string, any> | null;
  workbooksByYear?: Record<string, any> | null;
  yearsList?: string[] | null;
  shareRules?: any[] | null;
  exportedAt?: string;
}

declare global {
  interface Window {
    __MZ_CLOUD_BOOTSTRAP__?: CloudBootstrapPayload;
  }
}

export const isFileProtocol =
  typeof window !== 'undefined' && window.location.protocol === 'file:';

const AUTH_STORAGE_KEY = `firebase:authUser:${firebaseConfig.apiKey}:[DEFAULT]`;
const AUTH_BACKUP_STORAGE_KEY = 'mz_cloud_auth_backup_v1';
const WORKSPACE_TOKEN_BACKUP_KEY = 'mz_workspace_token_backup_v1';
const EXPLICIT_LOGOUT_KEY = 'mz_explicit_logout_v1';
const SHEET_CONN_STORAGE_KEY = 'mesfin_zewdnesh_gsheet_connections_v1';
const WORKBOOKS_STORAGE_KEY = 'mesfin_zewdnesh_workbooks_by_year_v2';
const YEARS_LIST_STORAGE_KEY = 'mesfin_zewdnesh_years_list_v1';
const SHARE_RULES_STORAGE_KEY = 'mesfin_zewdnesh_share_rules_v1';

// In-memory access token cache (also backed up for APK offline/hybrid continuity)
let isSigningIn = false;
let cachedAccessToken: string | null = null;

/**
 * Restores pre-embedded APK bootstrap data or local backup session BEFORE Firebase Auth initializes,
 * ensuring the Android APK immediately boots into the authenticated Firebase account (e.g. tewolde1574@gmail.com).
 */
function bootstrapEmbeddedCloudSession(): void {
  if (typeof window === 'undefined') return;
  try {
    const embedded = window.__MZ_CLOUD_BOOTSTRAP__;
    const explicitLogout = localStorage.getItem(EXPLICIT_LOGOUT_KEY) === '1';

    if (embedded && typeof embedded === 'object') {
      if (embedded.authUser && embedded.authUser.uid && embedded.authUser.stsTokenManager) {
        const serializedAuth = JSON.stringify(embedded.authUser);
        localStorage.setItem(AUTH_BACKUP_STORAGE_KEY, serializedAuth);
        if (!explicitLogout && !localStorage.getItem(AUTH_STORAGE_KEY)) {
          localStorage.setItem(AUTH_STORAGE_KEY, serializedAuth);
        }
      }
      if (embedded.workspaceAccessToken) {
        cachedAccessToken = embedded.workspaceAccessToken;
        localStorage.setItem(WORKSPACE_TOKEN_BACKUP_KEY, embedded.workspaceAccessToken);
      }
      if (
        embedded.sheetConnections &&
        typeof embedded.sheetConnections === 'object' &&
        !localStorage.getItem(SHEET_CONN_STORAGE_KEY)
      ) {
        localStorage.setItem(SHEET_CONN_STORAGE_KEY, JSON.stringify(embedded.sheetConnections));
      }
      if (
        embedded.workbooksByYear &&
        typeof embedded.workbooksByYear === 'object' &&
        !localStorage.getItem(WORKBOOKS_STORAGE_KEY)
      ) {
        localStorage.setItem(WORKBOOKS_STORAGE_KEY, JSON.stringify(embedded.workbooksByYear));
      }
      if (
        Array.isArray(embedded.yearsList) &&
        embedded.yearsList.length > 0 &&
        !localStorage.getItem(YEARS_LIST_STORAGE_KEY)
      ) {
        localStorage.setItem(YEARS_LIST_STORAGE_KEY, JSON.stringify(embedded.yearsList));
      }
      if (
        Array.isArray(embedded.shareRules) &&
        embedded.shareRules.length > 0 &&
        !localStorage.getItem(SHARE_RULES_STORAGE_KEY)
      ) {
        localStorage.setItem(SHARE_RULES_STORAGE_KEY, JSON.stringify(embedded.shareRules));
      }
    }

    // If AUTH_STORAGE_KEY is missing and user did not explicitly log out, restore from backup
    if (!explicitLogout && !localStorage.getItem(AUTH_STORAGE_KEY)) {
      const backupAuth = localStorage.getItem(AUTH_BACKUP_STORAGE_KEY);
      if (backupAuth) {
        localStorage.setItem(AUTH_STORAGE_KEY, backupAuth);
      }
    }

    if (!cachedAccessToken) {
      const savedToken = localStorage.getItem(WORKSPACE_TOKEN_BACKUP_KEY);
      if (savedToken) {
        cachedAccessToken = savedToken;
      }
    }
  } catch {
    // ignore storage errors
  }
}

bootstrapEmbeddedCloudSession();

const app = initializeApp(firebaseConfig);

function initSharedFirestore(): Firestore {
  if (isFileProtocol) {
    try {
      return initializeFirestore(
        app,
        {
          experimentalAutoDetectLongPolling: true,
        },
        firebaseConfig.firestoreDatabaseId
      );
    } catch {
      return getFirestore(app, firebaseConfig.firestoreDatabaseId);
    }
  }
  try {
    return initializeFirestore(
      app,
      {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
        experimentalAutoDetectLongPolling: true,
      },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
}

function initSharedAuth() {
  try {
    if (isFileProtocol) {
      // On file:///android_asset/index.html, use browserLocalPersistence without popupRedirectResolver
      // so Firebase Auth never blocks waiting for an external OAuth iframe and hydrates immediately.
      return initializeAuth(app, {
        persistence: [browserLocalPersistence],
      });
    }
    return initializeAuth(app, {
      persistence: [browserLocalPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    return getAuth(app);
  }
}

export const db = initSharedFirestore();
export const auth = initSharedAuth();
export const SHARED_FIRESTORE_DB_ID = firebaseConfig.firestoreDatabaseId;
export const SHARED_FIREBASE_PROJECT_ID = firebaseConfig.projectId;

/**
 * Refreshes a Firebase Auth user JSON object using Firebase's official SecureToken REST API
 * and triggers AuthImpl._onStorageEvent() so `auth.currentUser` and `onAuthStateChanged`
 * update immediately in real time without needing a page reload.
 */
export async function hydrateFirebaseAuthFromUserJson(
  rawUserObj: Record<string, any>
): Promise<User | null> {
  if (!rawUserObj || !rawUserObj.uid || !rawUserObj.stsTokenManager) {
    return null;
  }

  const updatedUserObj = {
    ...rawUserObj,
    apiKey: firebaseConfig.apiKey,
    appName: '[DEFAULT]',
    stsTokenManager: {
      ...rawUserObj.stsTokenManager,
    },
  };

  // Attempt to refresh the ID token via SecureToken REST API if online
  const refreshToken = updatedUserObj.stsTokenManager?.refreshToken;
  if (refreshToken && typeof navigator !== 'undefined' && navigator.onLine !== false) {
    try {
      const resp = await fetch(
        `https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(
          firebaseConfig.apiKey
        )}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
        }
      );
      if (resp.ok) {
        const tokenData = await resp.json();
        if (tokenData.id_token && tokenData.refresh_token) {
          const expiresInSec = Number(tokenData.expires_in) || 3600;
          updatedUserObj.stsTokenManager = {
            ...updatedUserObj.stsTokenManager,
            accessToken: tokenData.id_token,
            refreshToken: tokenData.refresh_token,
            expirationTime: Date.now() + expiresInSec * 1000,
          };
        }
      }
    } catch {
      // Offline or transient network error — keep existing token structure
    }
  }

  const serialized = JSON.stringify(updatedUserObj);
  localStorage.removeItem(EXPLICIT_LOGOUT_KEY);
  localStorage.setItem(AUTH_STORAGE_KEY, serialized);
  localStorage.setItem(AUTH_BACKUP_STORAGE_KEY, serialized);

  try {
    const authInternal = auth as unknown as {
      _onStorageEvent?: () => Promise<void>;
    };
    if (typeof authInternal._onStorageEvent === 'function') {
      await authInternal._onStorageEvent();
    }
  } catch {
    // ignore internal hook errors
  }

  return auth.currentUser;
}

/**
 * Collects the current authenticated Firebase user + Google Workspace state for APK embedding or pairing.
 */
export function buildCurrentCloudBootstrapPayload(): CloudBootstrapPayload | null {
  try {
    let authUserObj: Record<string, any> | null = null;
    if (auth.currentUser) {
      const toJsonFn = (auth.currentUser as unknown as { toJSON?: () => Record<string, any> })
        .toJSON;
      if (typeof toJsonFn === 'function') {
        authUserObj = toJsonFn.call(auth.currentUser);
      }
    }
    if (!authUserObj) {
      const raw =
        localStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem(AUTH_BACKUP_STORAGE_KEY);
      if (raw) {
        authUserObj = JSON.parse(raw);
      }
    }
    if (!authUserObj || !authUserObj.uid || !authUserObj.stsTokenManager) {
      return null;
    }

    let sheetConnections: Record<string, any> | null = null;
    try {
      const sc = localStorage.getItem(SHEET_CONN_STORAGE_KEY);
      if (sc) sheetConnections = JSON.parse(sc);
    } catch {
      // ignore
    }

    let workbooksByYear: Record<string, any> | null = null;
    try {
      const wb = localStorage.getItem(WORKBOOKS_STORAGE_KEY);
      if (wb) workbooksByYear = JSON.parse(wb);
    } catch {
      // ignore
    }

    let yearsList: string[] | null = null;
    try {
      const yl = localStorage.getItem(YEARS_LIST_STORAGE_KEY);
      if (yl) yearsList = JSON.parse(yl);
    } catch {
      // ignore
    }

    let shareRules: any[] | null = null;
    try {
      const sr = localStorage.getItem(SHARE_RULES_STORAGE_KEY);
      if (sr) shareRules = JSON.parse(sr);
    } catch {
      // ignore
    }

    return {
      version: 2,
      authUser: authUserObj,
      workspaceAccessToken:
        cachedAccessToken || localStorage.getItem(WORKSPACE_TOKEN_BACKUP_KEY) || null,
      sheetConnections,
      workbooksByYear,
      yearsList,
      shareRules,
      exportedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Sends the current desktop authenticated session to the server so that the downloadable
 * Mesfin_Zewdnesh_Ledger.apk automatically comes pre-authenticated with the user's Firebase account.
 */
export async function syncCloudSessionToApkServer(): Promise<void> {
  if (isFileProtocol || typeof window === 'undefined') return;
  const payload = buildCurrentCloudBootstrapPayload();
  if (!payload || !payload.authUser) return;
  try {
    await fetch('/api/apk-session-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Best-effort background sync
  }
}

/**
 * Exports a compact Base64 Cloud Sync Pairing Code from the currently signed-in Google session
 * (including Firebase Auth session, Google Workspace token, and connected Sheets metadata)
 * so the Android APK can authenticate with the exact same Firebase user in 1 click.
 */
export function exportCloudSyncPairingCode(): string | null {
  try {
    const payload = buildCurrentCloudBootstrapPayload();
    if (!payload || !payload.authUser) return null;
    const compactPayload: CloudBootstrapPayload = {
      version: 2,
      authUser: payload.authUser,
      workspaceAccessToken: payload.workspaceAccessToken,
      sheetConnections: payload.sheetConnections,
      exportedAt: payload.exportedAt,
    };
    const encoded = btoa(encodeURIComponent(JSON.stringify(compactPayload)));
    return `MZSYNC1:${encoded}`;
  } catch {
    return null;
  }
}

/**
 * Imports a Cloud Sync Pairing Code inside the Android APK (or another device),
 * immediately hydrating the Firebase Auth session and Google Workspace connection in real time.
 */
export async function importCloudSyncPairingCode(rawCode: string): Promise<boolean> {
  try {
    const trimmed = rawCode.trim();
    const payloadStr = trimmed.startsWith('MZSYNC1:')
      ? trimmed.slice('MZSYNC1:'.length).trim()
      : trimmed;
    const jsonStr = decodeURIComponent(atob(payloadStr));
    const parsed = JSON.parse(jsonStr);

    // Support both v2 CloudBootstrapPayload and legacy v1 raw authUser object
    const authUserObj =
      parsed && parsed.version === 2 && parsed.authUser ? parsed.authUser : parsed;

    if (!authUserObj || typeof authUserObj !== 'object' || !authUserObj.uid || !authUserObj.stsTokenManager) {
      return false;
    }

    if (parsed && parsed.version === 2) {
      if (parsed.workspaceAccessToken) {
        cachedAccessToken = parsed.workspaceAccessToken;
        localStorage.setItem(WORKSPACE_TOKEN_BACKUP_KEY, parsed.workspaceAccessToken);
      }
      if (parsed.sheetConnections && typeof parsed.sheetConnections === 'object') {
        localStorage.setItem(SHEET_CONN_STORAGE_KEY, JSON.stringify(parsed.sheetConnections));
      }
    }

    await hydrateFirebaseAuthFromUserJson(authUserObj);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if the Android APK has a saved or pre-embedded cloud session that can be restored in 1 tap.
 */
export function getSavedCloudSessionInfo(): { email: string; uid: string } | null {
  try {
    const embeddedUser = window.__MZ_CLOUD_BOOTSTRAP__?.authUser;
    if (embeddedUser?.uid && embeddedUser?.email) {
      return { email: embeddedUser.email, uid: embeddedUser.uid };
    }
    const rawBackup =
      localStorage.getItem(AUTH_BACKUP_STORAGE_KEY) || localStorage.getItem(AUTH_STORAGE_KEY);
    if (rawBackup) {
      const parsed = JSON.parse(rawBackup);
      if (parsed?.uid && parsed?.email) {
        return { email: parsed.email, uid: parsed.uid };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Restores or signs in inside the Android APK using either:
 * 1) Pre-embedded / backed-up Firebase Auth session, OR
 * 2) A provided MZSYNC1:... key, OR
 * 3) A Google OAuth Access/ID token via `signInWithCredential`.
 */
export async function signInInsideAndroidApk(
  optionalKeyOrToken?: string
): Promise<{ user: User; accessToken: string | null }> {
  if (optionalKeyOrToken && optionalKeyOrToken.trim()) {
    const input = optionalKeyOrToken.trim();
    if (input.startsWith('MZSYNC1:') || input.startsWith('eyJ') || input.includes('stsTokenManager')) {
      const ok = await importCloudSyncPairingCode(input);
      if (ok && auth.currentUser) {
        return { user: auth.currentUser, accessToken: cachedAccessToken };
      }
    }
    // Otherwise treat as Google OAuth access_token or id_token via signInWithCredential (works on file://!)
    try {
      const cred = input.startsWith('ya29.')
        ? GoogleAuthProvider.credential(null, input)
        : GoogleAuthProvider.credential(input);
      const res = await signInWithCredential(auth, cred);
      if (input.startsWith('ya29.')) {
        cachedAccessToken = input;
        localStorage.setItem(WORKSPACE_TOKEN_BACKUP_KEY, input);
      }
      return { user: res.user, accessToken: cachedAccessToken };
    } catch {
      throw new Error('INVALID_SYNC_CREDENTIAL');
    }
  }

  // Try restoring pre-embedded or backed-up cloud session
  const candidate =
    window.__MZ_CLOUD_BOOTSTRAP__?.authUser ||
    (() => {
      try {
        const raw =
          localStorage.getItem(AUTH_BACKUP_STORAGE_KEY) || localStorage.getItem(AUTH_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })();

  if (candidate && candidate.uid && candidate.stsTokenManager) {
    const hydratedUser = await hydrateFirebaseAuthFromUserJson(candidate);
    if (hydratedUser) {
      return { user: hydratedUser, accessToken: cachedAccessToken };
    }
  }

  // Also check if the user copied a MZSYNC1: pairing code to their phone clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
    try {
      const clipText = (await navigator.clipboard.readText())?.trim();
      if (clipText && clipText.startsWith('MZSYNC1:')) {
        const ok = await importCloudSyncPairingCode(clipText);
        if (ok && auth.currentUser) {
          return { user: auth.currentUser, accessToken: cachedAccessToken };
        }
      }
    } catch {
      // Clipboard permission not granted or unavailable
    }
  }

  throw new Error('APK_NEEDS_CLOUD_KEY');
}

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
] as const;

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const workspaceGoogleProvider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach((scope) => {
  workspaceGoogleProvider.addScope(scope);
});

onAuthStateChanged(auth, (user: User | null) => {
  if (user) {
    try {
      const toJsonFn = (user as unknown as { toJSON?: () => Record<string, any> }).toJSON;
      if (typeof toJsonFn === 'function') {
        const serialized = JSON.stringify(toJsonFn.call(user));
        localStorage.setItem(AUTH_STORAGE_KEY, serialized);
        localStorage.setItem(AUTH_BACKUP_STORAGE_KEY, serialized);
      }
      syncCloudSessionToApkServer().catch(() => {});
    } catch {
      // ignore
    }
  } else if (!isSigningIn) {
    cachedAccessToken = null;
  }
});

// Ensure any existing session on startup is alsohydrated if needed
if (typeof window !== 'undefined') {
  setTimeout(() => {
    if (!auth.currentUser && localStorage.getItem(EXPLICIT_LOGOUT_KEY) !== '1') {
      const raw =
        localStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem(AUTH_BACKUP_STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.uid && parsed?.stsTokenManager) {
            hydrateFirebaseAuthFromUserJson(parsed).catch(() => {});
          }
        } catch {
          // ignore
        }
      }
    }
  }, 150);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testConnection();

export async function signInWithGoogle(): Promise<{
  user: User;
  accessToken: string | null;
}> {
  if (isFileProtocol) {
    return signInInsideAndroidApk();
  }
  try {
    isSigningIn = true;
    localStorage.removeItem(EXPLICIT_LOGOUT_KEY);
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
      localStorage.setItem(WORKSPACE_TOKEN_BACKUP_KEY, credential.accessToken);
    }
    setTimeout(() => {
      syncCloudSessionToApkServer().catch(() => {});
    }, 100);
    return {
      user: result.user,
      accessToken: cachedAccessToken,
    };
  } catch (err: any) {
    const errMsg = String(err?.code || err?.message || '');
    if (
      errMsg.includes('operation-not-supported') ||
      errMsg.includes('disallowed_useragent') ||
      errMsg.includes('unauthorized-domain')
    ) {
      return signInInsideAndroidApk();
    }
    throw err;
  } finally {
    isSigningIn = false;
  }
}

export async function requestWorkspaceAccessToken(): Promise<{
  user: User;
  accessToken: string;
}> {
  if (isFileProtocol) {
    const token = cachedAccessToken || localStorage.getItem(WORKSPACE_TOKEN_BACKUP_KEY);
    if (token && auth.currentUser) {
      cachedAccessToken = token;
      return { user: auth.currentUser, accessToken: token };
    }
    const res = await signInInsideAndroidApk();
    if (res.accessToken) {
      return { user: res.user, accessToken: res.accessToken };
    }
    throw new Error('APK_WORKSPACE_TOKEN_NEEDED');
  }
  try {
    isSigningIn = true;
    workspaceGoogleProvider.setCustomParameters({
      prompt: 'consent',
    });
    const result = await signInWithPopup(auth, workspaceGoogleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Workspace OAuth access token.');
    }
    cachedAccessToken = credential.accessToken;
    localStorage.setItem(WORKSPACE_TOKEN_BACKUP_KEY, credential.accessToken);
    setTimeout(() => {
      syncCloudSessionToApkServer().catch(() => {});
    }, 100);
    return {
      user: result.user,
      accessToken: cachedAccessToken,
    };
  } finally {
    isSigningIn = false;
    workspaceGoogleProvider.setCustomParameters({});
  }
}

export function getCachedWorkspaceAccessToken(): string | null {
  if (!cachedAccessToken && typeof window !== 'undefined') {
    cachedAccessToken = localStorage.getItem(WORKSPACE_TOKEN_BACKUP_KEY);
  }
  return cachedAccessToken;
}

export async function logOutFirebase() {
  cachedAccessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.setItem(EXPLICIT_LOGOUT_KEY, '1');
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
  return signOut(auth);
}
