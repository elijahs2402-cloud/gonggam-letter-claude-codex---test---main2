import { getCurrentUserId } from "./letters";

/**
 * Prototype-only authentication state. Replace this module with the real
 * authentication/session client when the production service is connected.
 * No credentials, provider tokens, email addresses, or real names are stored.
 */
export type MockAuthState =
  | "logged_out"
  | "logging_in"
  | "new_user"
  | "existing_user"
  | "login_failed"
  | "logged_in"
  | "withdrawn";

export type MockAuthProvider = "apple" | "google" | "kakao";

export type MockUserAccount = {
  id: string;
  authProvider: MockAuthProvider;
  anonymousName?: string;
  onboardingCompleted: boolean;
  termsAccepted: boolean;
  ageConfirmed: boolean;
};

export type MockAuthSnapshot = {
  state: MockAuthState;
  account?: MockUserAccount;
  pendingProvider?: MockAuthProvider;
  loginMode?: "new" | "existing" | "failure";
};

const AUTH_KEY = "gonggam_mock_auth_v1";
const ONBOARDING_KEY = "gonggam_onboarding_v1";
const RETURN_PATH_KEY = "gonggam_mock_auth_return_path_v1";

const firstWords = ["조용한", "다정한", "포근한", "잔잔한", "느린", "따뜻한", "작은", "고요한"];
const secondWords = ["별빛", "구름", "등불", "나무", "호수", "바람", "새벽", "편지"];

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJson<T>(key: string): T | undefined {
  if (!canUseStorage()) return undefined;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : undefined;
  } catch {
    return undefined;
  }
}

function writeJson(key: string, value: unknown) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The prototype remains usable when browser storage is unavailable.
  }
}

function removeStorageItem(key: string) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // The prototype remains usable when browser storage is unavailable.
  }
}

function isProvider(value: unknown): value is MockAuthProvider {
  return value === "apple" || value === "google" || value === "kakao";
}

function normalizeAccount(value: unknown): MockUserAccount | undefined {
  if (!value || typeof value !== "object") return undefined;
  const account = value as Partial<MockUserAccount>;
  if (typeof account.id !== "string" || !isProvider(account.authProvider)) return undefined;
  return {
    id: account.id,
    authProvider: account.authProvider,
    anonymousName: typeof account.anonymousName === "string" ? account.anonymousName : undefined,
    onboardingCompleted: Boolean(account.onboardingCompleted),
    termsAccepted: Boolean(account.termsAccepted),
    ageConfirmed: Boolean(account.ageConfirmed),
  };
}

export function getMockAuthSnapshot(): MockAuthSnapshot {
  const stored = readJson<Partial<MockAuthSnapshot>>(AUTH_KEY);
  const account = normalizeAccount(stored?.account ?? readJson<unknown>(ONBOARDING_KEY));
  const state: MockAuthState = ["logged_out", "logging_in", "new_user", "existing_user", "login_failed", "logged_in", "withdrawn"].includes(stored?.state ?? "")
    ? stored!.state as MockAuthState
    : "logged_out";
  return {
    state,
    account,
    pendingProvider: isProvider(stored?.pendingProvider) ? stored.pendingProvider : undefined,
    loginMode: stored?.loginMode === "new" || stored?.loginMode === "existing" || stored?.loginMode === "failure" ? stored.loginMode : undefined,
  };
}

function saveSnapshot(snapshot: MockAuthSnapshot) {
  writeJson(AUTH_KEY, snapshot);
  if (snapshot.account) writeJson(ONBOARDING_KEY, snapshot.account);
}

export function setMockLoginMode(loginMode: "new" | "existing" | "failure") {
  const snapshot = getMockAuthSnapshot();
  saveSnapshot({ ...snapshot, state: "logged_out", loginMode, pendingProvider: undefined });
}

export function beginMockLogin(provider: MockAuthProvider) {
  const snapshot = getMockAuthSnapshot();
  const fallbackMode = snapshot.account?.onboardingCompleted ? "existing" : "new";
  saveSnapshot({ ...snapshot, state: "logging_in", pendingProvider: provider, loginMode: snapshot.loginMode ?? fallbackMode });
}

export function cancelMockLogin() {
  const snapshot = getMockAuthSnapshot();
  saveSnapshot({ ...snapshot, state: "logged_out", pendingProvider: undefined });
}

export function retryMockLogin() {
  const snapshot = getMockAuthSnapshot();
  const loginMode = snapshot.account?.onboardingCompleted ? "existing" : "new";
  saveSnapshot({ ...snapshot, state: "logged_out", pendingProvider: undefined, loginMode });
}

export function resolveMockLogin() {
  const snapshot = getMockAuthSnapshot();
  const provider = snapshot.pendingProvider ?? "apple";
  const mode = snapshot.loginMode ?? (snapshot.account?.onboardingCompleted ? "existing" : "new");
  if (mode === "failure") {
    saveSnapshot({ ...snapshot, state: "login_failed", pendingProvider: undefined });
    return getMockAuthSnapshot();
  }

  // Keep the existing local user id so prior letters, drafts, reports, blocks,
  // and sealed excerpts remain attached to this prototype account.
  const account: MockUserAccount = mode === "existing"
    ? snapshot.account
      ? { ...snapshot.account, authProvider: provider, onboardingCompleted: true, termsAccepted: true, ageConfirmed: true }
      : {
        // A ready-to-use account is seeded only for the explicit prototype
        // test branch; it still reuses the existing local record owner id.
        id: getCurrentUserId(),
        authProvider: provider,
        anonymousName: generateAnonymousName(),
        onboardingCompleted: true,
        termsAccepted: true,
        ageConfirmed: true,
      }
    : {
      id: getCurrentUserId(),
      authProvider: provider,
      onboardingCompleted: false,
      termsAccepted: false,
      ageConfirmed: false,
    };
  // Existing users are ready for protected routes immediately after mock login.
  saveSnapshot({ state: mode === "existing" ? "logged_in" : "new_user", account, loginMode: mode });
  return getMockAuthSnapshot();
}

export function acceptTerms() {
  const snapshot = getMockAuthSnapshot();
  if (!snapshot.account) return;
  const account = { ...snapshot.account, termsAccepted: true, ageConfirmed: true };
  saveSnapshot({ ...snapshot, state: "new_user", account });
}

export function generateAnonymousName(previous?: string) {
  const candidates = firstWords.flatMap((first) => secondWords.map((second) => `${first} ${second}`));
  const available = candidates.filter((name) => name !== previous);
  return available[Math.floor(Math.random() * available.length)] ?? "조용한 별빛";
}

export function confirmAnonymousName(anonymousName: string) {
  const snapshot = getMockAuthSnapshot();
  if (!snapshot.account || !snapshot.account.termsAccepted || !snapshot.account.ageConfirmed) return;
  const account: MockUserAccount = { ...snapshot.account, anonymousName, onboardingCompleted: true };
  saveSnapshot({ ...snapshot, state: "logged_in", account, pendingProvider: undefined });
}

/** Updates only the current mock account. Existing letter/reply records retain their stored name. */
export function updateAnonymousName(anonymousName: string) {
  const snapshot = getMockAuthSnapshot();
  if (!snapshot.account || !anonymousName.trim()) return undefined;
  const account = { ...snapshot.account, anonymousName: anonymousName.trim() };
  saveSnapshot({ ...snapshot, state: "logged_in", account });
  return account;
}

export function getCurrentAnonymousName() {
  return getMockAuthSnapshot().account?.anonymousName ?? "조용한 별빛";
}

export function getPostLoginPath(fallback = "/home") {
  if (!canUseStorage()) return fallback;
  const path = window.localStorage.getItem(RETURN_PATH_KEY);
  window.localStorage.removeItem(RETURN_PATH_KEY);
  return path?.startsWith("/") ? path : fallback;
}

export function setPostLoginPath(path: string) {
  if (!canUseStorage() || !path.startsWith("/")) return;
  try { window.localStorage.setItem(RETURN_PATH_KEY, path); } catch { /* no-op */ }
}

export function logoutMockAccount() {
  const snapshot = getMockAuthSnapshot();
  saveSnapshot({
    ...snapshot,
    state: "logged_out",
    pendingProvider: undefined,
    loginMode: snapshot.account?.onboardingCompleted ? "existing" : snapshot.loginMode,
  });
  removeStorageItem(RETURN_PATH_KEY);
}

export function deleteMockAccount() {
  const snapshot = getMockAuthSnapshot();
  // Prototype-only: disconnect access without deleting local inspection data.
  saveSnapshot({ ...snapshot, state: "withdrawn", pendingProvider: undefined });
  removeStorageItem(RETURN_PATH_KEY);
}

export function getOnboardingNextPath() {
  const snapshot = getMockAuthSnapshot();
  if (!snapshot.account || !["new_user", "existing_user", "logged_in"].includes(snapshot.state)) return "/login";
  if (!snapshot.account.termsAccepted || !snapshot.account.ageConfirmed) return "/terms-consent";
  if (!snapshot.account.anonymousName || !snapshot.account.onboardingCompleted) return "/nickname-entry";
  return undefined;
}

export function isMockAuthenticated() {
  const snapshot = getMockAuthSnapshot();
  return snapshot.state === "logged_in" && Boolean(snapshot.account?.onboardingCompleted);
}
