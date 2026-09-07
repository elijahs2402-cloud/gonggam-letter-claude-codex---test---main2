import { useRef, useState, type ReactNode } from "react";
import { navigateTo } from "./navigation";

type WriteState = "empty" | "writing" | "saved" | "long";
type ReadState = "short" | "long" | "loading";
type ReplyState = "empty" | "writing" | "warning";

const WRITE_DRAFT = {
  title: "요즘 내 마음이 머무는 곳",
  body: "별일 아닌 것처럼 넘겼는데, 오늘은 그 마음이 자꾸 생각나요. 누군가에게 한 번쯤은 솔직하게 말해보고 싶었어요.",
};

const WRITE_LONG = `요즘에는 하루를 다 보내고 나면 무엇을 했는지 잘 떠오르지 않아요. 분명 바쁘게 움직였는데 마음 한쪽은 계속 멈춰 있는 것 같아요.

괜찮다고 말하는 일이 익숙해져서인지, 정작 제 마음을 설명하려고 하면 어디서부터 시작해야 할지 모르겠어요. 사소한 말에도 오래 마음이 쓰이고, 아무렇지 않은 척하고 돌아선 날에는 혼자 남은 시간이 더 길게 느껴져요.

해결해 달라는 뜻은 아니에요. 그저 이런 마음도 있었다는 걸 누군가가 천천히 읽어주면 좋겠어요. 지금의 저를 서둘러 판단하지 않고, 문장 끝까지 잠시 머물러 주었으면 해요.`;

const READ_SAMPLE = `요즘 회사에서 내가 하는 일이 아무 의미가 없는 것처럼 느껴져요.

열심히 해도 달라지는 건 없고, 새로운 일을 시작할 힘도 없는 것 같아요. 주변에서는 조금만 더 버티라고 하지만, 언제까지 버텨야 하는지도 모르겠어요.

해결 방법을 듣고 싶은 건 아닌데, 그냥 누군가가 이 마음을 알아줬으면 좋겠어요.`;

const READ_LONG = `${READ_SAMPLE}

퇴근하고 집에 돌아오면 오늘도 잘 버틴 건지, 그냥 하루를 흘려보낸 건지 모르겠어요. 예전에는 좋아하던 것들이 있었는데 요즘은 그것들을 꺼내 볼 마음도 잘 생기지 않아요.

이 말을 가까운 사람에게 하면 괜히 걱정만 끼칠 것 같아서 오래 망설였어요. 여기까지 읽어준 사람이 있다면, 잠깐이라도 제 마음 곁에 있어 준 것 같아 고마울 것 같아요.`;

const REPLY_DRAFT =
  "계속 버티고 있는 시간이 얼마나 길고 막막하게 느껴졌을지 생각해보게 되었어요. 해결책을 말하기보다, 여기까지 적어준 마음을 잘 읽었다고 전하고 싶어요.";
const WARNING_SENTENCE = "네가 잘못했잖아 ㅋㅋㅋ";
const RECOMMENDED_SENTENCE =
  "그 상황에서 어떤 선택을 해야 할지 많이 혼란스러웠을 것 같아요.";

function goTo(path: string) {
  navigateTo(path);
}

function LetterFrame({ className, children }: { className: string; children: ReactNode }) {
  return <main className={`mobile-prototype letter-flow-screen ${className}`}>{children}</main>;
}

function LetterHeader({ section }: { section: string }) {
  return (
    <header className="letter-topbar">
      <button type="button" className="letter-brand" onClick={() => goTo("/intro")}>
        공감편지
      </button>
      <span>{section}</span>
    </header>
  );
}

function StateLab<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <details className="state-lab">
      <summary>화면 상태 확인</summary>
      <div className="state-lab__options" aria-label="프로토타입 상태 선택">
        {options.map((option) => (
          <button
            type="button"
            key={option.value}
            className={value === option.value ? "is-active" : ""}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </details>
  );
}

function PreviewLayer({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="letter-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="letter-preview"
        role="dialog"
        aria-modal="true"
        aria-labelledby="letter-preview-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <p className="letter-kicker">PREVIEW</p>
        <h2 id="letter-preview-title">{title}</h2>
        {children}
        <button type="button" className="letter-button letter-button--primary" onClick={onClose}>
          돌아가기
        </button>
      </section>
    </div>
  );
}

export function WriteLetterScreen() {
  const [screenState, setScreenState] = useState<WriteState>("empty");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [nameIndex, setNameIndex] = useState(0);
  const [saved, setSaved] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const anonymousNames = ["새벽구름", "작은등불", "느린별", "고요한숲"];

  function applyState(next: WriteState) {
    setScreenState(next);
    setSaved(next === "saved");
    if (next === "empty") {
      setTitle("");
      setBody("");
    } else if (next === "long") {
      setTitle("오래 마음에 남아 있던 이야기");
      setBody(WRITE_LONG);
    } else {
      setTitle(WRITE_DRAFT.title);
      setBody(WRITE_DRAFT.body);
    }
  }

  return (
    <LetterFrame className="write-letter-screen">
      <LetterHeader section="편지 쓰기" />
      <div className="letter-page">
        <section className="letter-hero" aria-labelledby="write-letter-title">
          <div>
            <p className="letter-kicker">A LETTER FROM YOUR HEART</p>
            <h1 id="write-letter-title">
              마음을 편지에
              <br />
              담아보세요
            </h1>
            <p>
              잘 정리된 문장이 아니어도 괜찮아요.
              <br />
              지금 떠오르는 말부터 천천히 적어보세요.
            </p>
          </div>
          <img src="/assets/write-letter-object-tight.png" alt="잉크병과 만년필, 종이 가장자리" />
        </section>

        <StateLab
          value={screenState}
          onChange={applyState}
          options={[
            { value: "empty", label: "빈 입력" },
            { value: "writing", label: "작성 중" },
            { value: "saved", label: "저장 완료" },
            { value: "long", label: "긴 글" },
          ]}
        />

        {saved && (
          <p className="save-notice" role="status">
            임시 저장했어요. 이 기기에서 이어서 쓸 수 있어요.
          </p>
        )}

        <form className="letter-form" onSubmit={(event) => event.preventDefault()}>
          <label className="letter-field">
            <span className="letter-field__label">
              편지 제목 <small>선택</small>
            </span>
            <input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setSaved(false);
              }}
              placeholder="지금 마음을 한 문장으로 적어보세요"
            />
          </label>

          <label className="letter-field letter-field--body">
            <span className="letter-field__label">편지 내용</span>
            <textarea
              value={body}
              onChange={(event) => {
                setBody(event.target.value);
                setSaved(false);
              }}
              placeholder={"오늘 있었던 일, 말하지 못했던 마음,\n누군가에게 꼭 들려주고 싶었던 이야기를 적어보세요."}
              rows={screenState === "long" ? 17 : 11}
            />
            <span className="letter-count" aria-live="polite">
              {body.length.toLocaleString()}자
            </span>
          </label>

          <section className="anonymous-name" aria-labelledby="anonymous-title">
            <div>
              <p className="letter-field__label" id="anonymous-title">
                익명 이름
              </p>
              <strong>{anonymousNames[nameIndex]}</strong>
              <p>당신의 실제 이름 대신 익명의 이름으로 전달돼요.</p>
            </div>
            <button
              type="button"
              onClick={() => setNameIndex((current) => (current + 1) % anonymousNames.length)}
            >
              다른 이름 받기
            </button>
          </section>

          <aside className="privacy-note">
            <strong>편지를 보내기 전에</strong>
            <p>
              이름, 전화번호, 주소, 학교나 회사 이름처럼
              <br />
              나를 알아볼 수 있는 정보는 적지 말아주세요.
            </p>
          </aside>
        </form>
      </div>

      <div className="letter-actionbar" aria-label="편지 작성 행동">
        <button
          type="button"
          className="letter-button letter-button--secondary"
          onClick={() => {
            setSaved(true);
            setScreenState("saved");
          }}
        >
          임시 저장
        </button>
        <button
          type="button"
          className="letter-button letter-button--primary"
          onClick={() => setPreviewOpen(true)}
          disabled={!body.trim()}
        >
          편지 미리보기
        </button>
      </div>

      {previewOpen && (
        <PreviewLayer title={title.trim() || "제목 없는 편지"} onClose={() => setPreviewOpen(false)}>
          <p className="preview-byline">{anonymousNames[nameIndex]}으로부터</p>
          <p className="preview-body">{body}</p>
        </PreviewLayer>
      )}
    </LetterFrame>
  );
}

export function ReadLetterScreen() {
  const [screenState, setScreenState] = useState<ReadState>("short");
  const [actionStatus, setActionStatus] = useState("");
  const content = screenState === "short" ? READ_SAMPLE.split("\n\n")[0] : READ_LONG;

  return (
    <LetterFrame className="read-letter-screen">
      <LetterHeader section="받은 편지" />
      <div className="letter-page read-page">
        <section className="read-heading" aria-labelledby="read-letter-title">
          <div>
            <p className="letter-kicker">A LETTER FOR YOU</p>
            <h1 id="read-letter-title">새벽구름이 보낸 편지</h1>
            <p>서두르지 말고, 당신의 속도로 읽어주세요.</p>
          </div>
          <img src="/assets/read-letter-object-tight.png" alt="독서등과 펼친 종이, 안경" />
        </section>

        <StateLab
          value={screenState}
          onChange={(next) => {
            setScreenState(next);
            setActionStatus("");
          }}
          options={[
            { value: "short", label: "짧은 편지" },
            { value: "long", label: "긴 편지" },
            { value: "loading", label: "불러오는 중" },
          ]}
        />

        {screenState === "loading" ? (
          <section className="letter-loading" aria-label="편지를 불러오는 중" aria-busy="true">
            <span className="loading-line loading-line--title" />
            <span className="loading-line" />
            <span className="loading-line" />
            <span className="loading-line loading-line--short" />
            <span className="loading-line" />
            <span className="loading-line loading-line--short" />
            <p>편지를 조심스럽게 펼치고 있어요.</p>
          </section>
        ) : (
          <>
            <article className="received-letter">
              {content.split("\n\n").map((paragraph, index) => (
                <p key={`${paragraph.slice(0, 12)}-${index}`}>{paragraph}</p>
              ))}
              <footer>이 이야기를 끝까지 읽어주셔서 고마워요.</footer>
            </article>

            <section className="read-response" aria-labelledby="read-response-title">
              <p className="letter-kicker">AFTER READING</p>
              <h2 id="read-response-title">이 마음 곁에 잠시 머물러 주세요</h2>
              <button
                type="button"
                className="letter-button letter-button--primary"
                onClick={() => goTo("/write-reply")}
              >
                마음 남기기
              </button>
            </section>

            <div className="read-secondary-actions">
              <button type="button" onClick={() => setActionStatus("신고 내용을 확인한 뒤 검토할게요.")}>
                신고하기
              </button>
              <span aria-hidden="true">·</span>
              <button type="button" onClick={() => setActionStatus("이 편지를 목록에서 숨겼어요.")}>
                이 편지 숨기기
              </button>
            </div>
            {actionStatus && (
              <p className="read-action-status" role="status">
                {actionStatus}
              </p>
            )}
          </>
        )}
      </div>
    </LetterFrame>
  );
}

export function WriteReplyScreen() {
  const [screenState, setScreenState] = useState<ReplyState>("empty");
  const [reply, setReply] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [saved, setSaved] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const replyRef = useRef<HTMLTextAreaElement>(null);

  function applyState(next: ReplyState) {
    setScreenState(next);
    setSaved(false);
    setPreviewOpen(false);
    if (next === "empty") {
      setReply("");
      setWarningOpen(false);
    } else if (next === "writing") {
      setReply(REPLY_DRAFT);
      setWarningOpen(false);
    } else {
      setReply(WARNING_SENTENCE);
      setWarningOpen(true);
    }
  }

  function reviewReply() {
    if (reply.includes("잘못") || reply.includes("ㅋㅋㅋ")) {
      setWarningOpen(true);
      return;
    }
    setPreviewOpen(true);
  }

  return (
    <LetterFrame className="write-reply-screen">
      <LetterHeader section="답장 쓰기" />
      <div className="letter-page reply-page">
        <section className="reply-heading" aria-labelledby="write-reply-title">
          <p className="letter-kicker">A LETTER IN RETURN</p>
          <h1 id="write-reply-title">
            이 편지에 마음을
            <br />
            남겨주세요
          </h1>
          <p>
            정답이나 해결책을 알려주기보다
            <br />
            편지를 읽으며 느낀 마음을 솔직하게 전해주세요.
          </p>
        </section>

        <StateLab
          value={screenState}
          onChange={applyState}
          options={[
            { value: "empty", label: "빈 입력" },
            { value: "writing", label: "작성 중" },
            { value: "warning", label: "표현 확인" },
          ]}
        />

        <section className={`original-excerpt${summaryOpen ? " is-open" : ""}`}>
          <div className="original-excerpt__heading">
            <div>
              <p className="letter-kicker">ORIGINAL LETTER</p>
              <h2>새벽구름의 편지</h2>
            </div>
            <button type="button" onClick={() => setSummaryOpen((current) => !current)}>
              {summaryOpen ? "접기" : "펼치기"}
            </button>
          </div>
          {summaryOpen && (
            <blockquote>
              “해결 방법을 듣고 싶은 건 아닌데, 그냥 누군가가 이 마음을 알아줬으면 좋겠어요.”
            </blockquote>
          )}
        </section>

        <section className="reply-sheet" aria-labelledby="reply-field-title">
          <label htmlFor="reply-body" id="reply-field-title" className="letter-field__label">
            나의 답장
          </label>
          <textarea
            id="reply-body"
            ref={replyRef}
            rows={13}
            value={reply}
            onChange={(event) => {
              setReply(event.target.value);
              setSaved(false);
            }}
            placeholder="편지를 읽고 느낀 마음을 천천히 적어보세요."
          />
          <span className="letter-count">{reply.length.toLocaleString()}자</span>
        </section>

        <section className="writing-prompts" aria-labelledby="writing-prompts-title">
          <p className="letter-kicker">WRITING NOTES</p>
          <h2 id="writing-prompts-title">어떤 말부터 시작할지 막막하다면</h2>
          <div>
            {[
              "편지를 읽으며 어떤 마음이 들었나요?",
              "어떤 문장이 가장 오래 마음에 남았나요?",
              "상대가 혼자가 아니라고 느낄 수 있는 말을 적어보세요.",
            ].map((prompt) => (
              <button
                type="button"
                key={prompt}
                onClick={() => {
                  if (!reply.trim()) setReply(`${prompt.replace("?", "")}\n\n`);
                  replyRef.current?.focus();
                }}
              >
                <span aria-hidden="true">—</span> {prompt}
              </button>
            ))}
          </div>
        </section>

        <aside className="reply-guidance">
          <strong>답장을 건네기 전에</strong>
          <p>좋은 답장은 상대방의 선택을 평가하거나 단정하지 않아요.</p>
        </aside>

        {saved && (
          <p className="save-notice" role="status">
            답장을 임시 저장했어요.
          </p>
        )}
      </div>

      <div className="letter-actionbar" aria-label="답장 작성 행동">
        <button
          type="button"
          className="letter-button letter-button--secondary"
          onClick={() => setSaved(true)}
        >
          임시 저장
        </button>
        <button
          type="button"
          className="letter-button letter-button--primary"
          onClick={reviewReply}
          disabled={!reply.trim()}
        >
          답장 미리보기
        </button>
      </div>

      {warningOpen && (
        <div className="letter-overlay" role="presentation">
          <section className="expression-warning" role="dialog" aria-modal="true" aria-labelledby="warning-title">
            <p className="letter-kicker">EXPRESSION CHECK</p>
            <h2 id="warning-title">조금 더 부드럽게 전해볼까요?</h2>
            <p className="warning-intro">이 표현은 상대방에게 비난이나 조롱으로 느껴질 수 있어요.</p>
            <dl>
              <div>
                <dt>기존 문장</dt>
                <dd>“{WARNING_SENTENCE}”</dd>
              </div>
              <div>
                <dt>추천 문장</dt>
                <dd>“{RECOMMENDED_SENTENCE}”</dd>
              </div>
            </dl>
            <div className="warning-actions">
              <button
                type="button"
                className="letter-button letter-button--secondary"
                onClick={() => {
                  setWarningOpen(false);
                  window.setTimeout(() => replyRef.current?.focus(), 0);
                }}
              >
                내용 고치기
              </button>
              <button
                type="button"
                className="letter-button letter-button--primary"
                onClick={() => {
                  setReply(RECOMMENDED_SENTENCE);
                  setScreenState("writing");
                  setWarningOpen(false);
                }}
              >
                추천 문장 사용하기
              </button>
            </div>
          </section>
        </div>
      )}

      {previewOpen && (
        <PreviewLayer title="새벽구름에게 보내는 답장" onClose={() => setPreviewOpen(false)}>
          <p className="preview-body">{reply}</p>
        </PreviewLayer>
      )}
    </LetterFrame>
  );
}
