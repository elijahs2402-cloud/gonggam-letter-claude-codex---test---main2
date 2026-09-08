import { useEffect, useState } from "react";
import {
  ReadLetterScreen,
  WriteLetterScreen,
} from "./LetterScreens";
import {
  WriteLetterAScreen,
  WriteLetterBScreen,
  WriteLetterCScreen,
} from "./WriteLetterVariants";
import {
  ReadLetterAScreen,
  ReadLetterBScreen,
  ReadLetterCScreen,
} from "./ReadLetterVariants";
import {
  WriteReplyAScreen,
  WriteReplyBScreen,
  WriteReplyCScreen,
} from "./WriteReplyVariants";
import {
  ListenEntryAScreen,
  ListenEntryBScreen,
  ListenEntryCScreen,
  ListenEntryEmptyScreen,
} from "./ListenEntryVariants";
import { ReplyPreviewScreen } from "./ReplyPreviewScreen";
import { MailboxDemoDirectionalStatusScreen, MailboxDemoIconSetScreen, MailboxDemoInlineDirectionalStatusScreen, MailboxDemoScreen, MailboxDemoStatusIconScreen, MailboxDemoUploadedIconSetScreen, MailboxEmptyDemoScreen, MailboxReplyArrivedDemoScreen, MailboxScreen } from "./MailboxScreen";
import { MailboxListLabScreen } from "./MailboxListLab";
import { MailboxMockupScreen } from "./MailboxMockup";
import { MailboxMockup2Screen } from "./MailboxMockup2";
import { MailboxMockup3Screen } from "./MailboxMockup3";
import { MailboxMockup4Screen } from "./MailboxMockup4";
import { MailboxMockup5Screen } from "./MailboxMockup5";
import { AnonNameMockupScreen } from "./AnonNameMockup";
import { AnonNameMockup2Screen } from "./AnonNameMockup2";
import { AnonNameMockup3Screen } from "./AnonNameMockup3";
import { AnonNameConceptsScreen } from "./AnonNameConcepts";
import { NavIconConceptsScreen } from "./NavIconConcepts";
import { TermsMockupScreen } from "./TermsMockup";
import { WaitingLettersListLabScreen } from "./WaitingLettersListLab";
import { HomeScreen } from "./HomeScreen";
import { MySpaceScreen } from "./MySpaceScreen";
import {
  AssignLetterScreen,
  LetterPreviewScreen,
  LetterSentScreen,
  LetterJourneyScreen,
  LetterWithdrawnScreen,
  MyLetterDetailScreen,
  MyLetterRepliedDemoScreen,
  ReaderPromiseScreen,
  AssignedLetterFlowScreen,
  ReadLetterFlowScreen,
  RepliedLetterDetailScreen,
  ReplyReviewScreen,
  ReplyArrivedScreen,
  ReplySendingTransitionScreen,
  ReplySentScreen,
  WaitingLettersScreen,
  WriteLetterFlowScreen,
  WriteReplyFlowScreen,
} from "./LetterFlowScreens";
import {
  MailboxConceptAScreen,
  MailboxConceptBScreen,
  MailboxConceptCScreen,
  MailboxConceptDScreen,
} from "./MailboxConcepts";
import {
  EmotionAfterScreen,
  EmotionCheckInScreen,
  EmotionSummaryScreen,
} from "./EmotionJourneyScreens";
import { GuidedSummaryScreen, GuidedWritingScreen, WritingMethodScreen } from "./GuidedWritingScreens";
import { createEmotionJourney } from "./emotionJourney";
import { getCurrentAppPath, getCurrentAppSearchParams, navigateTo, replaceRoute } from "./navigation";
import { MindContentBoard } from "./prototype-board/MindContentBoard";
import { LetterSafetyReviewScreen, UrgentSupportScreen } from "./SafetyScreens";
import { LetterReportCompleteDemoScreen, LetterReportFigmaScreen, LetterReportScreen, SafetyManagementScreen } from "./ReportScreens";
import { HomeSceneScreen } from "./HomeSceneScreen";
import { HomeCardsScreen } from "./HomeCardsScreen";
import { AuthGateRedirect, DirectNicknameScreen, DormantAccountScreen, LoginScreen, OnboardingRedesignScreen, ReturningWelcomeScreen, TermsConsentScreen, getRequiredOnboardingPath } from "./AuthScreens";
import { GratitudeScreen } from "./GratitudeScreen";
import { HomeRuledScreen } from "./HomeRuledScreen";
import { getMockAuthSnapshot, isMockAuthenticated, setPostLoginPath } from "./mockAuth";
import { NotificationsScreen, NotificationSettingsScreen } from "./NotificationScreens";
import { LetterReturnScreen, ReplyReportScreen } from "./SafetyActionScreens";
import { SavedExcerptsScreen } from "./SavedExcerptsScreen";
import { LetterJourneyLabScreen } from "./LetterJourneyLab";
import { AnonymousNameSettingsScreen, AppInfoScreen, GuideScreen, PolicyScreen, ReceivedRepliesScreen } from "./MySpaceDetails";
import { AccountRestrictedScreen, AccountSettingsScreen, AccountWithdrawalScreen, DataAndPrivacyScreen, LoginInformationScreen, WithdrawalCompleteScreen } from "./AccountManagementScreens";
import { NotFoundScreen, ServiceStateScreen } from "./CommonStates";
import { DesignReviewScreen, type ReviewDirection, type ReviewScreen } from "./DesignReview";
import { getCurrentUserId } from "./letters";
import { getListenEntryPath } from "./waitingLetters";

type MoodChoice = "write" | "listen";

const choices = {
  write: {
    title: "내 마음을 털어놓고 싶어요",
    description: "말로 하기 어려웠던 마음을 익명의 편지에 담아보세요.",
  },
  listen: {
    title: "누군가의 마음을 들어주고 싶어요",
    description: "누군가가 조심스럽게 꺼낸 이야기를 천천히 읽어보세요.",
  },
} as const;

function goTo(path: string) {
  navigateTo(path);
}

function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <button
      className={`brand${inverse ? " brand--inverse" : ""}`}
      type="button"
      onClick={() => goTo("/intro")}
      aria-label="공감편지 인트로로 이동"
    >
      공감편지
    </button>
  );
}

function ScreenShell({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return <main className={`mobile-prototype ${className}`}>{children}</main>;
}

function RedirectToHome() {
  useEffect(() => {
    replaceRoute("/home");
  }, []);
  return <HomeScreen />;
}

function IntroScreen() {
  const auth = getMockAuthSnapshot();
  const handleEntry = () => {
    // 탈퇴한 사람은 처음 온 사람과 같다 — 약관도 이름도 다시 받아야 하므로
    // 로그인이 아니라 온보딩부터 시작한다.
    if (auth.state === "withdrawn") {
      goTo("/onboarding");
      return;
    }
    if (isMockAuthenticated()) {
      goTo("/home");
      return;
    }
    const nextOnboarding = getRequiredOnboardingPath();
    if (nextOnboarding && nextOnboarding !== "/login") {
      goTo(nextOnboarding);
      return;
    }
    // A completed prototype account that is logged out follows the existing-user login path.
    goTo(auth.account?.onboardingCompleted ? "/login" : "/onboarding");
  };
  return (
    <ScreenShell className="intro-screen">
      <img
        className="intro-art"
        src="/assets/intro-door-uploaded.png"
        alt="담쟁이덩굴이 감싼 보랏빛 현관문과 편지가 든 우편함"
      />
      <section className="intro-copy" aria-labelledby="intro-title">
        <p className="intro-brand">공감편지</p>
        <h1 id="intro-title">
          오늘도,
          <br />
          마음이 도착했습니다
        </h1>
        <p className="intro-note">마음을 담은 편지가 조용히 머무는 곳</p>
      </section>
      <button className="intro-cta" type="button" onClick={handleEntry}>
        마음의 문 열기
      </button>
    </ScreenShell>
  );
}

function DirectionHeader({
  className = "",
  backToIntro = false,
}: {
  className?: string;
  backToIntro?: boolean;
}) {
  return (
    <header className={`direction-header ${className}`}>
      {backToIntro ? (
        <button
          className="direction-back-button"
          type="button"
          onClick={() => goTo("/intro")}
          aria-label="인트로로 돌아가기"
        >
          <span aria-hidden="true">←</span>
        </button>
      ) : (
        <Brand />
      )}
    </header>
  );
}

function DirectionAScreen() {
  const startWritingJourney = () => {
    createEmotionJourney();
    goTo("/emotion-check-in");
  };

  return (
    <ScreenShell className="direction-a">
      <DirectionHeader backToIntro />
      <section className="a-heading" aria-labelledby="a-title">
        <h1 id="a-title">오늘은 어떤 마음으로 문을 열었나요?</h1>
        <p>지금 마음이 향하는 쪽을 골라주세요.</p>
      </section>

      <div className="a-choices" aria-label="마음 선택">
        <button
          className="a-choice"
          type="button"
          onClick={startWritingJourney}
        >
          <span className="a-choice-index">01</span>
          <span className="a-choice-copy">
            <strong>
              내 마음을
              <br />
              털어놓고 싶어요
            </strong>
            <span>{choices.write.description}</span>
          </span>
          <span className="a-choice-art-wrap" aria-hidden="true">
            <img
              className="a-choice-art"
              src="/assets/direction-a-write-isolated-tight.png"
              alt=""
            />
          </span>
        </button>

        <button
          className="a-choice"
          type="button"
          onClick={() => goTo(getListenEntryPath(getCurrentUserId()))}
        >
          <span className="a-choice-index">02</span>
          <span className="a-choice-copy">
            <strong>{choices.listen.title}</strong>
            <span>{choices.listen.description}</span>
          </span>
          <span className="a-choice-art-wrap" aria-hidden="true">
            <img
              className="a-choice-art"
              src="/assets/direction-a-listen-isolated-tight.png"
              alt=""
            />
          </span>
        </button>
      </div>
      <div className="a-footer-group">
        <img
          className="a-footer-decor"
          src="/assets/decor.svg?v=5"
          alt=""
          aria-hidden="true"
        />
        <p className="a-footer">여기서 고른 선택은 언제든 홈에서 바꿀 수 있어요.</p>
      </div>
    </ScreenShell>
  );
}

function DirectionBScreen() {
  const [selected, setSelected] = useState<MoodChoice | null>(null);

  return (
    <ScreenShell className="direction-b">
      <DirectionHeader />
      <section className="b-heading" aria-labelledby="b-title">
        <img
          className="b-title-decor"
          src="/assets/decor.png"
          alt=""
          aria-hidden="true"
        />
        <h1 id="b-title">오늘은 어떤 마음으로 문을 열었나요?</h1>
        <p>지금 마음이 향하는 쪽을 골라주세요.</p>
      </section>

      <div className="b-options" aria-label="마음 선택">
        <button
          type="button"
          className={`b-option${selected === "write" ? " is-selected" : ""}`}
          onClick={() => setSelected("write")}
          aria-pressed={selected === "write"}
        >
          <img src="/assets/direction-b-write.png" alt="만년필과 잉크병, 편지지" />
          <span className="b-option-copy">
            <strong>{choices.write.title}</strong>
            <span>{choices.write.description}</span>
          </span>
        </button>

        <button
          type="button"
          className={`b-option${selected === "listen" ? " is-selected" : ""}`}
          onClick={() => setSelected("listen")}
          aria-pressed={selected === "listen"}
        >
          <img src="/assets/direction-b-read.png" alt="펼친 편지와 안경, 찻잔" />
          <span className="b-option-copy">
            <strong>{choices.listen.title}</strong>
            <span>{choices.listen.description}</span>
          </span>
        </button>
      </div>
      <p className="b-footer">여기서 고른 선택은 언제든 홈에서 바꿀 수 있어요.</p>
      <p className="sr-only" aria-live="polite">
        {selected ? `${choices[selected].title} 선택됨` : ""}
      </p>
    </ScreenShell>
  );
}

function DirectionCScreen() {
  const [selected, setSelected] = useState<MoodChoice | null>(null);

  return (
    <ScreenShell className="direction-c">
      <DirectionHeader className="direction-header--c" />
      <section className="c-heading" aria-labelledby="c-title">
        <h1 id="c-title">
          오늘은 어떤 마음으로
          <br />
          문을 열었나요?
        </h1>
      </section>

      <div className="c-options" aria-label="마음 선택">
        <button
          className={`c-option${selected === "write" ? " is-selected" : ""}`}
          type="button"
          onClick={() => setSelected("write")}
          aria-pressed={selected === "write"}
        >
          <span className="c-number">01</span>
          <span className="c-copy">
            <strong>{choices.write.title}</strong>
            <span>{choices.write.description}</span>
          </span>
        </button>
        <button
          className={`c-option${selected === "listen" ? " is-selected" : ""}`}
          type="button"
          onClick={() => setSelected("listen")}
          aria-pressed={selected === "listen"}
        >
          <span className="c-number">02</span>
          <span className="c-copy">
            <strong>{choices.listen.title}</strong>
            <span>{choices.listen.description}</span>
          </span>
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {selected ? `${choices[selected].title} 선택됨` : ""}
      </p>
    </ScreenShell>
  );
}

export function App() {
  const path = getCurrentAppPath();
  const systemState = getCurrentAppSearchParams().get("system");
  if (systemState === "offline" || systemState === "maintenance" || systemState === "update_required" || systemState === "restricted" || systemState === "error") return <ServiceStateScreen variant={systemState} />;

  // Design-review comparison screens. Separate from the service flow: they read
  // no stored data and nothing in the app links to them.
  if (path.startsWith("/design-review/")) {
    const [dir, screen] = path.slice("/design-review/".length).split("/");
    const isDirection = dir === "a" || dir === "b" || dir === "c";
    const isScreen = screen === "home" || screen === "mailbox" || screen === "letter" || screen === "my-space";
    if (isDirection && isScreen) {
      return <DesignReviewScreen dir={dir as ReviewDirection} screen={screen as ReviewScreen} />;
    }
    return <AuthGateRedirect to="/design-review/a/home" />;
  }

  // Intro was formerly the fallback route; retain both direct and root entry.
  if (path === "/" || path === "/intro") return <IntroScreen />;

  if (path === "/onboarding") return <OnboardingRedesignScreen />;
  // The redesign became the onboarding screen; its former address still resolves.
  if (path === "/onboarding-new") return <AuthGateRedirect to="/onboarding" />;
  if (path === "/dormant-account") return <DormantAccountScreen />;
  if (path === "/login") {
    if (isMockAuthenticated()) return <AuthGateRedirect to="/home" />;
    return <LoginScreen />;
  }
  if (path === "/returning-welcome") {
    if (!isMockAuthenticated()) return <AuthGateRedirect to={getRequiredOnboardingPath() ?? "/login"} />;
    return <ReturningWelcomeScreen />;
  }
  if (path === "/terms-consent") {
    const next = getRequiredOnboardingPath();
    if (next && next !== "/terms-consent") return <AuthGateRedirect to={next} />;
    return <TermsConsentScreen />;
  }
  // /anonymous-name 라우트를 지웠다. 이름 화면은 두 개면 된다 —
  // 신규 가입자용 /nickname-entry, 기존 회원용 /anonymous-name-settings.
  // 세 번째였던 이 화면은 앱 어디에서도 연결되지 않으면서 URL 로는 열려,
  // 온보딩을 마친 사람도 여기서 이름을 바꿀 수 있었다. 그 화면에만 있던
  // 환영 연출은 실제로 쓰이는 /nickname-entry 로 옮겼다.
  if (path === "/nickname-entry") {
    const next = getRequiredOnboardingPath();
    // 지워진 /anonymous-name 과의 비교도 함께 뺀다 — 이제 갈 수 없는 곳이다.
    if (next && next !== "/nickname-entry") return <AuthGateRedirect to={next} />;
    return <DirectNicknameScreen />;
  }
  if (path === "/onboarding-complete") {
    if (!isMockAuthenticated()) return <AuthGateRedirect to={getRequiredOnboardingPath() ?? "/login"} />;
    return <AuthGateRedirect to="/home" />;
  }

  const protectedPaths = new Set(["/home", "/home-ruled", "/home-scene", "/home-cards", "/write-letter", "/listen-entry-a", "/waiting-letters", "/mailbox", "/my-space", "/saved-excerpts", "/received-replies", "/anonymous-name-settings", "/account-settings", "/login-information", "/data-and-privacy", "/account-withdrawal", "/notifications", "/notification-settings", "/safety-management", "/service-guide", "/safety-guide", "/privacy-policy", "/app-info", "/prototype/mailbox-list-lab", "/prototype/waiting-letters-list-lab", "/letter-safety-review"]);
  const protectedFlowPrefixes = ["/gratitude/", "/report-reply/", "/return-letter/", "/reply-safety-review/", "/reply-sending/", "/report-letter/", "/report-letter-figma/", "/report-letter-legacy/", "/read-letter/", "/assigned-letter/", "/assign-letter/", "/write-reply/", "/reply-review/", "/reply-sent/", "/letter-journey/", "/reply-arrived/", "/letter-withdrawn/", "/mailbox/my/", "/mailbox/replied/"];
  const isProtectedServicePath = protectedPaths.has(path) || ["/letter-preview", "/letter-sent", "/reader-promise", "/urgent-support"].includes(path) || protectedFlowPrefixes.some((prefix) => path.startsWith(prefix));
  if (isProtectedServicePath && !isMockAuthenticated()) {
    setPostLoginPath(path);
    return <AuthGateRedirect to={getRequiredOnboardingPath() ?? "/login"} />;
  }

  if (path === "/notifications") return <NotificationsScreen />;
  if (path === "/notification-settings") return <NotificationSettingsScreen />;

  if (path === "/prototype/mind-content-board") return <MindContentBoard />;
  if (path === "/home-cards") return <HomeCardsScreen />;
  if (path === "/home-scene") return <HomeSceneScreen />;
  if (path === "/home-ruled") return <HomeRuledScreen />;
  if (path === "/home") return <HomeScreen />;
  if (path === "/my-space") return <MySpaceScreen />;
  if (path === "/saved-excerpts") return <SavedExcerptsScreen />;
  if (path === "/received-replies") return <ReceivedRepliesScreen />;
  if (path === "/anonymous-name-settings") return <AnonymousNameSettingsScreen />;
  if (path === "/account-settings") return <AccountSettingsScreen />;
  if (path === "/login-information") return <LoginInformationScreen />;
  if (path === "/data-and-privacy") return <DataAndPrivacyScreen />;
  if (path === "/account-withdrawal") return <AccountWithdrawalScreen />;
  if (path === "/withdrawal-complete") return <WithdrawalCompleteScreen />;
  if (path === "/account-restricted") return <AccountRestrictedScreen />;
  if (path === "/service-guide") return <GuideScreen kind="service" />;
  if (path === "/safety-guide") return <GuideScreen kind="safety" />;
  if (path === "/privacy-policy") return <PolicyScreen kind="privacy" />;
  if (path === "/terms-of-service") return <TermsMockupScreen />;
  if (path === "/app-info") return <AppInfoScreen />;
  if (path === "/write-letter") return <WriteLetterFlowScreen />;
  if (path === "/letter-preview") return <LetterPreviewScreen />;
  if (path === "/letter-safety-review") return <LetterSafetyReviewScreen />;
  if (path.startsWith("/gratitude/")) return <GratitudeScreen letterId={decodeURIComponent(path.slice("/gratitude/".length))} />;
  if (path === "/report-reply-demo") return <ReplyReportScreen existingDemo />;
  if (path === "/report-reply-complete-demo") return <ReplyReportScreen completeDemo />;
  if (path.startsWith("/report-reply/")) {
    const suffix = path.slice("/report-reply/".length);
    const isComplete = suffix.endsWith("/complete");
    const replyLetterId = decodeURIComponent(isComplete ? suffix.slice(0, -"/complete".length) : suffix);
    return <ReplyReportScreen letterId={replyLetterId} complete={isComplete} />;
  }
  if (path.startsWith("/return-letter/")) return <LetterReturnScreen letterId={decodeURIComponent(path.slice("/return-letter/".length))} />;
  if (path.startsWith("/reply-safety-review/")) return <ReplySendingTransitionScreen letterId={decodeURIComponent(path.slice("/reply-safety-review/".length))} />;
  if (path === "/urgent-support") return <UrgentSupportScreen kind="letter" returnTo="/write-letter" />;
  if (path === "/safety-management") return <SafetyManagementScreen />;
  if (path === "/report-letter-demo") return <LetterReportFigmaScreen letterId="sample-waiting-letter-one" />;
  if (path === "/report-letter-complete-demo") return <LetterReportCompleteDemoScreen />;
  if (path.startsWith("/report-letter-legacy/")) return <LetterReportScreen letterId={decodeURIComponent(path.slice("/report-letter-legacy/".length))} />;
  if (path.startsWith("/report-letter-figma/")) return <LetterReportFigmaScreen letterId={decodeURIComponent(path.slice("/report-letter-figma/".length))} />;
  if (path.startsWith("/report-letter/")) return <LetterReportFigmaScreen letterId={decodeURIComponent(path.slice("/report-letter/".length))} />;
  if (path === "/letter-sent") return <LetterSentScreen letterId={getCurrentAppSearchParams().get("id") ?? undefined} />;
  if (path === "/prototype/letter-journey-lab") return <LetterJourneyLabScreen />;
  if (path === "/prototype/mailbox-list-lab") return <MailboxListLabScreen />;
  if (path === "/prototype/mailbox-mockup") return <MailboxMockupScreen />;
  if (path === "/prototype/mailbox-mockup-2") return <MailboxMockup2Screen />;
  if (path === "/prototype/mailbox-mockup-3") return <MailboxMockup3Screen />;
  if (path === "/prototype/mailbox-mockup-4") return <MailboxMockup4Screen />;
  if (path === "/prototype/mailbox-mockup-5") return <MailboxMockup5Screen />;
  if (path === "/prototype/anon-name-mockup") return <AnonNameMockupScreen />;
  if (path === "/prototype/anon-name-mockup-2") return <AnonNameMockup2Screen />;
  if (path === "/prototype/anon-name-mockup-3") return <AnonNameMockup3Screen />;
  if (path === "/prototype/anon-name-concepts") return <AnonNameConceptsScreen />;
  if (path === "/prototype/nav-icon-concepts") return <NavIconConceptsScreen />;
  if (path === "/prototype/terms-mockup") return <TermsMockupScreen />;
  if (path === "/prototype/waiting-letters-list-lab") return <WaitingLettersListLabScreen />;
  if (path === "/waiting-letters") return <WaitingLettersScreen />;
  if (path === "/reader-promise") return <ReaderPromiseScreen letterId={getCurrentAppSearchParams().get("id") ?? undefined} />;
  if (path.startsWith("/assigned-letter/")) return <AssignedLetterFlowScreen letterId={decodeURIComponent(path.slice("/assigned-letter/".length))} />;
  if (path.startsWith("/read-letter/")) return <ReadLetterFlowScreen letterId={decodeURIComponent(path.slice("/read-letter/".length))} />;
  if (path.startsWith("/assign-letter/")) return <AssignLetterScreen letterId={decodeURIComponent(path.slice("/assign-letter/".length))} />;
  if (path.startsWith("/write-reply/")) return <WriteReplyFlowScreen letterId={decodeURIComponent(path.slice("/write-reply/".length))} />;
  if (path.startsWith("/reply-review/")) return <ReplyReviewScreen letterId={decodeURIComponent(path.slice("/reply-review/".length))} />;
  if (path.startsWith("/reply-sending/")) return <ReplySendingTransitionScreen letterId={decodeURIComponent(path.slice("/reply-sending/".length))} />;
  if (path.startsWith("/reply-sent/")) return <ReplySentScreen letterId={decodeURIComponent(path.slice("/reply-sent/".length))} />;
  if (path.startsWith("/letter-journey/")) return <LetterJourneyScreen letterId={decodeURIComponent(path.slice("/letter-journey/".length))} />;
  if (path.startsWith("/reply-arrived/")) return <ReplyArrivedScreen letterId={decodeURIComponent(path.slice("/reply-arrived/".length))} />;
  if (path.startsWith("/letter-withdrawn/")) return <LetterWithdrawnScreen letterId={decodeURIComponent(path.slice("/letter-withdrawn/".length))} />;
  if (path === "/mailbox-my-replied-demo") return <MyLetterRepliedDemoScreen />;
  if (path.startsWith("/mailbox/my/")) return <MyLetterDetailScreen letterId={decodeURIComponent(path.slice("/mailbox/my/".length))} />;
  if (path.startsWith("/mailbox/replied/")) return <RepliedLetterDetailScreen letterId={decodeURIComponent(path.slice("/mailbox/replied/".length))} />;
  if (path === "/write-letter-a") return <WriteLetterAScreen />;
  if (path === "/write-letter-b") return <WriteLetterBScreen />;
  if (path === "/write-letter-c") return <WriteLetterCScreen />;
  // Legacy emotion-journey routes are preserved in source and storage only.
  // They are intentionally isolated from the active user service flow.
  if (["/emotion-check-in", "/writing-method", "/guided-writing", "/emotion-after", "/emotion-summary", "/guided-summary"].includes(path)) return <RedirectToHome />;
  if (path === "/read-letter") return <ReadLetterScreen />;
  if (path === "/read-letter-a") return <ReadLetterAScreen />;
  if (path === "/read-letter-b") return <ReadLetterBScreen />;
  if (path === "/read-letter-c") return <ReadLetterCScreen />;
  // 답장 쓰기 확정본. 실제 흐름은 /write-reply/:letterId 로 들어오고,
  // 이름만 부른 /write-reply 는 시안 확인용으로 표본 편지를 띄운다.
  // (예전 /write-reply 시안 WriteReplyScreen 은 이 화면으로 대체되었다.)
  if (path === "/write-reply") return <WriteReplyFlowScreen letterId="sample-waiting-letter-one" />;
  if (path === "/write-reply-a") return <WriteReplyAScreen />;
  if (path === "/write-reply-b") return <WriteReplyBScreen />;
  if (path === "/write-reply-c") return <WriteReplyCScreen />;
  if (path === "/reply-preview") return <ReplyPreviewScreen />;
  if (path === "/mailbox-demo-inline-directional-status") return <MailboxDemoInlineDirectionalStatusScreen />;
  if (path === "/mailbox-demo-directional-status") return <MailboxDemoDirectionalStatusScreen />;
  if (path === "/mailbox-demo-status-icons") return <MailboxDemoStatusIconScreen />;
  if (path === "/mailbox-demo-upload-icons") return <MailboxDemoUploadedIconSetScreen />;
  if (path === "/mailbox-demo-icons") return <MailboxDemoIconSetScreen />;
  if (path === "/mailbox-demo") return <MailboxDemoScreen />;
  if (path === "/mailbox-empty") return <MailboxEmptyDemoScreen />;
  if (path === "/mailbox-reply-arrived-demo") return <MailboxReplyArrivedDemoScreen />;
  if (path === "/mailbox") return <MailboxScreen />;
  if (path === "/mailbox-concept-a") return <MailboxConceptAScreen />;
  if (path === "/mailbox-concept-b") return <MailboxConceptBScreen />;
  if (path === "/mailbox-concept-c") return <MailboxConceptCScreen />;
  if (path === "/mailbox-concept-d") return <MailboxConceptDScreen />;
  if (path === "/listen-entry-a") return <ListenEntryAScreen />;
  if (path === "/listen-entry-b") return <ListenEntryBScreen />;
  if (path === "/listen-entry-c") return <ListenEntryCScreen />;
  if (path === "/listen-entry-empty") return <ListenEntryEmptyScreen />;
  // Direction A is retained as a visual reference; its former user entry is now /home.
  if (path === "/direction-a") return <RedirectToHome />;
  if (path === "/direction-b") return <DirectionBScreen />;
  if (path === "/direction-c") return <DirectionCScreen />;
  return <NotFoundScreen />;
}
