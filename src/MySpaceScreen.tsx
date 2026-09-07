import { useEffect, useRef, useState } from "react";
import { AppBottomNavigation } from "./AppBottomNavigation";
import { consumePopEntry, getCurrentAppPath, registerShellRouter } from "./navigation";
import { AnonymousNameSettingsScreen, GuideScreen, PolicyScreen, getMySpaceSummary } from "./MySpaceDetails";
import { AccountSettingsScreen, AccountWithdrawalScreen } from "./AccountManagementScreens";
import { NotificationSettingsScreen } from "./NotificationScreens";
import { SafetyManagementScreen } from "./ReportScreens";
import { TermsMockupScreen } from "./TermsMockup";
import { isPrototypeQaMode } from "./prototypeQa";

type TestState = "normal" | "loading" | "error" | "partial-error";
type ViewKey =
  | "list"
  | "nickname"
  | "account"
  | "notification"
  | "safety"
  | "guide"
  | "privacy"
  | "terms"
  | "withdrawal";

const menuItems: ReadonlyArray<{ label: string; path: string; key: ViewKey }> = [
  { label: "나의 이름", path: "/anonymous-name-settings", key: "nickname" },
  { label: "계정 관리", path: "/account-settings", key: "account" },
  { label: "알림 설정", path: "/notification-settings", key: "notification" },
  { label: "차단 및 신고 관리", path: "/safety-management", key: "safety" },
  { label: "이용 안내", path: "/service-guide", key: "guide" },
  { label: "개인정보 처리방침", path: "/privacy-policy", key: "privacy" },
  { label: "서비스 이용약관", path: "/terms-of-service", key: "terms" },
];

// 셸이 스스로 처리하는 경로들. 계정 삭제는 목록에 없는 한 단계 더 깊은 곳이라
// 메뉴가 아니라 계정 관리 화면 안에서 열린다.
const PATH_TO_VIEW = new Map<string, ViewKey>([
  ...menuItems.map((item) => [item.path, item.key] as const),
  ["/account-withdrawal", "withdrawal"] as const,
]);

const VIEW_TO_PATH = new Map<ViewKey, string>(
  [...PATH_TO_VIEW].map(([path, view]) => [view, path]),
);

// 뒤로/앞으로 어느 쪽인지 판단하는 기준. 깊이가 얕아지면 back 이다.
const VIEW_DEPTH: Record<ViewKey, number> = {
  list: 0,
  nickname: 1,
  account: 1,
  notification: 1,
  safety: 1,
  guide: 1,
  privacy: 1,
  terms: 1,
  withdrawal: 2,
};

// 각 뷰의 ← 가 향하는 곳. 셸이 navigateBack 을 가로챌 때 이 값으로 판별한다.
const BACK_TARGET: Partial<Record<ViewKey, ViewKey>> = {
  nickname: "list",
  account: "list",
  notification: "list",
  safety: "list",
  guide: "list",
  privacy: "list",
  terms: "list",
  withdrawal: "account",
};

// 나의 공간은 목록·일곱 상세·계정 삭제를 '한 화면 안에서' state 로 갈아끼운다.
// 계정 삭제(이유↔확인)가 쓰는 방식과 같다 — 페이지를 새로 불러오지 않으므로
// 나가는 화면과 들어오는 화면 사이에 빈 구간이 생기지 않고, React 가 노드를
// 통째로 교체해 주어 어느 방향으로 가든 진입 애니메이션이 매번 재생된다.
//
// URL 은 pushState 로만 맞춰 둔다. 새로고침하거나 링크로 바로 들어오면
// App.tsx 의 라우터가 그 화면을 단독으로 그리고(기존 동작 그대로),
// 그때는 페이지 단위 push/pop 모션이 쓰인다.
export function MySpaceScreen() {
  const [state, setState] = useState<TestState>("normal");
  const summary = getMySpaceSummary();
  const qaMode = isPrototypeQaMode();
  // 상세 화면에서 '페이지 이동으로' 돌아온 경우에만 pop-in 을 쓴다.
  // 셸 안에서 돌아올 때는 아래 stage 전환이 대신한다.
  const [enteredViaPop] = useState(consumePopEntry);

  const [view, setView] = useState<ViewKey>("list");
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  // 셸 안에서 한 번이라도 이동했는지. 처음 들어왔을 때는 stage 클래스를 붙이지
  // 않아야 페이지 단위 진입 모션(push-in/pop-in)이 그대로 살아난다.
  const [moved, setMoved] = useState(false);

  const viewRef = useRef<ViewKey>("list");
  viewRef.current = view;

  const goToView = (next: ViewKey) => {
    const from = viewRef.current;
    setDirection(VIEW_DEPTH[next] < VIEW_DEPTH[from] ? "back" : "forward");
    setMoved(true);
    setView(next);
  };

  // navigateTo / navigateBack 을 가로채 셸 안에서 처리한다.
  // 처리하지 못하는 곳(로그인, 삭제 완료 등)은 false 를 돌려 평소대로 이동시킨다.
  useEffect(() => {
    return registerShellRouter({
      go: (path) => {
        const next = PATH_TO_VIEW.get(path);
        if (!next) return false;
        goToView(next);
        window.history.pushState({}, "", path);
        return true;
      },
      back: (fallbackPath) => {
        const current = viewRef.current;
        if (current === "list") return false;
        const target = BACK_TARGET[current];
        // ← 가 향하는 곳이 셸이 아는 그 화면일 때만 가로챈다.
        const targetPath = target === "list" ? "/my-space" : target ? VIEW_TO_PATH.get(target) : undefined;
        if (!target || targetPath !== fallbackPath) return false;
        // pushState 로 쌓아둔 만큼 뒤로 물러난다 — 브라우저 뒤로가기와 같은 결과.
        window.history.back();
        return true;
      },
    });
  }, []);

  // 브라우저 뒤로/앞으로에도 같은 전환으로 반응한다.
  useEffect(() => {
    const onPopState = () => {
      goToView(PATH_TO_VIEW.get(getCurrentAppPath()) ?? "list");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const stage = moved ? `app-shell-stage app-shell-stage--${direction}` : "";

  if (view !== "list") {
    if (view === "nickname") return <AnonymousNameSettingsScreen stageClassName={stage} />;
    if (view === "account") return <AccountSettingsScreen stageClassName={stage} />;
    if (view === "notification") return <NotificationSettingsScreen stageClassName={stage} />;
    if (view === "safety") return <SafetyManagementScreen stageClassName={stage} />;
    if (view === "guide") return <GuideScreen kind="service" stageClassName={stage} />;
    if (view === "privacy") return <PolicyScreen kind="privacy" stageClassName={stage} />;
    if (view === "terms") return <TermsMockupScreen stageClassName={stage} />;
    // 계정 삭제는 자체 단계 전환(account-withdrawal-stage)을 갖고 있다.
    // 셸 클래스를 덧씌우면 내부 '이유↔확인' 뒤로가기가 앞으로 방향으로 덮여버린다.
    return <AccountWithdrawalScreen />;
  }

  return <main className={`mobile-prototype my-space-screen${enteredViaPop ? " is-popped-in" : ""}${stage ? ` ${stage}` : ""}`}>
    <div className="my-space-scroll-region">
      <header className="my-space-heading"><h1>나의 공간</h1><span>나에 대한 설정과 안내를 모아뒀어요.</span></header>
      {state === "loading" ? <section className="my-space-skeleton" aria-label="나의 공간 불러오는 중"><i /><i /><i /></section> : state === "error" ? <section className="my-space-error"><h2>나의 공간을 불러오지 못했어요</h2><p>잠시 후 다시 확인해주세요.</p><button className="flow-primary-button" type="button" onClick={() => setState("normal")}>다시 시도</button></section> : <>
        <section className="my-space-menu my-space-menu--figma" aria-label="나의 공간 메뉴">
          {menuItems.map((item) => <button key={item.label} type="button" onClick={() => { goToView(item.key); window.history.pushState({}, "", item.path); }}><span>{item.label}</span><span className="my-space-menu-value">{item.key === "nickname" ? summary.name : null}</span><i aria-hidden="true">›</i></button>)}
        </section>
        {state === "partial-error" && <p className="my-space-partial-error">일부 기록을 불러오지 못했어요. 잠시 후 다시 확인해주세요.</p>}
      </>}
      {qaMode && <details className="prototype-test-panel my-space-test"><summary>프로토타입 테스트</summary><p>나의 공간 로딩 및 오류 상태를 확인할 수 있어요.</p><div><button type="button" onClick={() => setState("normal")}>정상</button><button type="button" onClick={() => setState("loading")}>로딩</button><button type="button" onClick={() => setState("partial-error")}>부분 오류</button><button type="button" onClick={() => setState("error")}>전체 오류</button></div></details>}
    </div>
    <AppBottomNavigation active="my-space" />
  </main>;
}
