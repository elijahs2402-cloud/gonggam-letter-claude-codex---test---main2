export function getCurrentAppPath() {
  if (window.location.protocol === "file:") {
    const hashRoute = window.location.hash.replace(/^#/, "").split("?")[0];
    return hashRoute.replace(/\/$/, "") || "/intro";
  }

  return window.location.pathname.replace(/\/$/, "") || "/intro";
}

export function getCurrentAppSearchParams() {
  if (window.location.protocol === "file:") {
    const query = window.location.hash.split("?")[1] ?? "";
    return new URLSearchParams(query);
  }

  return new URLSearchParams(window.location.search);
}

let isPageNavigationInProgress = false;
let pageNavigationTimer: number | null = null;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getCurrentPage() {
  return document.querySelector<HTMLElement>(".mobile-prototype");
}

function getExitDuration(page: HTMLElement | null) {
  if (!page || prefersReducedMotion()) return 0;

  const duration = Number.parseFloat(
    window.getComputedStyle(page).getPropertyValue("--page-exit-duration"),
  );

  return Number.isFinite(duration) ? duration : 180;
}

function resetPageTransition() {
  isPageNavigationInProgress = false;
  if (pageNavigationTimer !== null) {
    window.clearTimeout(pageNavigationTimer);
    pageNavigationTimer = null;
  }

  const page = getCurrentPage();
  page?.classList.remove("is-page-leaving", "is-pushed-away", "is-popped-away");
  page?.removeAttribute("aria-busy");
}

// 나의 공간 목록에서 항목 상세로 들어갈 때만 '밀고 들어오기' 모션을 쓴다.
// 이 목록 자체는 항상 같아서 route.ts 쪽을 건드리지 않고 여기 하드코딩해도
// 안전하다. 바텀 내비게이션으로 홈·편지함 등 다른 곳으로 가는 경우는
// my-space-screen 이 나가는 화면이어도 이 목록에 없어 기본 모션을 쓴다.
const MY_SPACE_DETAIL_PATHS = new Set([
  "/anonymous-name-settings",
  "/account-settings",
  "/notification-settings",
  "/safety-management",
  "/service-guide",
  "/privacy-policy",
  "/terms-of-service",
]);

// 위 목록과 같은 화면들을, 이번엔 경로가 아니라 각 화면 루트에 붙는
// 클래스명으로 다시 적어둔다. navigateBack() 은 '지금 어느 화면을 떠나는지'를
// 클래스로만 판별할 수 있어(경로는 이미 fallback 하나 "/my-space" 뿐이라
// 구분이 안 된다) 별도 목록이 필요하다.
//
// account-settings-screen · guide-screen · terms-screen 은 bare 클래스로 두면
// 각각 계정 삭제 흐름 · 안전 안내(/safety-guide) · 온보딩 약관 동의 화면과도
// 겹친다(index.css 의 같은 목록에 적힌 사연 참고). 여기서도 같은 전용 클래스
// (--figma, --my-space)로 좁혀 CSS 쪽과 판단 기준을 맞춘다.
const MY_SPACE_DETAIL_CLASSES = [
  "nef-screen",
  "account-settings-screen--figma",
  "notification-settings-screen",
  "safety-management-screen",
  "guide-screen--my-space",
  "privacy-policy-screen",
  "terms-screen--my-space",
];

function markPushTransition(page: HTMLElement | null, destination: string) {
  if (!page) return;
  if (page.classList.contains("my-space-screen") && MY_SPACE_DETAIL_PATHS.has(destination)) {
    page.classList.add("is-pushed-away");
  }
}

// '깊이가 하나 더 있는' 밀고 들어오기 쌍. 나의 공간 → 상세 화면 말고도,
// 계정 관리 → 계정 삭제(/account-withdrawal)도 같은 구조다: 상세 화면을
// 나와 정확히 이 fallback 으로 돌아갈 때만 반대 방향(pop)을 쓴다.
// fromClasses 는 그 상세 화면 루트에 붙는 클래스명들이다.
const POP_PAIRS: ReadonlyArray<{ fallbackPath: string; fromClasses: readonly string[] }> = [
  { fallbackPath: "/my-space", fromClasses: MY_SPACE_DETAIL_CLASSES },
  { fallbackPath: "/account-settings", fromClasses: ["account-withdrawal-screen"] },
];

// 나의 공간 상세 화면(또는 계정 삭제 화면)을 떠나 각각의 짝이 되는 목록으로
// 돌아가는 경우에만 참이다. 이때는 들어올 때와 반대 방향(오른쪽으로 나가기 /
// 왼쪽에서 들어오기)을 쓴다.
function isPoppingBack(page: HTMLElement | null, fallbackPath: string) {
  if (!page) return false;
  return POP_PAIRS.some(
    (pair) => pair.fallbackPath === fallbackPath && pair.fromClasses.some((cls) => page.classList.contains(cls)),
  );
}

// history.back() 은 bfcache 로 복원될 수 있는데, 그러면 이미 한 번 끝난
// CSS 진입 애니메이션이 다시 재생되지 않아 모션이 매번 다르게(또는 아예
// 안 보이게) 나온다. 이 세션스토리지 표시를 도착 화면이 마운트될 때 읽어
// (MySpaceScreen.tsx, AccountSettingsScreen) 진입 애니메이션을 켤지 정한다 —
// 새로 불러오기라 매번 확실히 재생된다. 한 번에 한 화면만 새로 마운트되므로
// 목적지가 둘이어도 플래그 하나면 충분하다.
const POP_ENTRY_FLAG_KEY = "gonggam:pop-entry";

export function markPopEntry() {
  try {
    window.sessionStorage.setItem(POP_ENTRY_FLAG_KEY, "1");
  } catch {
    // 세션스토리지를 못 쓰는 환경에서는 그냥 기본 모션으로 들어온다.
  }
}

export function consumePopEntry() {
  try {
    const flagged = window.sessionStorage.getItem(POP_ENTRY_FLAG_KEY) === "1";
    if (flagged) window.sessionStorage.removeItem(POP_ENTRY_FLAG_KEY);
    return flagged;
  } catch {
    return false;
  }
}

function leavePage(complete: () => void) {
  if (isPageNavigationInProgress) return;

  isPageNavigationInProgress = true;
  const page = getCurrentPage();
  const exitDuration = getExitDuration(page);

  if (!page || exitDuration === 0) {
    complete();
    return;
  }

  page.classList.add("is-page-leaving");
  page.setAttribute("aria-busy", "true");
  pageNavigationTimer = window.setTimeout(complete, exitDuration);
}

function isCurrentDestination(path: string) {
  if (window.location.protocol === "file:") {
    return window.location.hash.replace(/^#/, "") === path;
  }

  const destination = new URL(path, window.location.origin);
  return destination.pathname === window.location.pathname && destination.search === window.location.search;
}

function canGoBackInApp() {
  return (
    document.referrer !== "" &&
    new URL(document.referrer).origin === window.location.origin &&
    window.history.length > 1
  );
}

window.addEventListener("pageshow", resetPageTransition);

export function navigateTo(path: string) {
  if (isPageNavigationInProgress || isCurrentDestination(path)) return;

  // 셸 안에서 갈 수 있는 곳이면 페이지를 새로 불러오지 않는다.
  if (shellRouter?.go(path)) return;

  markPushTransition(getCurrentPage(), path);

  leavePage(() => {
    if (window.location.protocol === "file:") {
      window.location.hash = path;
      window.location.reload();
      return;
    }

    window.location.href = path;
  });
}

export function replaceRoute(path: string) {
  if (isCurrentDestination(path)) return;

  if (window.location.protocol === "file:") {
    window.location.hash = path;
    window.location.reload();
    return;
  }

  window.location.replace(path);
}

// 한 화면 안에서 하위 뷰를 state 로 전환하는 '셸' 화면(나의 공간)이 등록해 둔다.
// 하위 화면들은 저마다 navigateTo("/account-withdrawal") 나
// navigateBack("/my-space") 를 부르는데, 여기서 가로채면 그 화면들을 하나도
// 건드리지 않고도 페이지 이동 대신 셸 안에서 전환할 수 있다.
// go/back 은 자기가 처리했으면 true 를 준다 — false 면 평소대로 페이지가 이동한다.
type ShellRouter = {
  go: (path: string) => boolean;
  back: (fallbackPath: string) => boolean;
};

let shellRouter: ShellRouter | null = null;

export function registerShellRouter(router: ShellRouter) {
  shellRouter = router;
  return () => {
    if (shellRouter === router) shellRouter = null;
  };
}

export function navigateBack(fallbackPath: string) {
  if (isPageNavigationInProgress) return;

  // 셸이 처리할 수 있으면 페이지를 새로 불러오지 않고 셸에게 넘긴다.
  if (shellRouter?.back(fallbackPath)) return;

  const page = getCurrentPage();

  if (isPoppingBack(page, fallbackPath)) {
    // history.back() 이 아니라 항상 새로 불러온다 — bfcache 로 조용히
    // 복원되면 아래 pop-in 애니메이션이 재생되지 않기 때문이다. navigateTo()
    // 를 재사용하지 않는 이유: 그 함수도 내부에서 leavePage() 를 다시 부르는데,
    // 지금 이 함수가 이미 leavePage() 를 호출해 isPageNavigationInProgress 를
    // true 로 만들어둔 뒤라 navigateTo() 의 가드에 걸려 아무 일도 안 일어난다.
    page?.classList.add("is-popped-away");
    markPopEntry();
    leavePage(() => {
      if (window.location.protocol === "file:") {
        window.location.hash = fallbackPath;
        window.location.reload();
        return;
      }
      window.location.href = fallbackPath;
    });
    return;
  }

  if (!canGoBackInApp()) {
    navigateTo(fallbackPath);
    return;
  }

  leavePage(() => window.history.back());
}

export function replaceAppState(state: string) {
  if (window.location.protocol === "file:") {
    const params = getCurrentAppSearchParams();
    params.set("state", state);
    window.history.replaceState({}, "", `#${getCurrentAppPath()}?${params.toString()}`);
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set("state", state);
  window.history.replaceState({}, "", url);
}
