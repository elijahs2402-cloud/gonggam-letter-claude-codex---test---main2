import { getCurrentUserId, resetCurrentUserId } from "./letters";
import { resetSampleLetters } from "./sampleLetters";

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

/* 익명 이름 사전.
   이름 개수는 목록 길이의 '곱'이라, 단어를 조금 늘리면 개수는 크게 불어난다.
   (앞의 8개 × 8개 = 64개였던 것을 40개 × 40개 = 1,600개로 넓혔다.)

   글자수 규칙: 입력칸이 maxLength={10} 이므로 완성된 이름이 10자를 넘으면 안 된다.
   공백 1자를 빼면 두 단어에 8자를 쓸 수 있다. 여기서는 한 단어를 4자 이내로
   묶어 최악의 경우(4+1+4)에도 9자로 여유를 한 자 남긴다.
   실제 최대 글자수는 아래 generateAnonymousName 의 길이 검사로도 한 번 더 막는다. */

// 틀 1 — "형용사 + 명사" (조용한 별빛). 앞 8개는 원래 있던 단어로, 나머지 32개의
// 결을 정하는 기준이다. 조합이 1,600가지라 어떤 명사와 붙어도 어색하지 않은,
// 분위기·감촉을 가리키는 말만 골랐다.
const firstWords = [
  "조용한", "다정한", "포근한", "잔잔한", "느린", "따뜻한", "작은", "고요한",
  "차분한", "은은한", "아득한", "그리운", "수줍은", "정다운", "반가운", "살가운",
  "편안한", "넉넉한", "깊은", "맑은", "여린", "옅은", "짙은", "오랜",
  "나직한", "산뜻한", "보드라운", "부드러운", "소중한", "어여쁜", "애틋한", "다감한",
  "흐릿한", "자그만", "오붓한", "호젓한", "아늑한", "담담한", "한적한", "은근한",
];

const secondWords = [
  "별빛", "구름", "등불", "나무", "호수", "바람", "새벽", "편지",
  "달빛", "햇살", "노을", "안개", "이슬", "물결", "오솔길", "창가",
  "골목", "언덕", "들판", "숲길", "밤길", "눈길", "빗소리", "파도",
  "갈대", "낙엽", "씨앗", "새싹", "우물", "나룻배", "종소리", "발자국",
  "책갈피", "담요", "온기", "숨결", "목소리", "그림자", "물빛", "별자리",
];

// 틀 2 — "때·자리 + 의 + 명사" (밤의 등불).
// 틀이 하나뿐이면 이름이 1,600개여도 리듬이 전부 같아 '많다'가 체감되지 않는다.
// 두 번째 명사는 'X의 Y'로 읽었을 때 자연스러운 것만 따로 추렸다
// (secondWords 를 그대로 쓰면 "밤의 담요" 같은 어색한 짝이 생긴다).
const placeWords = [
  "밤", "새벽", "아침", "저녁", "한낮", "봄", "여름", "가을",
  "겨울", "창가", "숲", "들녘", "강가", "바다", "언덕",
];

const boundWords = [
  "등불", "별빛", "달빛", "편지", "바람", "노을", "물결", "숨결",
  "온기", "그림자", "발자국", "종소리", "빗소리", "목소리", "안개", "이슬",
  "새싹", "오솔길", "나룻배", "책갈피",
];

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

const MAX_ANONYMOUS_NAME_LENGTH = 10;
// 최근에 내준 이름 몇 개를 기억할지. 직전 하나만 피하면 여러 번 눌렀을 때
// 두세 번 전 이름이 돌아오는데, 사람 눈에는 짧은 구간의 반복이 유독 잘 보인다.
const RECENT_NAME_LIMIT = 10;
const recentNames: string[] = [];

const PATTERN_1_COUNT = firstWords.length * secondWords.length;
const PATTERN_2_COUNT = placeWords.length * boundWords.length;
const NAME_COUNT = PATTERN_1_COUNT + PATTERN_2_COUNT;

/* 번호 하나를 이름 하나로 바꾼다.
   예전에는 조합을 전부 펼친 배열을 만들어 거기서 골랐는데, 그러면 버튼을 누를
   때마다 1,900칸짜리 배열을 새로 만들게 된다. 앞뒤 단어의 번호만 계산하면
   사전이 아무리 커져도 비용이 같다. */
function nameAt(index: number) {
  if (index < PATTERN_1_COUNT) {
    const first = firstWords[Math.floor(index / secondWords.length)];
    const second = secondWords[index % secondWords.length];
    return `${first} ${second}`;
  }

  const rest = index - PATTERN_1_COUNT;
  const place = placeWords[Math.floor(rest / boundWords.length)];
  const bound = boundWords[rest % boundWords.length];
  return `${place}의 ${bound}`;
}

/** 사전에 담긴 모든 이름. 검증용이며 화면에서는 쓰지 않는다. */
export function listAllAnonymousNames() {
  return Array.from({ length: NAME_COUNT }, (_, index) => nameAt(index));
}

export function generateAnonymousName(previous?: string) {
  const avoid = new Set(recentNames);
  if (previous) avoid.add(previous);

  // 무작위 지점에서 시작해 조건에 맞는 첫 이름을 집는다. 피할 이름이 많아야
  // 11개라 사실상 첫 번째에 끝나지만, 한 바퀴를 도는 형태라 사전이 거의 다
  // 소진된 상황에서도 반드시 답을 내놓는다(무한 반복이 생기지 않는다).
  const start = Math.floor(Math.random() * NAME_COUNT);
  for (let step = 0; step < NAME_COUNT; step += 1) {
    const name = nameAt((start + step) % NAME_COUNT);
    // 사전을 넓히다 긴 단어가 섞여도 잘린 이름이 나가지 않게 여기서 막는다.
    if (name.length > MAX_ANONYMOUS_NAME_LENGTH) continue;
    if (avoid.has(name)) continue;

    recentNames.push(name);
    if (recentNames.length > RECENT_NAME_LIMIT) recentNames.shift();
    return name;
  }

  return "조용한 별빛";
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
  // 계정을 지우면 다시 들어올 때 처음 온 사람과 같아진다.
  // 예전엔 account 를 남겨둬는데, onboardingCompleted 가 true 로 남아
  // 인트로에서 바로 로그인으로 빠지고, 로그인하면 약관·이름 단계를
  // 건너뛰어 삭제했던 이름으로 홈에 들어갔다.
  // 편지·초안·신고 기록은 다른 저장소(gonggam_letters_v1 등)에 있어
  // 여기서 계정을 지워도 프로토타입 점검용 데이터는 그대로 남는다.
  saveSnapshot({ ...snapshot, state: "withdrawn", account: undefined, loginMode: undefined, pendingProvider: undefined });
  // 스냅샷에서 계정을 지워도 getMockAuthSnapshot() 이 ONBOARDING_KEY 에서 되읽어온다.
  // (stored?.account ?? readJson(ONBOARDING_KEY)) — 그래서 삭제 후 다시 로그인하면
  // 지운 계정이 살아나 약관·이름을 건너뛰고 옆 이름으로 홈에 들어갔다.
  removeStorageItem(ONBOARDING_KEY);
  removeStorageItem(RETURN_PATH_KEY);
  resetCurrentUserId();
  resetSampleLetters();
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
