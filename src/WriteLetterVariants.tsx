import { useEffect, useRef, useState, type ReactNode } from "react";
import { getCurrentAppSearchParams, navigateBack, navigateTo, replaceAppState } from "./navigation";
import {
  readEmotionJourney,
  updateEmotionJourney,
} from "./emotionJourney";
import { writeLetterPreviewDraft } from "./letterPreviewDraft";

type VariantState = "empty" | "writing" | "long" | "saved" | "privacy";

const DRAFT = {
  title: "요즘 내 마음이 머무는 곳",
  body: "별일 아닌 것처럼 넘겼는데, 오늘은 그 마음이 자꾸 생각나요. 누군가에게 한 번쯤은 솔직하게 말해보고 싶었어요.",
};

const LONG_BODY = `요즘에는 하루를 다 보내고 나면 무엇을 했는지 잘 떠오르지 않아요. 분명 바쁘게 움직였는데 마음 한쪽은 계속 멈춰 있는 것 같아요.

괜찮다고 말하는 일이 익숙해져서인지, 정작 제 마음을 설명하려고 하면 어디서부터 시작해야 할지 모르겠어요. 사소한 말에도 오래 마음이 쓰이고, 아무렇지 않은 척하고 돌아선 날에는 혼자 남은 시간이 더 길게 느껴져요.

해결해 달라는 뜻은 아니에요. 그저 이런 마음도 있었다는 걸 누군가가 천천히 읽어주면 좋겠어요. 지금의 저를 서둘러 판단하지 않고, 문장 끝까지 잠시 머물러 주었으면 해요.`;

const ANONYMOUS_NAMES = ["새벽구름", "작은등불", "느린별", "고요한숲"];

const STATE_OPTIONS: readonly { value: VariantState; label: string }[] = [
  { value: "empty", label: "빈 편지" },
  { value: "writing", label: "작성 중" },
  { value: "long", label: "긴 편지" },
  { value: "saved", label: "저장 완료" },
  { value: "privacy", label: "개인정보 강조" },
];

const STATE_STATUS_LABELS: Record<VariantState, string> = {
  empty: "작성 전",
  writing: "작성 중",
  long: "긴 글 작성 중",
  saved: "임시 저장 완료",
  privacy: "안내 확인",
};

function getInitialState(): VariantState {
  const state = getCurrentAppSearchParams().get("state");
  return STATE_OPTIONS.some((option) => option.value === state)
    ? (state as VariantState)
    : "empty";
}

function goTo(path: string) {
  navigateTo(path);
}

function goBack() {
  navigateBack("/direction-a");
}

function VariantFrame({ className, children }: { className: string; children: ReactNode }) {
  return <main className={`mobile-prototype write-variant-screen ${className}`}>{children}</main>;
}

function VariantTopbar({
  label,
  state,
  onBack = goBack,
  homeAction = false,
}: {
  label: string;
  state: VariantState;
  onBack?: () => void;
  homeAction?: boolean;
}) {
  return (
    <header className="variant-topbar">
      <button type="button" className={`variant-back-button${homeAction ? " variant-home-button" : ""}`} onClick={onBack} aria-label={homeAction ? "홈" : "뒤로가기"}>
        <span aria-hidden="true">{homeAction ? "홈" : "←"}</span>
      </button>
      <div className="variant-topbar__tools">
        <span>{label}</span>
        <span
          className={`variant-current-status variant-current-status--${state}`}
          role="status"
          aria-live="polite"
        >
          {STATE_STATUS_LABELS[state]}
        </span>
      </div>
    </header>
  );
}

function VariantIntro({
  compact = false,
  showKicker = true,
  journeyMode = false,
}: {
  compact?: boolean;
  showKicker?: boolean;
  journeyMode?: boolean;
}) {
  return (
    <section className={`variant-intro${compact ? " variant-intro--compact" : ""}`}>
      {!compact && showKicker && <p className="letter-kicker">A LETTER FROM YOUR HEART</p>}
      <h1>
        마음을 편지에
        <br />
        담아보세요
      </h1>
      <p>
        {journeyMode ? "정리되지 않아도 괜찮아요." : "잘 정리된 문장이 아니어도 괜찮아요."}
        <br />
        {journeyMode ? "지금 떠오르는 마음부터 적어보세요." : "지금 떠오르는 말부터 천천히 적어보세요."}
      </p>
    </section>
  );
}

function PrivacyNotice({ emphasized = false }: { emphasized?: boolean }) {
  return (
    <aside className={`variant-privacy${emphasized ? " is-emphasized" : ""}`}>
      <strong>편지를 보내기 전에</strong>
      <p>
        이름, 전화번호, 주소, 학교나 회사 이름처럼
        <br />
        나를 알아볼 수 있는 정보는 적지 말아주세요.
      </p>
    </aside>
  );
}

function SaveNotice() {
  return (
    <p className="variant-save-notice" role="status">
      임시 저장했어요. 이 기기에서 이어서 쓸 수 있어요.
    </p>
  );
}

function SaveToast({ isLeaving }: { isLeaving: boolean }) {
  return (
    <p className={`variant-save-toast${isLeaving ? " is-leaving" : ""}`} role="status" aria-live="polite">
      임시 저장했어요. 이 기기에서 이어서 쓸 수 있어요.
    </p>
  );
}

function VariantPreview({
  title,
  name,
  body,
  onClose,
  canSend = false,
  onSend,
}: {
  title: string;
  name: string;
  body: string;
  onClose: () => void;
  canSend?: boolean;
  onSend?: () => void;
}) {
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="letter-overlay" role="presentation">
      <section
        className="letter-preview"
        role="dialog"
        aria-modal="true"
        aria-labelledby="variant-preview-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {sent ? (
          <div className="variant-send-complete">
            <p className="letter-kicker">전달 완료</p>
            <h2 id="variant-preview-title">편지가 조심스럽게 전달됐어요</h2>
            <p className="variant-send-complete-copy">
              이제 누군가가 당신의 마음을 천천히 만나게 될 거예요.
            </p>
            <button
              type="button"
              className="letter-button letter-button--primary"
              onClick={() => goTo("/direction-a")}
            >
              마음 선택으로 돌아가기
            </button>
          </div>
        ) : (
          <>
            <p className="letter-kicker">편지 미리보기</p>
            <h2 id="variant-preview-title">{title.trim() || "제목 없는 편지"}</h2>
            <p className="preview-byline">{name.trim() || "이름 없는 마음"}으로부터</p>
            <p className="preview-body">{body}</p>
            {canSend ? (
              <div className="variant-preview-actions">
                <button
                  type="button"
                  className="letter-button letter-button--secondary"
                  onClick={onClose}
                >
                  내용 수정하기
                </button>
                <button
                  type="button"
                  className="letter-button letter-button--primary"
                  onClick={() => {
                    onSend?.();
                    setSent(true);
                  }}
                >
                  편지 보내기
                </button>
              </div>
            ) : (
              <button type="button" className="letter-button letter-button--primary" onClick={onClose}>
                편지로 돌아가기
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}

type VariantLetterOptions = {
  preserveInitialValues?: boolean;
  initialTitle?: string;
  initialBody?: string;
  initialAnonymousName?: string;
  initialPreviewOpen?: boolean;
};

function useVariantLetter(options: VariantLetterOptions = {}) {
  const [screenState, setScreenState] = useState<VariantState>(getInitialState);
  const [title, setTitle] = useState(options.initialTitle ?? "");
  const [body, setBody] = useState(options.initialBody ?? "");
  const [anonymousName, setAnonymousName] = useState(options.initialAnonymousName ?? ANONYMOUS_NAMES[0]);
  const [previewOpen, setPreviewOpen] = useState(options.initialPreviewOpen ?? false);
  const [saveToastVisible, setSaveToastVisible] = useState(false);
  const [saveToastLeaving, setSaveToastLeaving] = useState(false);
  const saveToastTimerRef = useRef<number | null>(null);
  const saveToastExitTimerRef = useRef<number | null>(null);

  function showSaveToast() {
    if (saveToastTimerRef.current !== null) {
      window.clearTimeout(saveToastTimerRef.current);
    }
    if (saveToastExitTimerRef.current !== null) {
      window.clearTimeout(saveToastExitTimerRef.current);
    }

    setSaveToastVisible(true);
    setSaveToastLeaving(false);
    saveToastTimerRef.current = window.setTimeout(() => {
      setSaveToastLeaving(true);
      saveToastTimerRef.current = null;
      saveToastExitTimerRef.current = window.setTimeout(() => {
        setSaveToastVisible(false);
        setSaveToastLeaving(false);
        saveToastExitTimerRef.current = null;
      }, 220);
    }, 2600);
  }

  function hideSaveToastImmediately() {
    if (saveToastTimerRef.current !== null) window.clearTimeout(saveToastTimerRef.current);
    if (saveToastExitTimerRef.current !== null) window.clearTimeout(saveToastExitTimerRef.current);
    saveToastTimerRef.current = null;
    saveToastExitTimerRef.current = null;
    setSaveToastVisible(false);
    setSaveToastLeaving(false);
  }

  function applyState(next: VariantState) {
    setScreenState(next);
    setPreviewOpen(false);
    replaceAppState(next);

    if (next === "empty") {
      setTitle("");
      setBody("");
    } else if (next === "long") {
      setTitle("오래 마음에 남아 있던 이야기");
      setBody(LONG_BODY);
    } else {
      setTitle(DRAFT.title);
      setBody(DRAFT.body);
    }
  }

  useEffect(() => {
    if (options.preserveInitialValues) {
      setScreenState(options.initialBody?.trim() ? "writing" : "empty");
    } else {
      applyState(screenState);
    }
    // The initial prototype state should be applied only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (screenState === "saved") {
      showSaveToast();
    } else {
      hideSaveToastImmediately();
    }
  }, [screenState]);

  useEffect(() => {
    return () => {
      hideSaveToastImmediately();
    };
  }, []);

  function markEditing() {
    if (screenState !== "long") setScreenState("writing");
    hideSaveToastImmediately();
  }

  function cycleName() {
    const currentIndex = ANONYMOUS_NAMES.indexOf(anonymousName);
    setAnonymousName(ANONYMOUS_NAMES[(currentIndex + 1) % ANONYMOUS_NAMES.length]);
    markEditing();
  }

  return {
    screenState,
    title,
    body,
    anonymousName,
    previewOpen,
    applyState,
    setTitle: (value: string) => {
      setTitle(value);
      markEditing();
    },
    setBody: (value: string) => {
      setBody(value);
      markEditing();
    },
    setAnonymousName: (value: string) => {
      setAnonymousName(value);
      markEditing();
    },
    cycleName,
    save: () => {
      setScreenState("saved");
      showSaveToast();
    },
    saveToastVisible,
    saveToastLeaving,
    openPreview: () => setPreviewOpen(true),
    closePreview: () => setPreviewOpen(false),
  };
}

function PreviewIfOpen({
  letter,
  canSend = false,
  onSend,
}: {
  letter: ReturnType<typeof useVariantLetter>;
  canSend?: boolean;
  onSend?: () => void;
}) {
  return letter.previewOpen ? (
    <VariantPreview
      title={letter.title}
      name={letter.anonymousName}
      body={letter.body}
      onClose={letter.closePreview}
      canSend={canSend}
      onSend={onSend}
    />
  ) : null;
}

export function WriteLetterAScreen() {
  const params = getCurrentAppSearchParams();
  const journeyMode = params.get("journey") === "emotion" || params.get("journey") === "guided";
  const guidedJourney = params.get("journey") === "guided";
  const deliveryMode = journeyMode && params.get("delivery") === "1";
  const [journeySnapshot] = useState(() => journeyMode ? readEmotionJourney() : null);
  const letter = useVariantLetter({
    preserveInitialValues: journeyMode,
    initialTitle: journeySnapshot?.title,
    initialBody: journeySnapshot?.content,
    initialAnonymousName: journeySnapshot?.anonymousName,
    initialPreviewOpen: false,
  });
  const privacyEmphasized = letter.screenState === "privacy";

  useEffect(() => {
    if (!journeyMode || !journeySnapshot) return;
    updateEmotionJourney({
      title: letter.title,
      content: letter.body,
      anonymousName: letter.anonymousName,
      status: "draft",
    });
  }, [journeyMode, journeySnapshot, letter.title, letter.body, letter.anonymousName]);

  const continueJourney = () => {
    if (!letter.body.trim()) return;
    updateEmotionJourney({
      title: letter.title,
      content: letter.body,
      anonymousName: letter.anonymousName,
    });
    navigateTo("/emotion-after");
  };

  const saveLetter = () => {
    letter.save();
    if (journeyMode) {
      updateEmotionJourney({
        title: letter.title,
        content: letter.body,
        anonymousName: letter.anonymousName,
        status: "saved",
      });
    }
  };

  const openDeliveryPreview = () => {
    updateEmotionJourney({
      title: letter.title,
      content: letter.body,
      anonymousName: letter.anonymousName,
      status: "draft",
    });
    writeLetterPreviewDraft({
      title: letter.title,
      body: letter.body,
      anonymousName: letter.anonymousName,
    });
    navigateTo(`/reply-preview?from=letter&journey=${guidedJourney ? "guided" : "emotion"}`);
  };

  return (
    <VariantFrame className="write-variant-a">
      <VariantTopbar
        label="편지 쓰기"
        state={letter.screenState}
        onBack={deliveryMode ? () => navigateTo(guidedJourney ? "/guided-summary" : "/direction-a") : journeyMode ? () => navigateTo(guidedJourney ? "/guided-summary" : "/writing-method") : goBack}
        homeAction={deliveryMode && !guidedJourney}
      />
      <div className="variant-scroll-region">
        <div className="a-intro-wrap">
          <VariantIntro showKicker={false} journeyMode={journeyMode} />
          <img
            className="a-intro-object"
            src="/assets/write-letter-object-reframed.png"
            alt="잉크병과 만년필, 종이 가장자리"
          />
        </div>
        {journeyMode && journeySnapshot?.emotion && (
          <p className="a-emotion-context">지금의 마음 · {journeySnapshot.emotion}</p>
        )}
        <form className="a-letter-sheet" onSubmit={(event) => event.preventDefault()}>
          <div className="a-sheet-heading">
            <label htmlFor="letter-a-title">편지 제목</label>
            <input
              id="letter-a-title"
              value={letter.title}
              onChange={(event) => letter.setTitle(event.target.value)}
              placeholder="지금 마음을 한 문장으로 적어보세요"
            />
          </div>
          <div className="a-sheet-body">
            <label className="sr-only" htmlFor="letter-a-body">
              편지 내용
            </label>
            <textarea
              id="letter-a-body"
              value={letter.body}
              onChange={(event) => letter.setBody(event.target.value)}
              placeholder={"오늘 있었던 일, 말하지 못했던 마음,\n누군가에게 꼭 들려주고 싶었던 이야기를 적어보세요."}
              rows={letter.screenState === "long" ? 24 : 18}
            />
            <span>{letter.body.length.toLocaleString()}자</span>
          </div>
          <div className="a-sheet-signature">
            <label htmlFor="letter-a-name">나의 이름</label>
            <div>
              <input
                id="letter-a-name"
                value={letter.anonymousName}
                onChange={(event) => letter.setAnonymousName(event.target.value)}
              />
              <button type="button" onClick={letter.cycleName}>
                다른 이름 받기
              </button>
            </div>
          </div>
          <PrivacyNotice emphasized={privacyEmphasized} />
        </form>
      </div>
      {letter.saveToastVisible && <SaveToast isLeaving={letter.saveToastLeaving} />}
      <div className="a-fixed-actions" aria-label="편지 작성 행동">
        <button type="button" className="variant-secondary-action" onClick={saveLetter}>
          임시 저장
        </button>
        <button
          type="button"
          className="letter-button letter-button--primary"
          onClick={deliveryMode ? openDeliveryPreview : journeyMode ? continueJourney : letter.openPreview}
          disabled={!letter.body.trim()}
        >
          {deliveryMode ? "편지 미리보기" : journeyMode ? "마음을 정리했어요" : "편지 미리보기"}
        </button>
      </div>
      {!journeyMode && <PreviewIfOpen letter={letter} canSend />}
    </VariantFrame>
  );
}

export function WriteLetterBScreen() {
  const letter = useVariantLetter();
  const privacyEmphasized = letter.screenState === "privacy";

  return (
    <VariantFrame className="write-variant-b">
      <VariantTopbar label="편집형" state={letter.screenState} />
      <div className="variant-scroll-region b-editorial-page">
        <header className="b-editorial-hero">
          <VariantIntro />
          <img src="/assets/write-letter-object-tight.png" alt="잉크병과 만년필, 종이 가장자리" />
        </header>
        {letter.screenState === "saved" && <SaveNotice />}

        <form className="b-editorial-form" onSubmit={(event) => event.preventDefault()}>
          <label className="b-editorial-row" htmlFor="letter-b-title">
            <span className="b-editorial-index">01</span>
            <span className="b-editorial-content">
              <strong>편지 제목</strong>
              <input
                id="letter-b-title"
                value={letter.title}
                onChange={(event) => letter.setTitle(event.target.value)}
                placeholder="지금 마음을 한 문장으로 적어보세요"
              />
            </span>
          </label>

          <label className="b-editorial-row b-editorial-row--body" htmlFor="letter-b-body">
            <span className="b-editorial-index">02</span>
            <span className="b-editorial-content">
              <span className="b-editorial-label-line">
                <strong>편지 내용</strong>
                <small>{letter.body.length.toLocaleString()}자</small>
              </span>
              <textarea
                id="letter-b-body"
                value={letter.body}
                onChange={(event) => letter.setBody(event.target.value)}
                placeholder={"잘 정리하지 않아도 괜찮아요.\n떠오르는 말부터 적어보세요."}
                rows={letter.screenState === "long" ? 20 : 13}
              />
            </span>
          </label>

          <section className="b-editorial-row b-editorial-row--name" aria-labelledby="letter-b-name-label">
            <span className="b-editorial-index">03</span>
            <div className="b-editorial-content">
              <strong id="letter-b-name-label">익명 이름</strong>
              <div>
                <input
                  aria-labelledby="letter-b-name-label"
                  value={letter.anonymousName}
                  onChange={(event) => letter.setAnonymousName(event.target.value)}
                />
                <button type="button" onClick={letter.cycleName}>
                  이름 바꾸기
                </button>
              </div>
              <small>실제 이름 대신 이 이름으로 편지가 전달돼요.</small>
            </div>
          </section>
          <PrivacyNotice emphasized={privacyEmphasized} />
        </form>
      </div>

      <div className="b-editorial-actions" aria-label="편지 작성 행동">
        <button type="button" className="variant-secondary-action" onClick={letter.save}>
          임시 저장
        </button>
        <button
          type="button"
          className="letter-button letter-button--primary"
          onClick={letter.openPreview}
          disabled={!letter.body.trim()}
        >
          편지 미리보기
        </button>
      </div>
      <PreviewIfOpen letter={letter} />
    </VariantFrame>
  );
}

export function WriteLetterCScreen() {
  const letter = useVariantLetter();
  const privacyEmphasized = letter.screenState === "privacy";

  return (
    <VariantFrame className="write-variant-c">
      <VariantTopbar label="집중형" state={letter.screenState} />
      <form className="c-focus-page" onSubmit={(event) => event.preventDefault()}>
        <VariantIntro compact />
        {letter.screenState === "saved" && <SaveNotice />}

        <label className="c-body-field" htmlFor="letter-c-body">
          <span>편지 내용</span>
          <textarea
            id="letter-c-body"
            value={letter.body}
            onChange={(event) => letter.setBody(event.target.value)}
            placeholder={"오늘의 마음을\n여기에서 천천히 시작해보세요."}
            rows={letter.screenState === "long" ? 24 : 15}
          />
          <small>{letter.body.length.toLocaleString()}자</small>
        </label>

        <details className="c-fold" key={`title-${letter.screenState}`}>
          <summary>편지 제목</summary>
          <label htmlFor="letter-c-title">
            <span className="sr-only">편지 제목</span>
            <input
              id="letter-c-title"
              value={letter.title}
              onChange={(event) => letter.setTitle(event.target.value)}
              placeholder="지금 마음을 한 문장으로 적어보세요"
            />
          </label>
        </details>

        <details
          className={`c-fold${privacyEmphasized ? " is-emphasized" : ""}`}
          key={`name-${letter.screenState}`}
          open={privacyEmphasized}
        >
          <summary>익명 이름과 보내기 안내</summary>
          <div className="c-fold-name">
            <label htmlFor="letter-c-name">익명 이름</label>
            <div>
              <input
                id="letter-c-name"
                value={letter.anonymousName}
                onChange={(event) => letter.setAnonymousName(event.target.value)}
              />
              <button type="button" onClick={letter.cycleName}>
                바꾸기
              </button>
            </div>
          </div>
          <PrivacyNotice emphasized={privacyEmphasized} />
        </details>
      </form>

      <div className="c-focus-actions" aria-label="편지 작성 행동">
        <button type="button" className="variant-secondary-action" onClick={letter.save}>
          임시 저장
        </button>
        <button
          type="button"
          className="letter-button letter-button--primary"
          onClick={letter.openPreview}
          disabled={!letter.body.trim()}
        >
          편지 미리보기
        </button>
      </div>
      <PreviewIfOpen letter={letter} />
    </VariantFrame>
  );
}
