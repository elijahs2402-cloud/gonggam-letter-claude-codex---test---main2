import { useState } from "react";
import { AppBottomNavigation } from "./AppBottomNavigation";
import { navigateTo } from "./navigation";
import { getMySpaceSummary } from "./MySpaceDetails";
import { isPrototypeQaMode } from "./prototypeQa";

type TestState = "normal" | "loading" | "error" | "partial-error";

const menuItems = [
  { label: "닉네임", path: "/anonymous-name-settings" },
  { label: "계정 관리", path: "/account-settings" },
  { label: "알림 설정", path: "/notification-settings" },
  { label: "신고·차단 관리", path: "/safety-management" },
  { label: "이용 안내", path: "/service-guide" },
  { label: "개인정보 처리방침", path: "/privacy-policy" },
  { label: "서비스 이용약관", path: "/terms-of-service" },
];

export function MySpaceScreen() {
  const [state, setState] = useState<TestState>("normal");
  const summary = getMySpaceSummary();
  const qaMode = isPrototypeQaMode();

  return <main className="mobile-prototype my-space-screen">
    <div className="my-space-scroll-region">
      <header className="my-space-heading"><p>공감편지</p><h1>나의 공간</h1></header>
      {state === "loading" ? <section className="my-space-skeleton" aria-label="나의 공간 불러오는 중"><i /><i /><i /></section> : state === "error" ? <section className="my-space-error"><h2>나의 공간을 불러오지 못했어요.</h2><p>잠시 후 다시 확인해주세요.</p><button className="flow-primary-button" type="button" onClick={() => setState("normal")}>다시 시도</button></section> : <>
        <section className="my-space-menu my-space-menu--figma" aria-label="나의 공간 메뉴">
          {menuItems.map((item) => <button key={item.label} type="button" onClick={() => navigateTo(item.path)}><span>{item.label}</span><span className="my-space-menu-value">{item.label === "닉네임" ? summary.name : null}</span><i aria-hidden="true">›</i></button>)}
        </section>
        {state === "partial-error" && <p className="my-space-partial-error">일부 기록을 불러오지 못했어요. 잠시 후 다시 확인해주세요.</p>}
      </>}
      {qaMode && <details className="prototype-test-panel my-space-test"><summary>프로토타입 테스트</summary><p>나의 공간 로딩 및 오류 상태를 확인할 수 있어요.</p><div><button type="button" onClick={() => setState("normal")}>정상</button><button type="button" onClick={() => setState("loading")}>로딩</button><button type="button" onClick={() => setState("partial-error")}>부분 오류</button><button type="button" onClick={() => setState("error")}>전체 오류</button></div></details>}
    </div>
    <AppBottomNavigation active="my-space" />
  </main>;
}
