import { useEffect, useMemo, useState } from "react";
import {
  acceptTerms,
  beginMockLogin,
  confirmAnonymousName,
  generateAnonymousName,
  getMockAuthSnapshot,
  getOnboardingNextPath,
  getPostLoginPath,
  resolveMockLogin,
  retryMockLogin,
  setMockLoginMode,
  type MockAuthProvider,
} from "./mockAuth";
import { getCurrentAppSearchParams, navigateBack, navigateTo, replaceRoute } from "./navigation";
import { isPrototypeQaMode } from "./prototypeQa";

function AuthShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <main className={`mobile-prototype auth-screen ${className}`}>{children}</main>;
}

function AuthHeader({ backTo = "/intro", title = "공감편지" }: { backTo?: string; title?: string }) {
  return <header className="auth-header">
    <button type="button" onClick={() => navigateBack(backTo)} aria-label="이전 화면으로 돌아가기">←</button>
    <span>{title}</span>
    <i aria-hidden="true" />
  </header>;
}

export function OnboardingScreen() {
  return <AuthShell className="onboarding-screen">
    <AuthHeader />
    <div className="auth-scroll">
      <section className="auth-intro-copy">
        <p>처음 만나는 공감편지</p>
        <h1>공감편지는<br />이런 곳이에요</h1>
        <figure className="onboarding-welcome-illustration" aria-hidden="true">
          <img src="/assets/onboarding-welcome-illustration.png" alt="" />
        </figure>
        <ul className="onboarding-guides">
          <li>이름을 드러내지 않고 마음을 편지로 남길 수 있어요.</li>
          <li>한 사람이 당신의 편지를 읽고 한 통의 답장을 전해요.</li>
          <li>답장은 바로 도착하지 않을 수 있어요.</li>
        </ul>
        <aside className="onboarding-boundary">
          <strong>공감편지는 전문 상담이나 진단을 제공하는 서비스는 아니에요.</strong>
          <p>지금 바로 도움이 필요한 상황이라면 편지보다 가까운 사람이나 전문적인 도움을 먼저 찾아주세요.</p>
        </aside>
      </section>
    </div>
    <footer className="auth-actions auth-actions--stacked">
      <button className="auth-primary" type="button" onClick={() => navigateTo("/login?new=1")}>시작하기</button>
      <button className="auth-text-action" type="button" onClick={() => navigateTo("/login")}>이미 이용하고 있어요</button>
    </footer>
  </AuthShell>;
}

export function OnboardingRedesignScreen() {
  return <AuthShell className="onboarding-redesign-screen">
    <AuthHeader title="공감편지 소개" />
    <div className="auth-scroll onboarding-redesign-scroll">
      <section className="onboarding-redesign-hero">
        <p>이름 없이 오가는 한 통의 편지</p>
        <h1>오늘의 마음을<br />편지에 담아보세요</h1>
        <figure><img src="/assets/onboarding-new-hero.png" alt="편지지와 보랏빛 펜, 봉투가 놓인 나무 책상" /></figure>
      </section>
      <section className="onboarding-redesign-steps" aria-label="공감편지 이용 방법">
        <article><span>01</span><div><h2>이름을 밝히지 않아요</h2><p>이름도 나이도 적지 않아요.<br />남는 건 오늘의 마음뿐이에요.</p></div></article>
        <article><span>02</span><div><h2>한 사람이 끝까지 읽어요</h2><p>한 통은 한 사람에게만 닿아요.<br />그 사람이 끝까지 읽고, 자신의 한 통으로 답해요.</p></div></article>
        <article><span>03</span><div><h2>답장은 천천히 와요</h2><p>바로 오지 않아요.<br />누군가 당신의 편지를 마주할 때까지 기다려요.</p></div></article>
        <article><span>04</span><div><h2>좋은 편지만 오가도록 함께 지켜요</h2><p>성의 없거나 상처가 되는 말은 신고될 수 있어요.<br />마음이 담긴 한 통이면 충분해요.</p></div></article>
      </section>
      <aside className="onboarding-redesign-note"><strong>공감편지는 전문 상담이나 진단을 제공하지 않아요.</strong><p>지금 바로 도움이 필요한 상황이라면 가까운 사람이나 전문적인 도움을 먼저 찾아주세요.</p></aside>
    </div>
    <footer className="auth-actions auth-actions--stacked onboarding-redesign-actions">
      <button className="auth-primary" type="button" onClick={() => navigateTo("/login?new=1")}>시작하기</button>
      <button className="auth-text-action" type="button" onClick={() => navigateTo("/login")}>이미 이용하고 있어요</button>
    </footer>
  </AuthShell>;
}

const providerLabels: Record<MockAuthProvider, string> = { apple: "Apple로 계속하기", google: "Google로 계속하기", kakao: "토스로 계속하기" };

export function LoginScreen() {
  const [snapshot, setSnapshot] = useState(getMockAuthSnapshot);
  const qaMode = isPrototypeQaMode();
  const loggingIn = snapshot.state === "logging_in";
  const failed = snapshot.state === "login_failed";

  useEffect(() => {
    if (!loggingIn) return;
    const timer = window.setTimeout(() => {
      const result = resolveMockLogin();
      setSnapshot(result);
      if (result.state === "logged_in" || result.state === "new_user") replaceRoute("/terms-consent");
    }, 760);
    return () => window.clearTimeout(timer);
  }, [loggingIn]);

  const start = (provider: MockAuthProvider) => {
    beginMockLogin(provider);
    setSnapshot(getMockAuthSnapshot());
  };

  const setTestMode = (mode: "new" | "existing" | "failure") => {
    setMockLoginMode(mode);
    setSnapshot(getMockAuthSnapshot());
  };

  // 이 화면은 신규·기존이 함께 쓴다. 로그인 전이라 신규 여부를
  // 계정으로 알 수 없으므로, 들어온 경로로 판단한다 —
  // 온보딩의 '시작하기'만 ?new=1 을 붙여 보낸다.
  // '이미 이용하고 있어요'·인트로·직접 진입은 기존 문구를 본다.
  const isNewComer = new URLSearchParams(window.location.search).get("new") === "1";

  return <AuthShell className="login-screen">
    <AuthHeader backTo="/onboarding" />
    <div className="auth-scroll">
      <section className="auth-intro-copy auth-intro-copy--login">
        <p>이름 없이 오가는 한 통의 편지</p>
        {isNewComer
          ? <h1>새로운 편지함을<br />만들게요</h1>
          : <h1>로그인하여<br />편지를 이어가세요</h1>}
        <p className="auth-helper">로그인 정보는 다른 사용자에게 보이지 않아요.</p>
      </section>

      {failed && <section className="auth-login-error" role="alert">
        <strong>로그인하지 못했어요.</strong>
        <p>잠시 후 다시 시도해주세요.</p>
      </section>}

      <section className="auth-provider-list" aria-label="로그인 방법">
        {(Object.keys(providerLabels) as MockAuthProvider[]).map((provider) => <button
          key={provider}
          className="auth-provider-button"
          type="button"
          disabled={loggingIn}
          onClick={() => start(provider)}
        >
          <span className={`auth-provider-mark auth-provider-mark--${provider}`} aria-hidden="true">
            <img src={provider === "apple" ? "/assets/logo-apple.png" : provider === "google" ? "/assets/logo-google.png" : "/assets/logo-toss.png"} alt="" />
          </span>
          {loggingIn && snapshot.pendingProvider === provider ? <span className="auth-loading-copy"><i className="auth-spinner" />로그인하고 있어요.</span> : providerLabels[provider]}
        </button>)}
      </section>

      {failed && <div className="auth-failure-actions"><button type="button" className="auth-primary" onClick={() => { retryMockLogin(); start("apple"); }}>다시 시도</button><button type="button" className="auth-secondary" onClick={() => { retryMockLogin(); setSnapshot(getMockAuthSnapshot()); }}>다른 방법으로 로그인</button><button type="button" className="auth-text-action" onClick={() => navigateTo("/intro")}>처음으로 돌아가기</button></div>}

      {qaMode && <section className="prototype-test-panel" aria-label="프로토타입 테스트">
        <span>프로토타입 테스트</span>
        <p>선택한 상태로 다음 로그인 버튼을 눌러 확인할 수 있어요.</p>
        <div>
          <button type="button" className={snapshot.loginMode === "new" ? "is-active" : ""} onClick={() => setTestMode("new")}>신규 사용자</button>
          <button type="button" className={snapshot.loginMode === "existing" ? "is-active" : ""} onClick={() => setTestMode("existing")}>기존 사용자</button>
          <button type="button" className={snapshot.loginMode === "failure" ? "is-active" : ""} onClick={() => setTestMode("failure")}>실패 보기</button>
        </div>
      </section>}
    </div>
  </AuthShell>;
}

export function TermsConsentScreen() {
  return <AuthShell className="terms-screen">
    <AuthHeader backTo="/login" />
    <div className="auth-scroll terms-policy-scroll">
      <section className="terms-consent-heading">
        <h1>공감편지를 시작하기 전에<br />확인해주세요</h1>
      </section>
      <section className="terms-policy-document" aria-label="서비스 이용약관">
        <article><h2>1. 이용약관 동의</h2><p>공감편지를 이용함으로써 본 이용약관에 동의하게 됩니다. 서비스를 이용하기 전 아래 내용을 확인해주세요.</p></article>
        <article><h2>2. 서비스 이용 방식</h2><p>공감편지는 익명으로 자신의 이야기를 편지로 작성하고, 다른 이용자의 편지를 읽고 답장을 전할 수 있는 서비스입니다. 내가 작성한 편지는 다른 익명의 이용자에게 전달되어 읽힐 수 있습니다. 편지를 받은 이용자에게 답장 의무는 없으며, 답장의 도착 여부나 시점은 보장되지 않습니다.</p></article>
        <article><h2>3. 사용자 행동 규칙</h2><p>안전한 공감 공간을 위해 다음 행위는 금지됩니다.</p><ul><li>혐오 발언, 괴롭힘, 위협</li><li>성적으로 노골적이거나 부적절한 콘텐츠</li><li>스팸 또는 의미 없는 반복 콘텐츠</li><li>전화번호, 주소, SNS ID 등 개인 연락처 공유</li><li>다른 이용자에게 개인정보 또는 연락처를 요구하는 행위</li><li>불법적인 활동을 조장하는 내용</li></ul><aside>위반 시 콘텐츠가 제한 또는 삭제되거나 서비스 이용이 제한될 수 있습니다.</aside></article>
        <article><h2>4. 콘텐츠 안전검토 및 신고</h2><p>편지와 답장은 안전한 서비스 제공을 위해 자동화된 시스템을 통해 검토될 수 있습니다. 신고된 콘텐츠는 운영자가 확인할 수 있으며, 이용약관이나 운영정책을 위반한 경우 필요한 조치가 이루어질 수 있습니다.</p></article>
        <article><h2>5. 계정 및 콘텐츠 이용 제한</h2><p>이용약관을 위반한 경우 해당 콘텐츠를 삭제하거나 이용을 제한하고, 반복 또는 중대한 위반 시 계정을 정지하거나 삭제할 수 있습니다.</p></article>
        <article><h2>6. 서비스의 범위</h2><p>공감편지는 이용자 간의 공감과 편지 교환을 돕는 서비스이며, 의료·심리치료 또는 전문 상담 서비스를 제공하지 않습니다.</p></article>
        <article><h2>7. 이용 연령</h2><p>공감편지는 만 14세 이상의 이용자만 이용할 수 있습니다.</p></article>
      </section>
    </div>
    <footer className="auth-actions"><button className="auth-primary" type="button" onClick={() => { acceptTerms(); navigateTo("/nickname-entry"); }}>동의하고 시작하기</button></footer>
  </AuthShell>;
}

export function DirectNicknameScreen() {
  const [name, setName] = useState("");
  const validName = Boolean(name.trim());
  const recommendName = () => setName(generateAnonymousName(name || undefined));

  /* 이름을 확정한 뒤의 환영 연출.
     원래는 연결되지 않은 /anonymous-name 화면에만 있었고, 정작 신규 가입자가
     실제로 지나는 이 화면에는 없어서 이름을 정하면 곧장 홈으로 넘어갔다.
     가입의 마지막이자 자기 이름이 처음 불리는 자리라 그 연출을 이리로 옮겼다.
     시간(2510ms 머무르고 720ms 걸쳐 사라짐)과 클래스는 원래 값 그대로 쓴다 —
     CSS(.anonymous-name-welcome)가 그 길이에 맞춰 짜여 있다. */
  const [isCompleting, setIsCompleting] = useState(false);
  const [isWelcomeVisible, setIsWelcomeVisible] = useState(false);
  const [isWelcomeLeaving, setIsWelcomeLeaving] = useState(false);
  const [welcomeName, setWelcomeName] = useState("");

  useEffect(() => {
    if (!isCompleting) return;
    // 한 박자 뒤에 나타나게 해야 등장 애니메이션이 재생된다.
    const revealTimer = window.setTimeout(() => setIsWelcomeVisible(true), 90);
    return () => window.clearTimeout(revealTimer);
  }, [isCompleting]);

  const continueWithName = () => {
    const finalizedName = name.trim();
    if (!finalizedName || isCompleting) return;
    confirmAnonymousName(finalizedName);
    setWelcomeName(finalizedName);
    setIsWelcomeVisible(false);
    setIsCompleting(true);
    window.setTimeout(() => {
      setIsWelcomeLeaving(true);
      window.setTimeout(() => navigateTo("/home"), 720);
    }, 2510);
  };

  return <AuthShell className={`direct-nickname-screen${isCompleting ? " anonymous-name-screen motion-preview is-completing" : ""}`}>
    <AuthHeader backTo="/terms-of-service" title="이름 정하기" />
    <div className="auth-scroll direct-nickname-scroll">
      <section className="direct-nickname-content" aria-labelledby="direct-nickname-title">
        <h1 id="direct-nickname-title">나를 부를 이름을<br />정해볼까요?</h1>
        <p>편지 속에서 나를 대신해 불러줄 이름이에요.</p>
        <div className="direct-nickname-field">
          <div className="direct-nickname-field__label"><label htmlFor="direct-nickname-input">이름</label></div>
          <div className="direct-nickname-input-wrap">
            <input id="direct-nickname-input" type="text" value={name} maxLength={10} onChange={(event) => setName(event.target.value.slice(0, 10))} placeholder="이름을 입력해주세요" aria-describedby="direct-nickname-help" autoFocus />
            {name && <button className="anonymous-name-clear" type="button" onClick={() => setName("")} aria-label="입력한 이름 지우기">×</button>}
          </div>
          <div className="direct-nickname-field__meta"><p id="direct-nickname-help">10자 이내로 입력해주세요.</p><span aria-live="polite">{name.length} / 10</span></div>
        </div>
        <button className="direct-nickname-recommend" type="button" onClick={recommendName}>이름 추천 받기</button>
      </section>
    </div>
    <footer className="auth-actions direct-nickname-actions"><button className="auth-primary" type="button" disabled={!validName || isCompleting} onClick={continueWithName}>이 이름으로 시작하기</button></footer>
    {isCompleting && <div className={`anonymous-name-welcome${isWelcomeVisible ? " is-visible" : ""}${isWelcomeLeaving ? " is-leaving" : ""}`} role="status" aria-live="polite"><p><strong>{welcomeName}</strong>님, 반가워요.</p></div>}
  </AuthShell>;
}

export function OnboardingCompleteScreen() {
  const name = getMockAuthSnapshot().account?.anonymousName ?? "조용한 별빛";
  return <AuthShell className="onboarding-complete-screen">
    <div className="auth-complete-content"><div className="auth-complete-seal" aria-hidden="true">✦</div><p>익명 닉네임이 정해졌어요</p><h1>이제 편지를 시작할<br />준비가 되었어요</h1><strong>{name}</strong><span>이 이름으로 당신의 마음을 조심스럽게 전할게요.</span></div>
    <footer className="auth-actions"><button className="auth-primary" type="button" onClick={() => navigateTo(getPostLoginPath("/home"))}>공감편지 시작하기</button></footer>
  </AuthShell>;
}

export function DormantAccountScreen() {
  return <AuthShell className="dormant-account-screen">
    <AuthHeader backTo="/login" title="재방문 안내" />
    <div className="auth-scroll">
      <section className="auth-intro-copy dormant-account-copy">
        <p>오랜만이에요</p>
        <h1>잠시 쉬고 있던<br />계정을 다시 확인할게요</h1>
        <p className="auth-helper">안전하게 다시 시작할 수 있도록 로그인 방식을 한 번 더 확인해주세요.</p>
        <section className="dormant-account-note">
          <strong>내 편지와 기록은 그대로 보관되어 있어요.</strong>
          <span>실제 서비스에서는 휴면 전환 기준과 본인 확인 절차를 정책에 맞춰 연결합니다.</span>
        </section>
      </section>
    </div>
    <footer className="auth-actions"><button className="auth-primary" type="button" onClick={() => navigateTo("/login")}>로그인 이어가기</button></footer>
  </AuthShell>;
}

export function AuthGateRedirect({ to }: { to: string }) {
  useEffect(() => { replaceRoute(to); }, [to]);
  return <AuthShell className="auth-redirect-screen"><span>공감편지를 준비하고 있어요.</span></AuthShell>;
}

export function getRequiredOnboardingPath() {
  return getOnboardingNextPath();
}
