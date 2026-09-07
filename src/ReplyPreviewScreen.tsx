import { useEffect, useRef, useState } from "react";
import { getCurrentAppSearchParams, navigateTo } from "./navigation";
import { clearReplyDraft, readReplyDraft, writeReplyDraft, type ReplyDraft } from "./replyDraft";
import { clearEmotionJourney, saveEmotionRecord } from "./emotionJourney";
import { clearLetterPreviewDraft, readLetterPreviewDraft } from "./letterPreviewDraft";
import { formatDateTime } from "./datetime";

type PreviewState = "normal" | "short" | "long" | "sending" | "departing" | "sent" | "error" | "empty";
type SendState = "idle" | "sending" | "departing" | "error" | "sent";

const NORMAL_REPLY = `많이 지쳐 있었겠다는 생각이 들었어요.

당장 괜찮아지지 않아도 괜찮다고 말해주고 싶어요.
누군가가 당신의 이야기를 끝까지 읽었다는 사실만은
기억해주셨으면 좋겠어요.`;

const SHORT_REPLY = "당신의 이야기를 끝까지 읽었어요. 오늘은 잠시 쉬어가도 괜찮아요.";

const LONG_REPLY = `${NORMAL_REPLY}

편지를 읽는 동안 얼마나 오래 혼자 버텨왔을지 자꾸 마음에 남았어요. 열심히 해도 달라지는 것이 없다고 느껴질 때는 하루를 보내는 일만으로도 많이 지칠 것 같아요.

지금 당장 새로운 힘을 내거나 답을 찾지 않아도 괜찮다고 말해주고 싶어요. 주변의 말처럼 조금만 더 버텨야 한다는 부담까지 혼자 안고 있지 않았으면 해요.

해결 방법을 건네기보다, 여기에서 당신의 이야기를 끝까지 읽은 사람이 있다는 마음을 전하고 싶어요. 오늘만큼은 스스로를 재촉하지 않고 잠시 쉬어가도 괜찮아요.

이 답장이 무언가를 바꾸지는 못하더라도, 적어도 이 순간만큼은 혼자가 아니라는 마음으로 닿았으면 좋겠어요.`;

const PREVIEW_STATES: PreviewState[] = ["normal", "short", "long", "sending", "departing", "sent", "error", "empty"];

function getPreviewState(): PreviewState | null {
  const value = getCurrentAppSearchParams().get("state") as PreviewState | null;
  return value && PREVIEW_STATES.includes(value) ? value : null;
}

function makePrototypeDraft(state: PreviewState): ReplyDraft | null {
  if (state === "empty") return null;

  const replyBody = state === "short" ? SHORT_REPLY : state === "long" ? LONG_REPLY : NORMAL_REPLY;
  return {
    recipientName: "새벽구름",
    replyBody,
    sourceLetterId: "sample-letter-001",
    draftId: `preview-${state}`,
    editedAt: new Date().toISOString(),
  };
}

function PreviewExitDialog({
  onContinue,
  onSaveAndExit,
  onDiscardAndExit,
}: {
  onContinue: () => void;
  onSaveAndExit: () => void;
  onDiscardAndExit: () => void;
}) {
  const continueRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    continueRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onContinue();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onContinue]);

  return (
    <div className="preview-overlay" role="presentation">
      <section
        className="preview-exit-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-exit-title"
        aria-describedby="preview-exit-copy"
      >
        <p className="preview-dialog-kicker">보내기 전 확인</p>
        <h2 id="preview-exit-title">아직 보내지 않은 마음이 있어요</h2>
        <p id="preview-exit-copy">지금 나가면 작성한 내용이 사라질 수 있어요.</p>
        <div className="preview-dialog-actions">
          <button ref={continueRef} type="button" className="preview-primary-button" onClick={onContinue}>
            계속 확인하기
          </button>
          <button type="button" className="preview-outline-button" onClick={onSaveAndExit}>
            임시 저장하고 나가기
          </button>
          <button type="button" className="preview-text-button" onClick={onDiscardAndExit}>
            저장하지 않고 나가기
          </button>
        </div>
      </section>
    </div>
  );
}

export function ReplyPreviewScreen() {
  const searchParams = getCurrentAppSearchParams();
  const letterPreview = searchParams.get("from") === "letter";
  const letterJourney = searchParams.get("journey") === "guided" ? "guided" : "emotion";
  const prototypeState = getPreviewState();
  const [draft] = useState<ReplyDraft | null>(() => {
    if (prototypeState) return makePrototypeDraft(prototypeState);
    return letterPreview ? readLetterPreviewDraft() : readReplyDraft();
  });
  const [sendState, setSendState] = useState<SendState>(() => {
    if (prototypeState === "sending") return "sending";
    if (prototypeState === "departing") return "departing";
    if (prototypeState === "sent") return "sent";
    if (prototypeState === "error") return "error";
    return "idle";
  });
  const [exitOpen, setExitOpen] = useState(false);
  const sendTimerRef = useRef<number | null>(null);
  const body = draft?.replyBody.trim() ?? "";
  const isEmpty = !body;

  useEffect(() => () => {
    if (sendTimerRef.current !== null) window.clearTimeout(sendTimerRef.current);
  }, []);

  function returnToWriting() {
    navigateTo(letterPreview
      ? `/write-letter-a?journey=${letterJourney}&delivery=1`
      : "/write-reply-a?resume=draft");
  }

  function requestHome() {
    if (isEmpty) navigateTo("/direction-a");
    else setExitOpen(true);
  }

  function saveAndExit() {
    if (draft && !letterPreview) {
      writeReplyDraft({
        replyBody: draft.replyBody,
        recipientName: draft.recipientName,
        sourceLetterId: draft.sourceLetterId,
        cursorPosition: draft.cursorPosition,
      });
    }
    navigateTo("/direction-a");
  }

  function discardAndExit() {
    if (letterPreview) clearLetterPreviewDraft();
    else clearReplyDraft();
    navigateTo("/direction-a");
  }

  function sendReply() {
    if (isEmpty || sendState === "sending" || sendState === "departing" || sendState === "sent") return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (letterPreview) {
      saveEmotionRecord("anonymous");
      clearEmotionJourney();
      clearLetterPreviewDraft();
    }
    setSendState("sending");
    sendTimerRef.current = window.setTimeout(() => {
      setSendState("departing");
      sendTimerRef.current = window.setTimeout(() => {
        setSendState("sent");
        sendTimerRef.current = null;
      }, reduceMotion ? 120 : 880);
    }, reduceMotion ? 120 : 620);
  }

  if (isEmpty) {
    return (
      <main className="mobile-prototype reply-preview-screen reply-preview-screen--empty">
        <header className="reply-preview-topbar">
          <button type="button" onClick={returnToWriting} aria-label="마음 남기기 화면으로 돌아가기">
            <span aria-hidden="true">←</span>
          </button>
          <p>마음 미리보기</p>
          <button type="button" onClick={requestHome} aria-label="홈으로 가기">홈</button>
        </header>
        <section className="preview-empty-content" aria-labelledby="preview-empty-title">
          <p className="preview-brand">공감편지</p>
          <img src="/assets/write-letter-object-tight.png" alt="" aria-hidden="true" />
          <h1 id="preview-empty-title">아직 작성한 마음이 없어요</h1>
          <p>먼저 마음을 적은 뒤 다시 확인해주세요.</p>
        </section>
        <div className="reply-preview-fixed-actions reply-preview-fixed-actions--single">
          <button type="button" className="preview-primary-button" onClick={returnToWriting}>마음 작성하기</button>
        </div>
      </main>
    );
  }

  if (sendState === "sent") {
    return (
      <main className="mobile-prototype reply-preview-screen reply-preview-complete" aria-labelledby="reply-complete-title">
        <section className="reply-complete-content">
          <img
            className="reply-complete-envelope"
            src="/assets/reply-sent-lavender-envelope.png"
            alt=""
            aria-hidden="true"
          />
          <p className="reply-complete-kicker">마음 전송 완료</p>
          <h1 id="reply-complete-title">
            마음을
            <br />
            잘 전했어요
          </h1>
          <p>작성한 내용은 아직 이 기기에 보관되어 있어요.</p>
        </section>
        <div className="reply-preview-fixed-actions reply-preview-fixed-actions--single">
          <button type="button" className="preview-primary-button" onClick={() => navigateTo(letterPreview ? "/direction-a" : "/read-letter-c")}>
            돌아가기
          </button>
        </div>
      </main>
    );
  }

  const actionLabel = sendState === "sending"
    ? letterPreview ? "편지를 보내는 중" : "마음을 보내는 중"
    : sendState === "error"
      ? "다시 보내기"
      : letterPreview ? "편지 보내기" : "이 마음 보내기";

  return (
    <main
      className={`mobile-prototype reply-preview-screen${sendState === "departing" ? " is-departing" : ""}`}
      aria-busy={sendState === "sending" || sendState === "departing"}
    >
      <header className="reply-preview-topbar">
        <button type="button" onClick={returnToWriting} aria-label="마음 남기기 화면으로 돌아가기">
          <span aria-hidden="true">←</span>
        </button>
        <p>{letterPreview ? "편지 미리보기" : "마음 미리보기"}</p>
        <button type="button" onClick={requestHome} aria-label="홈으로 가기">홈</button>
      </header>

      <div className="reply-preview-scroll">
        <section className="reply-preview-intro" aria-labelledby="reply-preview-page-title">
          <div>
            <p className="preview-brand">공감편지</p>
            <h1 id="reply-preview-page-title">
              이 마음을 보내기 전에
              <br />
              한 번 더 확인해주세요
            </h1>
            <p>
              짧아도 괜찮아요.
              <br />
              상대를 판단하거나 가르치려는 말이 아닌지
              <br />
              천천히 살펴봐주세요.
            </p>
          </div>
          <img src="/assets/write-letter-object-tight.png" alt="" aria-hidden="true" />
        </section>

        {sendState === "error" && (
          <section className="preview-send-notice preview-send-notice--error" role="alert">
            <strong>마음을 보내지 못했어요.</strong>
            <p>
              작성한 내용은 그대로 보관되어 있어요.
              <br />
              잠시 후 다시 시도해주세요.
            </p>
          </section>
        )}

        {(sendState === "sending" || sendState === "departing") && (
          <p className="preview-send-notice preview-send-notice--sending" role="status" aria-live="polite">
            <span aria-hidden="true" />
            마음을 조심스럽게 보내고 있어요.
          </p>
        )}

        <article className="reply-preview-paper" aria-label={`${draft?.recipientName ?? "새벽구름"}에게 보내는 마음`}>
          <p className="preview-recipient">{draft?.recipientName ?? "새벽구름"}에게</p>
          <div className="preview-letter-body">
            {body.split("\n").map((line, index) => (
              line ? <p key={`${line.slice(0, 16)}-${index}`}>{line}</p> : <span key={`space-${index}`} aria-hidden="true" />
            ))}
          </div>
          <p className="preview-edited-at">
            {draft?.editedAt
              ? `${formatDateTime(draft.editedAt)}에 마지막으로 다듬었어요.`
              : "보내기 전 마지막으로 살펴보는 마음이에요."}
          </p>
        </article>

        <section className="preview-check-guide" aria-labelledby="preview-check-title">
          <h2 id="preview-check-title">보내기 전, 잠시 살펴봐주세요</h2>
          <ul>
            <li>상대의 감정을 판단하거나 단정하지 않았는지</li>
            <li>내 경험이나 해결 방법을 강요하지 않았는지</li>
            <li>이름, 연락처, 주소 등 개인정보를 적지 않았는지</li>
          </ul>
        </section>
      </div>

      <div className="reply-preview-fixed-actions" aria-label="마음 미리보기 행동">
        <button type="button" className="preview-outline-button" onClick={returnToWriting}>
          {letterPreview ? "내용 수정하기" : "수정하기"}
        </button>
        <button
          type="button"
          className="preview-primary-button"
          onClick={sendReply}
          disabled={sendState === "sending" || sendState === "departing"}
        >
          {sendState === "sending" && <span className="preview-button-loader" aria-hidden="true" />}
          {actionLabel}
        </button>
      </div>

      {exitOpen && (
        <PreviewExitDialog
          onContinue={() => setExitOpen(false)}
          onSaveAndExit={saveAndExit}
          onDiscardAndExit={discardAndExit}
        />
      )}
    </main>
  );
}
