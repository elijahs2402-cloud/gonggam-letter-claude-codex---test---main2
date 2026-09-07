import { useEffect, useRef, useState, type ReactNode } from "react";
import { getCurrentAppSearchParams, navigateTo, replaceAppState } from "./navigation";
import { clearReplyDraft, readReplyDraft, writeReplyDraft } from "./replyDraft";

type ReplyVariant = "A" | "B" | "C";
type ReplyVariantState = "empty" | "short" | "long" | "saved" | "privacy" | "ready" | "error";

const SHORT_REPLY = `많이 지쳐 있었겠다는 생각이 들었어요.
당장 괜찮아지지 않아도 괜찮다고 말해주고 싶어요.`;

const LONG_REPLY = `편지를 읽는 동안 얼마나 오래 혼자 버텨왔을지 자꾸 마음에 남았어요. 열심히 해도 달라지는 것이 없다고 느껴질 때는 하루를 보내는 일만으로도 많이 지칠 것 같아요.

지금 당장 새로운 힘을 내거나 답을 찾지 않아도 괜찮다고 말해주고 싶어요. 주변의 말처럼 조금만 더 버텨야 한다는 부담까지 혼자 안고 있지 않았으면 해요.

해결 방법을 건네기보다, 여기에서 당신의 이야기를 끝까지 읽은 사람이 있다는 마음을 전하고 싶어요. 오늘만큼은 스스로를 재촉하지 않고 잠시 쉬어가도 괜찮아요.`;

const STATE_LABELS: Record<ReplyVariantState, string> = {
  empty: "작성 전",
  short: "짧게 작성 중",
  long: "긴 답장 작성 중",
  saved: "임시 저장 완료",
  privacy: "안내 확인",
  ready: "미리보기 가능",
  error: "저장 실패",
};

const VALID_STATES = Object.keys(STATE_LABELS) as ReplyVariantState[];

function getInitialState(): ReplyVariantState {
  const state = getCurrentAppSearchParams().get("state");
  return VALID_STATES.includes(state as ReplyVariantState) ? (state as ReplyVariantState) : "empty";
}

function getReplyForState(state: ReplyVariantState) {
  if (state === "empty") return "";
  if (state === "long") return LONG_REPLY;
  return SHORT_REPLY;
}

function getStateForReply(reply: string): ReplyVariantState {
  if (!reply.trim()) return "empty";
  return reply.length > 360 ? "long" : "short";
}

function goTo(path: string) {
  navigateTo(path);
}

function ReplyFrame({ variant, children }: { variant: ReplyVariant; children: ReactNode }) {
  return (
    <main className={`mobile-prototype reply-variant-screen reply-variant-${variant.toLowerCase()}`}>
      {children}
    </main>
  );
}

function ReplyTopbar({
  variant,
  onBack,
  onHome,
}: {
  variant: ReplyVariant;
  onBack: () => void;
  onHome: () => void;
}) {
  return (
    <header className="reply-variant-topbar">
      <button type="button" onClick={onBack} aria-label="뒤로가기">
        <span aria-hidden="true">←</span>
      </button>
      <p>
        마음 남기기 <span>{variant}</span>
      </p>
      <button type="button" onClick={onHome} aria-label="홈으로 가기">
        홈
      </button>
    </header>
  );
}

function ReplyIntro({ compact = false }: { compact?: boolean }) {
  return (
    <section className={`reply-variant-intro${compact ? " is-compact" : ""}`}>
      <h1>이 마음에 답장을 남겨보세요</h1>
      <p>
        정답을 알려주지 않아도 괜찮아요.
        <br />
        읽으며 느낀 마음을 조심스럽게 건네주세요.
      </p>
    </section>
  );
}

function ReplyPrivacy({ emphasized }: { emphasized: boolean }) {
  return (
    <aside className={`reply-variant-privacy${emphasized ? " is-emphasized" : ""}`}>
      <strong>마음을 보내기 전에</strong>
      <p>
        이름, 연락처, 주소, 학교나 회사 이름처럼
        <br />
        나를 알아볼 수 있는 정보는 적지 말아주세요.
      </p>
    </aside>
  );
}

function ReplyStateNotice({ state, onRetry }: { state: ReplyVariantState; onRetry: () => void }) {
  if (state === "error") {
    return (
      <div className="reply-error-notice" role="alert">
        <div>
          <strong>임시 저장하지 못했어요.</strong>
          <p>잠시 후 다시 시도해주세요.</p>
        </div>
        <button type="button" onClick={onRetry}>다시 시도하기</button>
      </div>
    );
  }

  return null;
}

function ReplySaveToast({ isLeaving }: { isLeaving: boolean }) {
  return (
    <p className={`reply-save-toast${isLeaving ? " is-leaving" : ""}`} role="status" aria-live="polite">
      임시 저장했어요. 이 기기에서 이어서 쓸 수 있어요.
    </p>
  );
}

function ReplyTextarea({
  id,
  value,
  onChange,
  rows,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
}) {
  return (
    <div className="reply-textarea-wrap">
      <label className="sr-only" htmlFor={id}>답장 내용</label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={"많이 지쳐 있었겠다는 생각이 들었어요.\n당장 괜찮아지지 않아도 괜찮다고 말해주고 싶어요."}
      />
      <span aria-live="polite">{value.length.toLocaleString()}자</span>
    </div>
  );
}

function ReplyActions({
  onSave,
  onPreview,
  previewDisabled,
}: {
  onSave: () => void;
  onPreview: () => void;
  previewDisabled: boolean;
}) {
  return (
    <div className="reply-fixed-actions" aria-label="답장 작성 행동">
      <button type="button" className="reply-secondary-action" onClick={onSave}>
        임시 저장
      </button>
      <button
        type="button"
        className="letter-button letter-button--primary"
        onClick={onPreview}
        disabled={previewDisabled}
      >
        마음 미리보기
      </button>
    </div>
  );
}

function ExitDialog({
  onContinue,
  onSaveAndExit,
  onDiscardAndExit,
}: {
  onContinue: () => void;
  onSaveAndExit: () => void;
  onDiscardAndExit: () => void;
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onContinue();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onContinue]);

  return (
    <div className="letter-overlay" role="presentation">
      <section className="reply-exit-dialog" role="dialog" aria-modal="true" aria-labelledby="reply-exit-title">
        <p className="letter-kicker">작성 중인 답장</p>
        <h2 id="reply-exit-title">작성 중인 마음을 남겨둘까요?</h2>
        <p>아직 보내지 않은 내용이 있어요.</p>
        <div className="reply-exit-actions">
          <button type="button" className="letter-button letter-button--primary" onClick={onContinue}>
            계속 쓰기
          </button>
          <button type="button" className="letter-button letter-button--secondary" onClick={onSaveAndExit}>
            임시 저장하고 나가기
          </button>
          <button type="button" className="reply-exit-discard" onClick={onDiscardAndExit}>
            저장하지 않고 나가기
          </button>
        </div>
      </section>
    </div>
  );
}

function ReplyPreview({
  body,
  onClose,
  onReturnToLetter,
}: {
  body: string;
  onClose: () => void;
  onReturnToLetter: () => void;
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
      <section className="reply-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="reply-preview-title">
        {sent ? (
          <>
            <p className="letter-kicker">마음 전송 완료</p>
            <h2 id="reply-preview-title">마음을 조심스럽게 건넸어요</h2>
            <p>새벽구름에게 답장이 전달된 것으로 보여주는 샘플 상태예요.</p>
            <button type="button" className="letter-button letter-button--primary" onClick={onReturnToLetter}>
              받은 편지로 돌아가기
            </button>
          </>
        ) : (
          <>
            <p className="letter-kicker">마음 미리보기</p>
            <p className="reply-preview-recipient">새벽구름에게</p>
            <h2 id="reply-preview-title" className="sr-only">새벽구름에게 보내는 답장 미리보기</h2>
            <p className="reply-preview-body">{body}</p>
            <div className="reply-preview-actions">
              <button type="button" className="letter-button letter-button--secondary" onClick={onClose}>
                돌아가기
              </button>
              <button type="button" className="letter-button letter-button--primary" onClick={() => setSent(true)}>
                마음 보내기
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function useReplyVariant() {
  const [restoredDraft] = useState(() => (
    getCurrentAppSearchParams().get("resume") === "draft" ? readReplyDraft() : null
  ));
  const [screenState, setScreenState] = useState<ReplyVariantState>(() => (
    restoredDraft ? getStateForReply(restoredDraft.replyBody) : getInitialState()
  ));
  const [reply, setReply] = useState(() => restoredDraft?.replyBody ?? "");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pendingExit, setPendingExit] = useState<string | null>(null);
  const [saveToastVisible, setSaveToastVisible] = useState(false);
  const [saveToastLeaving, setSaveToastLeaving] = useState(false);
  const allowExitRef = useRef(false);
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

  function applyState(next: ReplyVariantState) {
    setScreenState(next);
    setReply(getReplyForState(next));
    setPreviewOpen(false);
    setPendingExit(null);
    replaceAppState(next);
  }

  useEffect(() => {
    if (restoredDraft) {
      replaceAppState(getStateForReply(restoredDraft.replyBody));
      const restoreCursor = window.requestAnimationFrame(() => {
        const textarea = document.querySelector<HTMLTextAreaElement>(".reply-variant-a textarea");
        if (!textarea || typeof restoredDraft.cursorPosition !== "number") return;
        const cursor = Math.min(restoredDraft.cursorPosition, textarea.value.length);
        textarea.focus({ preventScroll: true });
        textarea.setSelectionRange(cursor, cursor);
      });
      return () => window.cancelAnimationFrame(restoreCursor);
    }
    applyState(screenState);
    // Apply the URL-driven prototype state once on entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (screenState === "saved") {
      showSaveToast();
    } else {
      hideSaveToastImmediately();
    }
  }, [screenState]);

  useEffect(() => () => {
    hideSaveToastImmediately();
  }, []);

  const dirty = reply.trim().length > 0 && screenState !== "saved";

  useEffect(() => {
    const protectDraft = (event: BeforeUnloadEvent) => {
      if (!dirty || allowExitRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protectDraft);
    return () => window.removeEventListener("beforeunload", protectDraft);
  }, [dirty]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const updateHeight = () => {
      document.documentElement.style.setProperty("--reply-visual-height", `${Math.round(viewport.height)}px`);
    };
    updateHeight();
    viewport.addEventListener("resize", updateHeight);
    return () => {
      viewport.removeEventListener("resize", updateHeight);
      document.documentElement.style.removeProperty("--reply-visual-height");
    };
  }, []);

  function updateReply(value: string) {
    setReply(value);
    if (!value.trim()) setScreenState("empty");
    else if (value.length > 360) setScreenState("long");
    else setScreenState("short");
  }

  function requestExit(path: string) {
    if (dirty) setPendingExit(path);
    else {
      allowExitRef.current = true;
      goTo(path);
    }
  }

  function finishAndReturn() {
    allowExitRef.current = true;
    goTo("/read-letter-c");
  }

  function storeCurrentDraft(cursorPosition?: number) {
    return writeReplyDraft({
      recipientName: "새벽구름",
      replyBody: reply,
      sourceLetterId: "sample-letter-001",
      cursorPosition,
    });
  }

  return {
    screenState,
    reply,
    previewOpen,
    pendingExit,
    saveToastVisible,
    saveToastLeaving,
    updateReply,
    applyState,
    save: () => {
      storeCurrentDraft();
      setScreenState("saved");
    },
    retrySave: () => {
      storeCurrentDraft();
      setScreenState("saved");
    },
    openPreview: () => {
      if (reply.trim()) {
        setScreenState("ready");
        setPreviewOpen(true);
      }
    },
    closePreview: () => setPreviewOpen(false),
    openStandalonePreview: () => {
      if (!reply.trim()) return;
      const textarea = document.querySelector<HTMLTextAreaElement>(".reply-variant-a textarea");
      storeCurrentDraft(textarea?.selectionStart);
      setScreenState("ready");
      allowExitRef.current = true;
      goTo("/reply-preview");
    },
    finishAndReturn,
    requestBack: () => requestExit("/read-letter-c"),
    requestHome: () => requestExit("/direction-a"),
    keepWriting: () => setPendingExit(null),
    saveAndExit: () => {
      if (!pendingExit) return;
      const destination = pendingExit;
      allowExitRef.current = true;
      storeCurrentDraft();
      setScreenState("saved");
      setPendingExit(null);
      goTo(destination);
    },
    discardAndExit: () => {
      if (!pendingExit) return;
      const destination = pendingExit;
      allowExitRef.current = true;
      clearReplyDraft();
      setPendingExit(null);
      goTo(destination);
    },
  };
}

function ReplyOverlays({ reply }: { reply: ReturnType<typeof useReplyVariant> }) {
  return (
    <>
      {reply.pendingExit && (
        <ExitDialog
          onContinue={reply.keepWriting}
          onSaveAndExit={reply.saveAndExit}
          onDiscardAndExit={reply.discardAndExit}
        />
      )}
      {reply.previewOpen && (
        <ReplyPreview body={reply.reply} onClose={reply.closePreview} onReturnToLetter={reply.finishAndReturn} />
      )}
    </>
  );
}

function ReplyStatus({ state }: { state: ReplyVariantState }) {
  return (
    <p className={`reply-current-status reply-current-status--${state}`} role="status" aria-live="polite">
      {STATE_LABELS[state]}
    </p>
  );
}

export function WriteReplyAScreen() {
  const reply = useReplyVariant();

  return (
    <ReplyFrame variant="A">
      <ReplyTopbar variant="A" onBack={reply.requestBack} onHome={reply.requestHome} />
      <div className="reply-scroll-region reply-a-scroll">
        <div className="reply-a-intro-wrap">
          <ReplyIntro />
          <img src="/assets/write-letter-object-reframed.png" alt="종이 가장자리와 잉크병, 만년필" />
        </div>
        <ReplyStatus state={reply.screenState} />
        <ReplyStateNotice state={reply.screenState} onRetry={reply.retrySave} />
        <form className="reply-a-sheet" onSubmit={(event) => event.preventDefault()}>
          <p className="reply-recipient">새벽구름에게</p>
          <ReplyTextarea id="reply-a-body" value={reply.reply} onChange={reply.updateReply} rows={16} />
          <p className="reply-example-note">
            짧게 건네도 괜찮아요. 읽으며 가장 먼저 든 마음부터 적어보세요.
          </p>
          <ReplyPrivacy emphasized={reply.screenState === "privacy"} />
        </form>
      </div>
      {reply.saveToastVisible && <ReplySaveToast isLeaving={reply.saveToastLeaving} />}
      <ReplyActions onSave={reply.save} onPreview={reply.openStandalonePreview} previewDisabled={!reply.reply.trim()} />
      <ReplyOverlays reply={reply} />
    </ReplyFrame>
  );
}

export function WriteReplyBScreen() {
  const reply = useReplyVariant();

  return (
    <ReplyFrame variant="B">
      <ReplyTopbar variant="B" onBack={reply.requestBack} onHome={reply.requestHome} />
      <div className="reply-scroll-region reply-b-scroll">
        <ReplyIntro compact />
        <ReplyStatus state={reply.screenState} />
        <ReplyStateNotice state={reply.screenState} onRetry={reply.retrySave} />
        <section className="reply-b-quote" aria-labelledby="reply-b-quote-title">
          <p id="reply-b-quote-title">새벽구름의 편지에서</p>
          <blockquote>“그냥 누군가가 이 마음을 알아줬으면 좋겠어요.”</blockquote>
        </section>
        <form className="reply-b-writing" onSubmit={(event) => event.preventDefault()}>
          <div className="reply-b-heading">
            <p>새벽구름에게</p>
            <span>당신의 마음으로 이어 쓰는 답장</span>
          </div>
          <ReplyTextarea id="reply-b-body" value={reply.reply} onChange={reply.updateReply} rows={17} />
          <ReplyPrivacy emphasized={reply.screenState === "privacy"} />
        </form>
      </div>
      {reply.saveToastVisible && <ReplySaveToast isLeaving={reply.saveToastLeaving} />}
      <ReplyActions onSave={reply.save} onPreview={reply.openPreview} previewDisabled={!reply.reply.trim()} />
      <ReplyOverlays reply={reply} />
    </ReplyFrame>
  );
}

export function WriteReplyCScreen() {
  const reply = useReplyVariant();

  return (
    <ReplyFrame variant="C">
      <ReplyTopbar variant="C" onBack={reply.requestBack} onHome={reply.requestHome} />
      <div className="reply-scroll-region reply-c-scroll">
        <div className="reply-c-heading">
          <p>새벽구름의 편지를 읽고</p>
          <ReplyIntro />
          <img src="/assets/write-letter-object-tight.png" alt="작은 잉크병과 만년필" />
        </div>
        <ReplyStatus state={reply.screenState} />
        <ReplyStateNotice state={reply.screenState} onRetry={reply.retrySave} />
        <form className="reply-c-writing" onSubmit={(event) => event.preventDefault()}>
          <p className="reply-recipient">새벽구름에게</p>
          <ReplyTextarea id="reply-c-body" value={reply.reply} onChange={reply.updateReply} rows={19} />
          <ReplyPrivacy emphasized={reply.screenState === "privacy"} />
        </form>
      </div>
      {reply.saveToastVisible && <ReplySaveToast isLeaving={reply.saveToastLeaving} />}
      <ReplyActions onSave={reply.save} onPreview={reply.openPreview} previewDisabled={!reply.reply.trim()} />
      <ReplyOverlays reply={reply} />
    </ReplyFrame>
  );
}
