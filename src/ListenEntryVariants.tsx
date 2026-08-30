import { type ReactNode } from "react";
import { getCurrentAppSearchParams, navigateBack, navigateTo } from "./navigation";

type ListenVariant = "A" | "B" | "C";
type ListenEntryState = "ready" | "loading" | "error" | "empty";

const HELPER_COPY = (
  <>
    정답을 알려주지 않아도 괜찮아요.
    <br />
    그 사람의 이야기를 끝까지 읽어주는 것만으로도
    <br />
    충분한 마음이 될 수 있어요.
  </>
);

function getInitialState(): ListenEntryState {
  const state = getCurrentAppSearchParams().get("state");
  return state === "loading" || state === "error" || state === "empty" ? state : "ready";
}

function goTo(path: string) {
  navigateTo(path);
}

function ListenEntryHeader() {
  return (
    <header className="flow-header listen-entry-topbar">
      <button type="button" onClick={() => navigateBack("/home")} aria-label="이전으로 돌아가기">
        <span aria-hidden="true">←</span>
      </button>
      <strong>편지 만나기</strong>
      <span aria-hidden="true" />
    </header>
  );
}

function ListenHeading({
  compact = false,
  title,
  showBrand = true,
}: {
  compact?: boolean;
  title?: ReactNode;
  showBrand?: boolean;
}) {
  return (
    <section className={`listen-entry-heading${compact ? " is-compact" : ""}${showBrand ? "" : " without-brand"}`}>
      {showBrand && <p>공감편지</p>}
      <h1>
        {title ?? (
          <>
            누군가의 마음을
            <br />
            들어주고 싶어요
          </>
        )}
      </h1>
      <div>{HELPER_COPY}</div>
    </section>
  );
}

export function ListenEntryLoadingState({ message = "편지를 조심스럽게 가져오고 있어요." }: { message?: string }) {
  return (
    <section className="listen-entry-feedback" aria-live="polite" aria-busy="true">
      <div className="listen-entry-loading-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <h1>{message}</h1>
    </section>
  );
}

function ErrorState() {
  return (
    <section className="listen-entry-feedback" role="alert">
      <p>잠시 멈춰 다시 살펴볼게요.</p>
      <h1>지금은 편지를 가져오지 못했어요.</h1>
      <div>잠시 후 다시 시도해주세요.</div>
    </section>
  );
}

function EmptyState() {
  return (
    <section className="listen-entry-feedback listen-entry-feedback--empty" aria-live="polite">
      <p>기다리는 마음</p>
      <h1>지금은 기다리고 있는 편지가 없어요.</h1>
      <div>
        조금 뒤에 다시 찾아오거나,
        <br />
        먼저 내 마음을 편지에 담아보세요.
      </div>
    </section>
  );
}

function FixedActions({
  state,
  onMeet,
}: {
  state: ListenEntryState;
  onMeet: () => void;
}) {
  if (state === "empty") {
    return (
      <div className="flow-fixed-action flow-fixed-action--split listen-entry-actions">
        <button type="button" className="flow-secondary-button" onClick={() => goTo("/write-letter")}> 
          편지 쓰기
        </button>
        <button type="button" className="flow-primary-button" onClick={onMeet}>다시 확인하기</button>
      </div>
    );
  }

  return (
    <div className="flow-fixed-action listen-entry-actions">
      <button type="button" className="flow-primary-button" onClick={onMeet} disabled={state === "loading"}>
        {state === "ready" ? "편지 만나기" : state === "loading" ? "편지를 가져오는 중" : "다시 시도하기"}
      </button>
    </div>
  );
}

function ListenEntryFrame({
  variant,
  className,
  // B and C remain pinned to the single sample letter they were designed against.
  meetPath = "/read-letter/sample-waiting-letter-one",
  children,
}: {
  variant: ListenVariant;
  className: string;
  meetPath?: string;
  children: ReactNode;
}) {
  const state = getInitialState();
  function meetLetter() {
    goTo(meetPath);
  }

  const content =
    state === "loading" ? <ListenEntryLoadingState /> : state === "error" ? <ErrorState /> : state === "empty" ? <EmptyState /> : children;

  return (
    <main className={`mobile-prototype listen-entry-screen ${className}`}>
      <ListenEntryHeader />
      <div className="listen-entry-scroll">{content}</div>
      <FixedActions state={state} onMeet={meetLetter} />
    </main>
  );
}

export function ListenEntryAScreen() {
  return (
    <ListenEntryFrame variant="A" className="listen-entry-a" meetPath="/waiting-letters">
      <>
        <ListenHeading
          showBrand={false}
          title={
            <>
              누군가의 마음이
              <br />
              도착했어요
            </>
          }
        />
        <figure className="listen-a-hero-art">
          <img src="/assets/read-letter-object-tight.png" alt="독서등과 펼쳐진 편지, 안경" />
        </figure>
        <section className="listen-a-guide" aria-labelledby="listen-a-guide-title">
          <div>
            <p id="listen-a-guide-title">잠시 기억해주세요.</p>
          </div>
          <ul>
            <li>판단하기보다 끝까지 읽기</li>
            <li>내 경험보다 상대의 마음을 먼저 바라보기</li>
            <li>짧아도 진심을 담아 답하기</li>
          </ul>
        </section>
      </>
    </ListenEntryFrame>
  );
}

export function ListenEntryBScreen() {
  return (
    <ListenEntryFrame variant="B" className="listen-entry-b">
      <>
        <ListenHeading compact />
        <section className="listen-b-focus">
          <blockquote>
            끝까지 읽어주는 것만으로도
            <br />
            누군가에게는 큰 위로가 될 수 있어요.
          </blockquote>
          <img src="/assets/read-letter-object-tight.png" alt="독서등과 펼쳐진 편지, 안경" />
        </section>
        <p className="listen-b-note">서두르지 않아도 괜찮아요. 당신의 속도로 편지를 만나보세요.</p>
      </>
    </ListenEntryFrame>
  );
}

export function ListenEntryCScreen() {
  return (
    <ListenEntryFrame variant="C" className="listen-entry-c">
      <>
        <ListenHeading compact />
        <figure className="listen-c-letter-scene">
          <img src="/assets/direction-b-read.png" alt="펼쳐진 편지와 안경, 찻잔" />
          <figcaption>
            <span>한 통의 편지가</span>
            당신의 마음을 기다리고 있어요.
          </figcaption>
        </figure>
      </>
    </ListenEntryFrame>
  );
}

export function ListenEntryEmptyScreen() {
  return (
    <main className="mobile-prototype listen-entry-screen listen-entry-empty-screen">
      <ListenEntryHeader />
      <div className="listen-entry-empty-content">
        <img
          className="listen-entry-empty-art"
          src="/assets/listen-entry-empty-mailbox.png"
          alt="비어 있는 라벤더색 우편함"
        />
        <section className="listen-entry-empty-copy" aria-live="polite">
          <h1>지금은 기다리는 편지가 없어요.</h1>
          <p>새로운 마음이 도착하면<br />이곳에서 만날 수 있어요.</p>
        </section>
      </div>
      <div className="flow-fixed-action flow-fixed-action--split listen-entry-actions listen-entry-empty-actions">
        <button type="button" className="flow-secondary-button" onClick={() => goTo("/home")}>홈으로 돌아가기</button>
        <button type="button" className="flow-primary-button" onClick={() => goTo("/listen-entry-a")}>다시 확인하기</button>
      </div>
    </main>
  );
}
