import { useState, type ReactNode } from "react";
import { getCurrentAppSearchParams, navigateBack, navigateTo } from "./navigation";

type ReadVariantState = "normal" | "long" | "short" | "loading" | "error";

const READ_SAMPLE = `요즘 회사에서 내가 하는 일이 아무 의미가 없는 것처럼 느껴져요.

열심히 해도 달라지는 건 없고, 새로운 일을 시작할 힘도 없는 것 같아요. 주변에서는 조금만 더 버티라고 하지만, 언제까지 버텨야 하는지도 모르겠어요.

해결 방법을 듣고 싶은 건 아닌데, 그냥 누군가가 이 마음을 알아줬으면 좋겠어요.`;

const READ_SHORT = `요즘 회사에서 내가 하는 일이 아무 의미가 없는 것처럼 느껴져요.

해결 방법보다, 누군가가 이 마음을 알아줬으면 좋겠어요.`;

const READ_LONG = `${READ_SAMPLE}

퇴근하고 집에 돌아오면 오늘도 잘 버틴 건지, 그냥 하루를 흘려보낸 건지 모르겠어요. 예전에는 좋아하던 것들이 있었는데 요즘은 그것들을 다시 꺼내 볼 마음도 잘 생기지 않아요.

아침에 눈을 뜨면 가장 먼저 오늘 해야 할 일을 떠올리는데, 그 순간부터 마음이 조금 무거워져요. 작은 실수를 오래 곱씹고, 잘한 일은 금방 잊어버리는 날이 많아졌어요.

이 말을 가까운 사람에게 하면 괜히 걱정만 끼칠 것 같아서 오래 망설였어요. 괜찮아질 거라고 쉽게 말해주지 않아도 괜찮아요. 그저 제가 이런 시간을 지나고 있다는 걸 알아주는 사람이 한 명쯤 있으면 좋겠어요.

여기까지 읽어준 사람이 있다면, 잠깐이라도 제 마음 곁에 있어 준 것 같아 고마울 것 같아요.`;

const stateLabels: Record<ReadVariantState, string> = {
  normal: "일반 길이 편지",
  long: "매우 긴 편지",
  short: "짧은 편지",
  loading: "편지를 불러오는 중",
  error: "편지를 불러오지 못함",
};

function getReadState(): ReadVariantState {
  const value = getCurrentAppSearchParams().get("state");
  return value === "long" || value === "short" || value === "loading" || value === "error"
    ? value
    : "normal";
}

function getContent(state: ReadVariantState) {
  if (state === "short") return READ_SHORT;
  if (state === "long") return READ_LONG;
  return READ_SAMPLE;
}

function goTo(path: string) {
  navigateTo(path);
}

function goBack() {
  navigateBack("/direction-a");
}

function ReadingHeader({ variant }: { variant: "A" | "B" | "C" }) {
  return (
    <header className="reading-topbar">
      <button type="button" className="reading-nav-button" onClick={goBack} aria-label="뒤로가기">
        <span aria-hidden="true">←</span>
      </button>
      <p>
        받은 편지 <span>{variant}</span>
      </p>
      <button
        type="button"
        className="reading-nav-button reading-nav-button--home"
        onClick={() => goTo("/direction-a")}
        aria-label="홈으로 가기"
      >
        홈
      </button>
    </header>
  );
}

function LetterParagraphs({ state, className = "" }: { state: ReadVariantState; className?: string }) {
  return (
    <div className={className}>
      {getContent(state)
        .split("\n\n")
        .map((paragraph, index) => (
          <p key={`${paragraph.slice(0, 18)}-${index}`}>{paragraph}</p>
        ))}
    </div>
  );
}

function LoadingState({ variant }: { variant: "a" | "b" | "c" }) {
  return (
    <section className={`reading-loading reading-loading--${variant}`} aria-busy="true" aria-live="polite">
      <div aria-hidden="true">
        <span className="reading-loading__line reading-loading__line--short" />
        <span className="reading-loading__line" />
        <span className="reading-loading__line" />
        <span className="reading-loading__line reading-loading__line--medium" />
        <span className="reading-loading__line" />
      </div>
      <p>편지를 조심스럽게 가져오고 있어요.</p>
    </section>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="reading-error" role="alert">
      <span className="reading-error__mark" aria-hidden="true">!</span>
      <h1>편지를 불러오지 못했어요</h1>
      <p>인터넷 연결을 확인한 뒤 다시 시도해주세요.</p>
      <button type="button" onClick={onRetry}>다시 시도하기</button>
    </section>
  );
}

function SecondaryActions({ onAction }: { onAction: (action: "report" | "hide") => void }) {
  return (
    <div className="reading-secondary-actions" aria-label="편지 보조 행동">
      <button type="button" onClick={() => onAction("report")}>신고하기</button>
      <span aria-hidden="true">·</span>
      <button type="button" onClick={() => onAction("hide")}>이 편지 숨기기</button>
    </div>
  );
}

function ReadingActionbar({ variant, disabled }: { variant: "a" | "b" | "c"; disabled: boolean }) {
  const replyPath = variant === "c" ? "/write-reply-a" : "/write-reply";

  return (
    <div className={`reading-fixed-action reading-fixed-action--${variant}`}>
      {variant === "b" && <p>읽은 마음을 조심스럽게 건네요.</p>}
      <button type="button" disabled={disabled} onClick={() => goTo(replyPath)}>마음 남기기</button>
    </div>
  );
}

function ActionDialog({ action, onClose }: { action: "report" | "hide"; onClose: () => void }) {
  const isReport = action === "report";
  return (
    <div className="reading-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="reading-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reading-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <p className="reading-dialog__eyebrow">받은 편지</p>
        <h2 id="reading-dialog-title">{isReport ? "이 편지를 신고할까요?" : "이 편지를 숨길까요?"}</h2>
        <p>
          {isReport
            ? "신고 내용은 운영 기준에 따라 확인할게요."
            : "현재 목록에서 이 편지를 보이지 않게 할게요."}
        </p>
        <div>
          <button type="button" onClick={onClose}>취소</button>
          <button type="button" className="is-primary" onClick={onClose}>
            {isReport ? "신고하기" : "숨기기"}
          </button>
        </div>
      </section>
    </div>
  );
}

function ReadVariantFrame({
  variant,
  className,
  children,
}: {
  variant: "A" | "B" | "C";
  className: string;
  children: (props: VariantRenderProps) => ReactNode;
}) {
  const state = getReadState();
  const [dialog, setDialog] = useState<"report" | "hide" | null>(null);
  const [currentState, setCurrentState] = useState(state);
  const isUnavailable = currentState === "loading" || currentState === "error";

  return (
    <main className={`mobile-prototype read-variant-screen ${className}`}>
      <ReadingHeader variant={variant} />
      <span className="sr-only" role="status">{stateLabels[currentState]}</span>
      {children({
        state: currentState,
        retry: () => setCurrentState("normal"),
        onAction: setDialog,
      })}
      <ReadingActionbar variant={variant.toLowerCase() as "a" | "b" | "c"} disabled={isUnavailable} />
      {dialog && <ActionDialog action={dialog} onClose={() => setDialog(null)} />}
    </main>
  );
}

type VariantRenderProps = {
  state: ReadVariantState;
  retry: () => void;
  onAction: (action: "report" | "hide") => void;
};

export function ReadLetterAScreen() {
  return (
    <ReadVariantFrame variant="A" className="read-variant-a">
      {({ state, retry, onAction }: VariantRenderProps) => (
        <div className="reading-scroll-region a-reading-scroll">
          <div className="a-reading-mat">
            <article className="a-reading-sheet">
              {state === "loading" ? (
                <LoadingState variant="a" />
              ) : state === "error" ? (
                <ErrorState onRetry={retry} />
              ) : (
                <>
                  <header className="a-reading-heading">
                    <p>받은 편지 · 01</p>
                    <h1>새벽구름이 보낸 편지</h1>
                    <span>천천히, 당신의 속도로 읽어주세요.</span>
                  </header>
                  <LetterParagraphs state={state} className="a-reading-body" />
                  <footer className="a-reading-footer">
                    <p>이 이야기를 끝까지 읽어주셔서 고마워요.</p>
                    <SecondaryActions onAction={onAction} />
                  </footer>
                </>
              )}
            </article>
          </div>
        </div>
      )}
    </ReadVariantFrame>
  );
}

export function ReadLetterBScreen() {
  return (
    <ReadVariantFrame variant="B" className="read-variant-b">
      {({ state, retry, onAction }: VariantRenderProps) => (
        <div className="reading-scroll-region b-reading-page">
          <section className="b-reading-lead">
            <div>
              <p>RECEIVED LETTER · 천천히 읽는 중</p>
              <h1>새벽구름이 보낸 편지</h1>
            </div>
            <img src="/assets/read-letter-object-tight.png" alt="독서등과 펼친 편지, 안경" />
          </section>

          {state === "loading" ? (
            <LoadingState variant="b" />
          ) : state === "error" ? (
            <ErrorState onRetry={retry} />
          ) : (
            <article className="b-reading-article">
              <div className="b-reading-index" aria-hidden="true">
                <span>01</span>
                <i />
              </div>
              <div>
                <LetterParagraphs state={state} className="b-reading-copy" />
                <footer>
                  <p>이 이야기를 끝까지 읽어주셔서 고마워요.</p>
                  <SecondaryActions onAction={onAction} />
                </footer>
              </div>
            </article>
          )}
        </div>
      )}
    </ReadVariantFrame>
  );
}

export function ReadLetterCScreen() {
  return (
    <ReadVariantFrame variant="C" className="read-variant-c">
      {({ state, retry, onAction }: VariantRenderProps) => (
        <div className="reading-scroll-region c-reading-scroll">
          <section className="c-reading-room" aria-label="조용한 편지 읽기 공간">
            <div>
              <p>누군가가 조심스럽게 꺼낸 이야기</p>
              <h1><strong>새벽구름</strong>이 보낸 편지</h1>
            </div>
            <img src="/assets/read-letter-room-framed-two.png" alt="크기가 다른 벽면 아트 프레임 두 개와 낮은 테이블, 안락의자" />
          </section>

          <div className="a-reading-mat c-reading-mat">
            <section className="a-reading-sheet c-reading-plane">
              {state === "loading" ? (
                <LoadingState variant="c" />
              ) : state === "error" ? (
                <ErrorState onRetry={retry} />
              ) : (
                <article className="c-reading-letter">
                  <span className="c-reading-quote c-reading-quote--open" aria-hidden="true">“</span>
                  <LetterParagraphs state={state} className="a-reading-body c-reading-copy" />
                  <span className="c-reading-quote c-reading-quote--close" aria-hidden="true">”</span>
                  <footer className="a-reading-footer c-reading-footer">
                    <p>이 이야기를 끝까지 읽어주셔서 고마워요.</p>
                    <SecondaryActions onAction={onAction} />
                  </footer>
                </article>
              )}
            </section>
          </div>
        </div>
      )}
    </ReadVariantFrame>
  );
}
