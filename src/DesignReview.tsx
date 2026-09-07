import "./design-review.css";
import { navigateTo } from "./navigation";

/**
 * Design-review only. These screens are copies of the real home, mailbox,
 * letter-detail and my-space screens, rebuilt three ways so the visual
 * direction can be compared side by side. Nothing here is wired into the
 * service flow and no service route renders it.
 */

export type ReviewDirection = "a" | "b" | "c";
export type ReviewScreen = "home" | "mailbox" | "letter" | "my-space";

const NAME = "조용한 새벽";

const CHOICES = [
  {
    index: "01",
    title: ["내 마음을", "털어놓고 싶어요"],
    body: ["말하지 못한 이야기를", "익명의 편지에", "담아보세요."],
    art: "/assets/direction-a-write-isolated-tight.png",
  },
  {
    index: "02",
    title: ["누군가의 마음을", "들어주고 싶어요"],
    body: ["누군가가 조심스럽게", "꺼낸 이야기를", "천천히 읽어보세요."],
    art: "/assets/direction-a-listen-isolated-tight.png",
  },
];

const NOTICE = {
  title: "답장을 기다리는 편지가 있어요.",
  body: "편지함에서 확인할 수 있어요.",
  action: "내가 보낸 편지 보기",
};

const FILTERS = ["전체", "답장 기다리는 중", "답장 도착", "답장 보냄"];

type Row = { date: string; title: string; status: string; mark: string; tone: "waiting" | "arrived" | "sent"; unread?: boolean };

const ROWS: ReadonlyArray<Row> = [
  { date: "2026년 8월 30일", title: "내가 보낸 편지", status: "답장 기다리는 중", mark: "–", tone: "waiting" },
  { date: "2026년 8월 28일", title: "고요한 별빛", status: "답장 도착", mark: "←", tone: "arrived", unread: true },
  { date: "2026년 8월 26일", title: "느린 별빛", status: "답장 보냄", mark: "→", tone: "sent" },
];

const MENU = [
  { label: "닉네임", value: NAME },
  { label: "계정 관리" },
  { label: "알림 설정" },
  { label: "신고·차단 관리" },
  { label: "이용 안내" },
  { label: "개인정보 처리방침" },
  { label: "서비스 이용약관" },
];

const LETTER = {
  kicker: "내가 보낸 편지",
  title: ["답장을", "기다리고 있어요"],
  stampedAt: "2026년 8월 30일 오후 1:52",
  body: "오늘은 유난히 마음이 무거운 하루였어요. 아무에게도 말하지 못했던 이야기를 여기 조용히 적어봅니다.",
  signature: "조용한 새벽",
  art: "/assets/reply-sent-lavender-envelope.png",
};

const DIRECTION_LABEL: Record<ReviewDirection, string> = {
  a: "A · 현재 스타일 정제형",
  b: "B · 에디토리얼 강화형",
  c: "C · 현대적 절제형",
};

const SCREEN_LABEL: Record<ReviewScreen, string> = {
  home: "홈",
  mailbox: "편지함",
  letter: "내가 보낸 편지",
  "my-space": "나의 공간",
};

function ReviewSwitcher({ dir, screen }: { dir: ReviewDirection; screen: ReviewScreen }) {
  return (
    <div className="dr-switcher" role="navigation" aria-label="디자인 방향 비교">
      <div className="dr-switcher-row">
        {(["a", "b", "c"] as ReviewDirection[]).map((d) => (
          <button
            key={d}
            type="button"
            className={d === dir ? "is-active" : ""}
            onClick={() => navigateTo(`/design-review/${d}/${screen}`)}
          >
            {d.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="dr-switcher-row dr-switcher-row--screens">
        {(Object.keys(SCREEN_LABEL) as ReviewScreen[]).map((s) => (
          <button
            key={s}
            type="button"
            className={s === screen ? "is-active" : ""}
            onClick={() => navigateTo(`/design-review/${dir}/${s}`)}
          >
            {SCREEN_LABEL[s]}
          </button>
        ))}
      </div>
      <p className="dr-switcher-caption">{DIRECTION_LABEL[dir]}</p>
    </div>
  );
}

function BottomNav({ active }: { active: "home" | "mailbox" | "my-space" }) {
  const items = [
    { id: "home", label: "홈", mark: "home" },
    { id: "mailbox", label: "편지함", mark: "mailbox" },
    { id: "my-space", label: "나의 공간", mark: "space" },
  ] as const;
  return (
    <nav className="dr-nav" aria-label="주요 메뉴">
      {items.map((item) => (
        <button key={item.id} type="button" className={item.id === active ? "is-active" : ""} aria-current={item.id === active ? "page" : undefined}>
          <span className={`dr-nav-mark dr-nav-mark--${item.mark}`} aria-hidden="true" />
          <span className="dr-nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

/** Back arrow drawn as a shape rather than a font character. */
function BackMark() {
  return (
    <svg className="dr-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronMark() {
  return (
    <svg className="dr-icon dr-icon--sm" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M9.5 5 L16 12 L9.5 19" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseMark() {
  return (
    <svg className="dr-icon dr-icon--sm" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6 6 L18 18 M18 6 L6 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function FlowHeader({ title }: { title: string }) {
  return (
    <header className="dr-flow-header">
      <button type="button" aria-label="이전으로 돌아가기"><BackMark /></button>
      <strong>{title}</strong>
      <span aria-hidden="true" />
    </header>
  );
}

/* ─────────────────────────── HOME ─────────────────────────── */

function Home({ dir }: { dir: ReviewDirection }) {
  return (
    <>
      <div className="dr-scroll dr-scroll--home">
        <header className="dr-home-head">
          <p className="dr-brand">공감편지</p>
          {dir === "b" && <p className="dr-kicker">오늘의 마음</p>}
          <h1 className="dr-page-title">
            <em>{NAME}</em>님,
            <br />
            오늘은 어떤 마음인가요?
          </h1>
          <p className="dr-support">지금 마음이 향하는 쪽을 골라주세요.</p>
        </header>

        <aside className="dr-notice" role="status">
          <button type="button" className="dr-notice-close" aria-label="소식 닫기"><CloseMark /></button>
          <strong>{NOTICE.title}</strong>
          <p>{NOTICE.body}</p>
          <button type="button" className="dr-notice-action">{NOTICE.action}</button>
        </aside>

        {dir === "b" && <p className="dr-rule-label">두 가지 방법</p>}

        <section className="dr-choices" aria-label="시작 선택">
          {CHOICES.map((c) => (
            <button key={c.index} type="button" className="dr-choice">
              <span className="dr-choice-index">{c.index}</span>
              <span className="dr-choice-copy">
                <strong>{c.title[0]}<br />{c.title[1]}</strong>
                <span>{c.body.map((line) => <span key={line} className="dr-choice-line">{line}</span>)}</span>
              </span>
              <img src={c.art} alt="" aria-hidden="true" />
            </button>
          ))}
        </section>

        <p className="dr-footnote">여기서 고른 선택은 언제든 홈에서 바꿀 수 있어요.</p>
      </div>
      <BottomNav active="home" />
    </>
  );
}

/* ────────────────────────── MAILBOX ────────────────────────── */

function Mailbox({ dir }: { dir: ReviewDirection }) {
  return (
    <>
      <div className="dr-scroll">
        <header className="dr-list-head">
          <p className="dr-brand">공감편지</p>
          <h1 className="dr-page-title">편지함</h1>
          <p className="dr-support">주고받은 마음을 다시 꺼내볼 수 있어요.</p>
        </header>

        <div className="dr-chips" role="group" aria-label="편지 상태로 정렬">
          {FILTERS.map((f, i) => (
            <button key={f} type="button" className={i === 0 ? "is-active" : ""} aria-pressed={i === 0}>{f}</button>
          ))}
        </div>

        <section className="dr-rows" aria-label="내 편지 목록">
          {ROWS.map((row) => (
            <button key={row.date} type="button" className={`dr-row dr-row--${row.tone}${row.unread ? " is-unread" : ""}`}>
              {dir === "b" ? (
                <>
                  <time className="dr-row-date">{row.date}</time>
                  <span className="dr-row-main">
                    <strong>{row.title}{row.unread && <i className="dr-unread" aria-label="읽지 않음" />}</strong>
                    <em className="dr-status"><i aria-hidden="true">{row.mark}</i>{row.status}</em>
                  </span>
                </>
              ) : (
                <span className="dr-row-main">
                  <span className="dr-row-meta">
                    <time className="dr-row-date">{row.date}</time>
                    <em className="dr-status"><i aria-hidden="true">{row.mark}</i>{row.status}</em>
                  </span>
                  <strong>{row.title}{row.unread && <i className="dr-unread" aria-label="읽지 않음" />}</strong>
                </span>
              )}
            </button>
          ))}
        </section>
      </div>
      <BottomNav active="mailbox" />
    </>
  );
}

/* ──────────────────────── LETTER DETAIL ──────────────────────── */

function LetterDetail({ dir }: { dir: ReviewDirection }) {
  return (
    <>
      <FlowHeader title="내가 보낸 편지" />
      <div className="dr-scroll dr-scroll--letter">
        <header className="dr-letter-head">
          {dir === "b" && <p className="dr-kicker">편지의 상태</p>}
          <h1 className="dr-page-title dr-page-title--letter">
            <em>{LETTER.title[0]}</em>
            <br />
            {LETTER.title[1]}
          </h1>
          <img className="dr-letter-art" src={LETTER.art} alt="" aria-hidden="true" />
        </header>

        <article className="dr-paper">
          <div className="dr-paper-meta">
            <span>{LETTER.kicker}</span>
            <time>{LETTER.stampedAt}</time>
          </div>
          <blockquote className="dr-letter-body">{LETTER.body}</blockquote>
          <p className="dr-signature">— {LETTER.signature}</p>
        </article>

        <section className="dr-status-box">
          <strong>읽어줄 사람을 기다리고 있어요</strong>
          <p>당신의 이야기를 읽어줄 사람을 기다리고 있어요.</p>
          <button type="button" className="dr-btn dr-btn--secondary">편지의 여정 보기</button>
        </section>
      </div>
      <div className="dr-cta">
        <button type="button" className="dr-btn dr-btn--primary">편지함 가기</button>
      </div>
    </>
  );
}

/* ───────────────────────── MY SPACE ───────────────────────── */

function MySpace({ dir }: { dir: ReviewDirection }) {
  return (
    <>
      <div className="dr-scroll">
        <header className="dr-list-head">
          <p className="dr-brand">공감편지</p>
          <h1 className="dr-page-title">나의 공간</h1>
          {dir === "b" && <p className="dr-support">이 기기에서 공감편지를 어떻게 이어갈지 정할 수 있어요.</p>}
        </header>

        <section className="dr-menu" aria-label="나의 공간 메뉴">
          {MENU.map((item, i) => (
            <button key={item.label} type="button">
              {dir === "b" && <span className="dr-menu-index">{String(i + 1).padStart(2, "0")}</span>}
              <span className="dr-menu-label">{item.label}</span>
              {item.value && <span className="dr-menu-value">{item.value}</span>}
              <ChevronMark />
            </button>
          ))}
        </section>
      </div>
      <BottomNav active="my-space" />
    </>
  );
}

export function DesignReviewScreen({ dir, screen }: { dir: ReviewDirection; screen: ReviewScreen }) {
  const body =
    screen === "home" ? <Home dir={dir} />
      : screen === "mailbox" ? <Mailbox dir={dir} />
        : screen === "letter" ? <LetterDetail dir={dir} />
          : <MySpace dir={dir} />;

  return (
    <main className={`mobile-prototype dr-screen dr-${dir} dr-screen--${screen}`}>
      {body}
      <ReviewSwitcher dir={dir} screen={screen} />
    </main>
  );
}
