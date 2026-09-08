import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getCurrentAppSearchParams, navigateBack, navigateTo } from "./navigation";
import { assignLetterToReader, createLetter, getCurrentUserId, getLetterById, getLetters, markReplyOpened, saveLetter, sendReply, transitionLetterStatus, type Letter } from "./letters";
import { getCurrentAnonymousName } from "./mockAuth";
import { clearLetterDraft, clearReplyDraft, deleteLetterDraft, deleteReplyDraft, getLetterDraft, getReplyDraft, hasMeaningfulLetterDraft, hasMeaningfulReplyDraft, updateLetterDraft, updateReplyDraft } from "./letterDraft";
import { seedSampleLetters } from "./sampleLetters";
import { getLetterStatusDate, getLetterStatusDescription, getLetterStatusLabel } from "./letterStatus";
import { useDraftAutosave } from "./draftGuards";
import { shouldFailDraftOperation } from "./draftDevTools";
import { isUserBlocked } from "./blocks";
import { SealedReply } from "./SealedReply";
import { getSentLetterDisplayStatus } from "./mailboxStatus";
import { isContentHidden, revealContent } from "./contentVisibility";
import { getLetterReturn } from "./letterReturns";
import { getReportForTarget } from "./reports";
import { recordDeliveryIssue, resolveDeliveryIssues } from "./deliveryIssues";
import { acceptReaderGuidance, hasAcceptedReaderGuidance } from "./readerGuidance";
import { getAvailableWaitingLetters, markWaitingLetterViewed, refreshWaitingLetterOrder, waitingLetterPreview, waitingLetterTimeText } from "./waitingLetters";
import { canSubmitLetter, canSubmitReply, reviewLetterSafety, reviewReplySafety } from "./safety";
import { isPrototypeQaMode } from "./prototypeQa";
import { ListenEntryLoadingState } from "./ListenEntryVariants";
import { formatDateTime } from "./datetime";
import { RETURNED_LETTER_BODY, RETURNED_LETTER_TITLE } from "./copy";
import { getListenEntryPath } from "./waitingLetters";
import { LetterReturnSheet } from "./SafetyActionScreens";

function FlowHeader({ title, fallback = "/home" }: { title: string; fallback?: string }) {
  return <header className="flow-header"><button type="button" onClick={() => navigateBack(fallback)} aria-label="이전으로 돌아가기">←</button><strong>{title}</strong><span aria-hidden="true" /></header>;
}

function FocusShell({ title, children, fallback, onBack, action, headerAction, hideBack = false, className = "", scrollClassName = "" }: { title: string; children: React.ReactNode; fallback?: string; onBack?: () => void; action?: React.ReactNode; headerAction?: React.ReactNode; hideBack?: boolean; className?: string; scrollClassName?: string }) {
  return <main className={`mobile-prototype letter-flow-screen ${className}`.trim()}><header className={`flow-header${headerAction ? " flow-header--action" : ""}`}>{hideBack ? <span aria-hidden="true" /> : <button type="button" onClick={onBack ?? (() => navigateBack(fallback ?? "/home"))} aria-label="이전으로 돌아가기">←</button>}<strong>{title}</strong>{headerAction ?? <span aria-hidden="true" />}</header><div className={`letter-flow-scroll ${scrollClassName}`.trim()}>{children}</div>{action}</main>;
}

function formatDate(value: string) {
  return formatDateTime(value);
}

function formatDateWithYear(value: string) {
  return formatDateTime(value);
}

function formatLetterReadTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const hour = date.getHours();
  const meridiem = hour >= 12 ? "pm" : "am";
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()} ${meridiem} ${hour % 12 || 12}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function excerpt(value: string, length = 92) {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > length ? `${normalized.slice(0, length)}…` : normalized;
}

type PreviewSafetyMatch = ReturnType<typeof reviewLetterSafety>["matches"][number];

function HighlightedPreviewContent({ content, matches }: { content: string; matches: PreviewSafetyMatch[] }) {
  const ranges = matches.flatMap((match) => match.startIndex === undefined || match.endIndex === undefined ? [] : [{ start: match.startIndex, end: match.endIndex }]).sort((left, right) => left.start - right.start).reduce<Array<{ start: number; end: number }>>((merged, range) => {
    const previous = merged.at(-1);
    if (previous && range.start <= previous.end) previous.end = Math.max(previous.end, range.end);
    else merged.push(range);
    return merged;
  }, []);
  if (!ranges.length) return <>{content}</>;
  const nodes: React.ReactNode[] = []; let cursor = 0;
  ranges.forEach((range, index) => {
    if (cursor < range.start) nodes.push(content.slice(cursor, range.start));
    nodes.push(<mark className="preview-safety-highlight" key={`${range.start}-${range.end}-${index}`}>{content.slice(range.start, range.end)}</mark>);
    cursor = range.end;
  });
  if (cursor < content.length) nodes.push(content.slice(cursor));
  return <>{nodes}</>;
}

function PreviewSafetyWarning() {
  return <aside className="preview-safety-warning" role="alert"><strong>상대에게 상처가 될 수 있는 표현이 있어요.</strong><span>안전을 위해 내용을 조금 다듬어주세요.</span></aside>;
}

function MissingLetterScreen({ fallback = "/mailbox", title = "편지" }: { fallback?: string; title?: string }) {
  return <FocusShell title={title} fallback={fallback}><section className="flow-message"><h1>편지를 찾을 수 없어요</h1><p>다시 편지함에서 확인해주세요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo("/mailbox")}>편지함 가기</button><button className="flow-text-button" type="button" onClick={() => navigateTo("/home")}>홈으로 돌아가기</button></section></FocusShell>;
}

function DraftExitDialog({ kind, onContinue, onSaveAndLeave, onDiscardAndLeave, isSaving = false }: { kind: "letter" | "reply"; onContinue: () => void; onSaveAndLeave: () => void; onDiscardAndLeave: () => void; isSaving?: boolean }) {
  const isLetter = kind === "letter";
  return <div className="draft-exit-overlay" role="dialog" aria-modal="true" aria-labelledby="draft-exit-title">
    <section className="draft-exit-panel">
      <div className="draft-exit-copy">
        <h2 id="draft-exit-title">아직 보내지 않은 {isLetter ? "이야기가" : "답장이"} 있어요</h2>
        <p>작성한 내용은 임시로 보관할 수 있어요.</p>
      </div>
      <div className="draft-exit-actions">
        <button className="flow-primary-button" type="button" onClick={onContinue} disabled={isSaving}>이어서 쓰기</button>
        <button className={`flow-secondary-button draft-exit-save-button${isSaving ? " is-saving" : ""}`} type="button" onClick={onSaveAndLeave} disabled={isSaving}>{isSaving ? <><span>보관 중</span><i className="draft-exit-saving-dots" aria-label="보관 중"><b /><b /><b /></i></> : "임시로 보관하고 나가기"}</button>
        <button className="flow-text-button" type="button" onClick={onDiscardAndLeave} disabled={isSaving}>{isLetter ? "작성 내용" : "답장"} 지우고 나가기</button>
      </div>
    </section>
  </div>;
}

export function WriteLetterFlowScreen() {
  const userId = getCurrentUserId();
  const initial = useMemo(() => getLetterDraft(userId), [userId]);
  const [content, setContent] = useState(initial?.content ?? "");
  const [anonymousName] = useState(initial?.anonymousName?.trim() || getCurrentAnonymousName());
  const [notice, setNotice] = useState("");
  const [showExit, setShowExit] = useState(false);
  const [isSavingAndLeaving, setIsSavingAndLeaving] = useState(false);
  const [writeState, setWriteState] = useState<"empty" | "writing" | "saved" | "error">(initial?.content.trim() ? "writing" : "empty");
  const contentInputRef = useRef<HTMLTextAreaElement>(null);
  const characterCountRef = useRef<HTMLElement>(null);
  const meaningfulContentLength = content.replace(/\s/g, "").length;
  const writingStateLabel = writeState === "saved" ? "임시 저장 완료" : writeState === "error" ? "저장하지 못했어요" : writeState === "writing" ? "작성 중" : "작성 전";

  useLayoutEffect(() => {
    const input = contentInputRef.current;
    if (!input) return;
    // 편지지는 CSS flex 로 남는 공간만큼 늘어나 있다. 그 상태로 높이를 재면
    // '늘어난 높이'를 글 내용의 높이로 착각해 그대로 굳혀버린다.
    // 그러면 한 번 커진 뒤에는 화면이 줄어도(회전·키보드) 편지지가 안 줄어든다.
    // 재는 동안만 늘어남을 꺼서 항상 내용만큼의 높이를 얻는다.
    // 남는 공간을 채우는 일은 CSS 가 맡으므로 화면 크기 변화는 저절로 따라간다.
    const previousFlexGrow = input.style.flexGrow;
    input.style.flexGrow = "0";
    input.style.height = "auto";
    const nextHeight = Math.max(260, input.scrollHeight);
    input.style.height = `${nextHeight}px`;
    input.style.flexGrow = previousFlexGrow;
  }, [content]);

  function saveNow() {
    const saved = Boolean(updateLetterDraft(userId, { content, anonymousName, stage: "writing" }));
    setWriteState(saved ? "saved" : "error");
    return saved;
  }

  function next() {
    if (meaningfulContentLength < 10) { setNotice("마음을 10자 이상 적어주세요."); return; }
    const draft = updateLetterDraft(userId, { content, anonymousName, stage: "review" });
    if (!draft) { setNotice("임시 저장하지 못했어요. 작성한 내용은 현재 화면에 남아 있어요."); return; }
    navigateTo("/letter-preview");
  }

  const goHome = () => {
    if (content.trim()) {
      setShowExit(true);
      return;
    }
    navigateTo("/home");
  };
  const action = <div className="flow-fixed-action flow-fixed-action--split"><button className="flow-secondary-button" type="button" onClick={() => { if (!saveNow()) setNotice("임시 저장하지 못했어요. 작성한 내용은 현재 화면에 남아 있어요."); }}>임시 저장</button><button className="flow-primary-button" type="button" onClick={next} disabled={meaningfulContentLength < 10}>보내기 전 미리보기</button></div>;
  return <FocusShell title="편지 쓰기" onBack={goHome} className="write-letter-screen--figma" action={action}><section className="letter-compose-intro"><h1>나의 이야기를<br />들려주세요</h1><p>정리되지 않아도, 한 문장도 괜찮아요.</p><img src="/assets/write-letter-object-reframed.png" alt="펜과 편지지, 잉크병" /></section><aside className="letter-compose-guidance"><strong>✻ <span>마음을 보내기 전에</span></strong><p>이름, 연락처, 주소, 학교나 회사 이름처럼<br />나를 알아볼 수 있는 정보는 적지 말아주세요.</p></aside><section className="letter-compose-paper"><div className="letter-compose-writing"><div className="letter-compose-field-heading"><label htmlFor="letter-content">편지 내용</label><small className={`letter-write-state is-${writeState}`} role="status">{writingStateLabel}</small></div><p className="flow-notice flow-notice--letter" role="status">{notice}</p><textarea ref={contentInputRef} id="letter-content" value={content} onChange={(event) => { const nextContent = event.target.value; setContent(nextContent); setNotice(""); setWriteState(nextContent.trim() ? "writing" : "empty"); }} placeholder="마음을 10자 이상 적어주세요." rows={1} /><small ref={characterCountRef} className="letter-compose-character-count">글자 수 {meaningfulContentLength}자</small></div></section>{showExit && <DraftExitDialog kind="letter" isSaving={isSavingAndLeaving} onContinue={() => setShowExit(false)} onSaveAndLeave={() => { if (isSavingAndLeaving) return; setIsSavingAndLeaving(true); window.setTimeout(() => { if (!saveNow()) { setNotice("임시 저장하지 못했어요. 작성한 내용은 현재 화면에 남아 있어요."); setIsSavingAndLeaving(false); return; } window.sessionStorage.setItem("gonggam-letter:draft-saved-toast", "letter-saved"); window.localStorage.setItem("gonggam-letter:draft-saved-toast-pending", "letter-saved"); navigateTo("/home?toast=letter-saved"); }, 640); }} onDiscardAndLeave={() => { deleteLetterDraft(); navigateTo("/home"); }} />}</FocusShell>;
}

export function LetterPreviewScreen() {
  const userId = getCurrentUserId();
  const draft = getLetterDraft(userId);
  const [notice, setNotice] = useState("");
  if (!draft?.content.trim()) return <MissingLetterScreen fallback="/write-letter" />;
  if (draft.stage !== "review") updateLetterDraft(userId, { stage: "review" });
  const review = reviewLetterSafety(draft.content, draft.id);
  const requiresRevision = review.status !== "clear";
  function submit() {
    if (shouldFailDraftOperation("letter-submit")) { recordDeliveryIssue("letter-send"); setNotice("편지를 보내지 못했어요. 작성한 내용은 그대로 보관되어 있어요."); return; }
    const review = reviewLetterSafety(draft.content, draft.id);
    updateLetterDraft(userId, { lastSafetyReviewId: review.id, lastSafetyStatus: review.status, lastSafetyCheckedAt: review.checkedAt });
    if (!canSubmitLetter(review)) {
      if (review.status === "high_risk") { navigateTo("/urgent-support"); return; }
      navigateTo("/letter-safety-review");
      return;
    }
    const letter = createLetter({ senderId: userId, anonymousName: draft.anonymousName.trim() || getCurrentAnonymousName(), content: draft.content, sourceDraftId: draft.id });
    if (!getLetterById(letter.id)) { setNotice("내용을 확인하지 못했어요. 작성한 내용은 그대로 보관되어 있어요."); return; }
    resolveDeliveryIssues("letter-send", undefined, userId);
    clearLetterDraft();
    navigateTo(`/letter-sent?id=${encodeURIComponent(letter.id)}`);
  }
  return <FocusShell title="편지 미리보기" fallback="/write-letter" className="letter-preview-screen" action={<div className="flow-fixed-action flow-fixed-action--split"><button type="button" className="flow-secondary-button" onClick={() => { updateLetterDraft(userId, { stage: "writing" }); navigateTo("/write-letter"); }}>수정하기</button><button type="button" className="flow-primary-button" onClick={submit} disabled={requiresRevision}>편지 보내기</button></div>}><section className="flow-review"><h1><strong>편지</strong>를 보내기 전에<br />살펴봐주세요</h1><p className="reply-review-intro">서두르지 않아도 괜찮아요.</p><img className="reply-review-header-illustration" src="/assets/reply-review-open-letter-glasses.png" alt="" aria-hidden="true" /><article className={`flow-letter-paper${requiresRevision ? " flow-letter-paper--with-safety-warning" : ""}`}>{requiresRevision && <PreviewSafetyWarning />}<span className="my-letter-waiting-quote my-letter-waiting-quote--open" aria-hidden="true">“</span><blockquote>{requiresRevision ? <HighlightedPreviewContent content={draft.content} matches={review.matches} /> : draft.content}</blockquote><span className="my-letter-waiting-quote my-letter-waiting-quote--close" aria-hidden="true">”</span><span className="letter-preview-signature">─ {draft.anonymousName.trim() || getCurrentAnonymousName()}</span><small className="reply-review-edited-at">{formatDateTime(draft.updatedAt)}에 마지막으로 다듬었어요.</small></article><section className="reply-review-guidance" aria-label="보내기 전 점검"><h2>보내기 전, 잠시 살펴봐주세요</h2><ul className="review-list"><li>보내고 나면 내용을 고칠 수 없어요.</li><li>부적절하거나 불법적인 내용은 없나요?</li><li>개인정보나 연락처를 적지 않았나요?</li><li>학교·회사처럼 나를 짐작하게 하는 내용은 없나요?</li></ul></section><p className="flow-notice" role="status">{notice}</p>{notice && <button className="flow-text-button" type="button" onClick={() => navigateTo("/write-letter")}>편지로 돌아가기</button>}</section></FocusShell>;
}

export function LetterSentScreen({ letterId }: { letterId?: string }) {
  const letter = letterId ? getLetterById(letterId) : undefined;
  if (!letter) return <MissingLetterScreen fallback="/mailbox" />;
  return <FocusShell title="발송 완료" fallback="/home" hideBack><section className="flow-complete"><img src="/assets/reply-sent-lavender-envelope.png" alt="봉인된 편지 봉투" /><h1>편지를 보냈어요</h1><p>오늘 쓴 한 통이 누군가에게 가는 중이에요.</p><div><button className="flow-primary-button" type="button" onClick={() => navigateTo("/mailbox")}>편지함 가기</button><button className="flow-text-button" type="button" onClick={() => navigateTo("/home")}>홈으로 돌아가기</button></div></section></FocusShell>;
}

export function WaitingLettersScreen() {
  seedSampleLetters();
  const currentUserId = getCurrentUserId(); const prototypeState = getCurrentAppSearchParams().get("prototype"); const [state, setState] = useState<"normal" | "test-list" | "empty" | "loading" | "error" | "offline">(() => prototypeState === "letters" ? "test-list" : prototypeState === "empty" ? "empty" : "normal"); const [refresh, setRefresh] = useState(0);
  const letters = getAvailableWaitingLetters(currentUserId, refresh);
  const testLetters = state === "test-list" ? ensureWaitingListTestLetters(currentUserId) : [];
  const visibleLetters = state === "test-list" ? testLetters : letters;
  const open = (letterId: string) => { markWaitingLetterViewed(letterId); navigateTo(`/read-letter/${encodeURIComponent(letterId)}`); };
  const reshuffle = () => { if (state === "loading") return; setState("loading"); window.setTimeout(() => { refreshWaitingLetterOrder(); setRefresh((value) => value + 1); setState("normal"); }, 360); };
  const isEmptyState = state === "empty" || !visibleLetters.length;
  return <FocusShell title="기다리는 편지" fallback="/home">{!isEmptyState && <section className="waiting-heading"><h1>기다리는 마음들</h1><p>지금 천천히 읽을 여유가 있는 편지를 골라주세요. 열어보기만 해서는 맡아지지 않아요.</p></section>}{state === "loading" ? <section className="waiting-loading" aria-live="polite"><strong>기다리는 편지를 만나고 있어요.</strong><i /><i /><i /></section> : state === "error" || state === "offline" ? <section className="flow-message"><h1>{state === "offline" ? "인터넷 연결을\n확인해주세요" : "편지를 불러오지 못했어요"}</h1><p>잠시 후 다시 확인해주세요.</p><button className="flow-primary-button" type="button" onClick={() => setState("normal")}>다시 확인하기</button></section> : isEmptyState ? <section className="flow-message"><h1>지금은 기다리는 편지가 없어요</h1><p>새로운 마음이 도착하면 이곳에서 만날 수 있어요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo("/home")}>홈으로 돌아가기</button><button className="flow-text-button" type="button" onClick={reshuffle}>다시 확인하기</button></section> : <><section className="waiting-list" aria-label={state === "test-list" ? "기다리는 편지 정상 상태 테스트" : "읽고 맡을 수 있는 기다리는 편지"}>{visibleLetters.map((letter) => <WaitingLetterCard key={letter.id} letter={letter} onOpen={() => open(letter.id)} />)}</section><button className="waiting-refresh" type="button" onClick={reshuffle}>다른 편지 더 보기</button></>}{isPrototypeQaMode() && <details className="prototype-test-panel waiting-test-panel"><summary>프로토타입 상태</summary><p>기다리는 편지가 있는 경우와 없는 경우를 바로 확인할 수 있어요.</p><div><button type="button" className={state === "test-list" ? "is-active" : ""} onClick={() => navigateTo("/waiting-letters?qa=1&prototype=letters")}>편지가 있을 때</button><button type="button" className={state === "empty" ? "is-active" : ""} onClick={() => navigateTo("/waiting-letters?qa=1&prototype=empty")}>편지가 없을 때</button></div></details>}</FocusShell>;
}

export function WaitingLetterCard({ letter, onOpen }: { letter: Letter; onOpen: () => void }) { const preview = waitingLetterPreview(letter.content); const time = waitingLetterTimeText(letter.createdAt); const displayName = letter.isPrototypeFixture ? `${letter.anonymousName || "이름 없는 마음"}님` : "기다리는 편지"; return <button type="button" onClick={onOpen} aria-label={`${time}, ${displayName}, ${preview}`}><span><strong>{displayName}</strong><time dateTime={letter.createdAt}>{time}</time></span><p>{preview}</p><small>편지 열어보기</small></button>; }

function ensureWaitingListTestLetters(userId: string) {
  const shortLetterContent = `요즘 회사에서 내가 하는 일이 아무 의미가 없는 것처럼 느껴져요.

열심히 해도 달라지는 건 없고, 새로운 일을 시작할 힘도 없는 것 같아요. 주변에서는 조금만 더 버티라고 하지만, 언제까지 버텨야 하는지도 모르겠어요.

해결 방법을 듣고 싶은 건 아닌데, 그냥 누군가가 이 마음을 알아줬으면 좋겠어요.

하루를 마치고 돌아오면 마음이 더 조용해져요. 그래서 이 편지에 조금씩 마음을 적어봅니다.

오늘만은 누군가에게 조용히 마음을 건네고 싶었어요.`;
  const scenarios = [
    { id: "waiting-inline-test-short", anonymousName: "고요한 구름", content: "오늘은 누군가에게 조용히 마음을 건네고 싶었어요.", hours: 2 },
    { id: "waiting-inline-test-ten-character", anonymousName: "별빛을닮은고요한새벽", content: "오늘은 누군가에게 조용히 마음을 건네고 싶었어요.", hours: 2 },
    { id: "waiting-inline-test-long", anonymousName: "느린 별빛", content: "요즘은 누구에게도 쉽게 말하지 못한 생각이 자꾸 마음에 남아요. 누군가가 판단하지 않고 끝까지 읽어준다면 조금 괜찮아질 것 같아요. 그래서 이 편지에 천천히 마음을 남겨봅니다.", hours: 53 },
    { id: "waiting-inline-test-special", anonymousName: "따뜻한 달빛", content: "오늘은 조금 복잡해요… 그래도 괜찮아질 거예요. ☁︎", hours: 120 },
  ];
  return scenarios.map((scenario) => { const content = scenario.id === "waiting-inline-test-short" ? shortLetterContent : scenario.content; const existing = getLetterById(scenario.id); if (existing) { const refreshed = { ...existing, anonymousName: scenario.anonymousName, content }; saveLetter(refreshed); return refreshed; } const createdAt = new Date(Date.now() - scenario.hours * 3_600_000).toISOString(); const letter: Letter = { id: scenario.id, senderId: `waiting-inline-${scenario.id}`, anonymousName: scenario.anonymousName, content, createdAt, updatedAt: createdAt, status: "waiting_for_reader", retryCount: 0, isPrototypeFixture: true, prototypeScenario: "waiting-inline-test", prototypeWaitingScenario: "normal", safetyStatus: "clear", moderationStatus: "not_required", statusHistory: [{ status: "waiting_for_reader", changedAt: createdAt }], lastStatusChangedAt: createdAt }; saveLetter(letter); return letter; });
}

function forceReplyTestAssignment(letterId: string, userId: string) {
  const fixture = ensureWaitingListTestLetters(userId).find((letter) => letter.id === letterId);
  if (!fixture) return undefined;
  const now = new Date().toISOString();
  const { reply: _reply, repliedAt: _repliedAt, replyOpenedAt: _replyOpenedAt, ...unrepliedFixture } = fixture;
  const assignedFixture = { ...unrepliedFixture, status: "assigned" as const, assignedReaderId: userId, assignedAt: now, readAt: undefined, waitingForReplyAt: undefined, statusHistory: [...fixture.statusHistory, { status: "assigned" as const, changedAt: now }], lastStatusChangedAt: now, updatedAt: now };
  saveLetter(assignedFixture);
  return assignedFixture;
}

function ensureForcedReplyTestDraft(letterId: string, userId: string) {
  const existing = getReplyDraft(letterId, userId);
  if (existing?.content.trim()) return existing;
  return updateReplyDraft(letterId, userId, {
    content: "읽으며 마음이 많이 쓰였어요.\n오늘은 스스로에게도 조금 다정한 시간을 내어주세요.",
    stage: "review",
    letterStatusAtSave: "assigned",
  });
}

export function ReaderPromiseScreen({ letterId }: { letterId?: string }) {
  const letter = letterId ? getLetterById(letterId) : undefined;
  if (!letter) return <MissingLetterScreen fallback="/home" />;
  if (hasAcceptedReaderGuidance()) return <ReadLetterFlowScreen letterId={letter.id} />;
  return <FocusShell title="안내" fallback={`/read-letter/${letter.id}`} action={<div className="flow-fixed-action flow-fixed-action--split"><button className="flow-secondary-button" type="button" onClick={() => navigateTo(`/read-letter/${encodeURIComponent(letter.id)}`)}>돌아가기</button><button className="flow-primary-button" type="button" onClick={() => { acceptReaderGuidance(); navigateTo(`/assign-letter/${encodeURIComponent(letter.id)}`); }}>동의하고 맡기</button></div>}><section className="reader-promise"><h1>마음을 안전하게<br />이어가기 위해</h1><p>이 안내는 처음 편지를 맡을 때 한 번만 보여드려요.</p><p className="reader-promise-expectation">편지를 맡은 뒤에는 한 통의 답장을 남기게 돼요. 지금 여유가 없다면 맡지 않아도 괜찮아요.</p><ul><li>상대방을 판단하거나 비난하지 않기</li><li>연락처와 개인정보를 요구하지 않기</li><li>답장을 강요하거나 관계를 이어가려 하지 않기</li><li>답장이 어렵다면 편지를 반환할 수 있기</li></ul></section></FocusShell>;
}

export function ReadLetterFlowScreen({ letterId, assignedReaderMode = false }: { letterId?: string; assignedReaderMode?: boolean }) {
  // 두고 가기 확인은 페이지를 옳기지 않고 이 화면 위에 시트로 띄운다.
  // 뒤에 읽던 편지가 남아 있어야 '이 편지를'라는 말이 성립한다.
  // 가드보다 위에 두어야 훅이 조건부로 호출되지 않는다.
  const [showReturnSheet, setShowReturnSheet] = useState(false);
  if (letterId?.startsWith("waiting-inline-test-")) ensureWaitingListTestLetters(getCurrentUserId());
  if (letterId?.startsWith("sample-waiting-letter-")) seedSampleLetters();
  const letter = letterId ? getLetterById(letterId) : undefined;
  const isBlockedContentPreview = getCurrentAppSearchParams().get("preview") === "blocked-content";
  if (isBlockedContentPreview) return <FocusShell title="편지 읽기" fallback="/home" hideBack><section className="flow-message"><h1>차단한 사용자의 콘텐츠예요</h1><p>안전을 위해 이 내용은 기본적으로 숨겨져 있어요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo("/safety-management")}>차단 내역 확인</button><button className="flow-text-button" type="button" onClick={() => navigateTo("/home")}>홈으로 돌아가기</button></section></FocusShell>;
  if (!letter) return <MissingLetterScreen fallback="/home" title="편지 읽기" />;
  if (assignedReaderMode && (letter.assignedReaderId !== getCurrentUserId() || !["assigned", "read", "waiting_for_reply"].includes(letter.status) || getLetterReturn(letter.id, getCurrentUserId()))) return <MissingLetterScreen fallback="/home" title="편지 읽기" />;
  if (letter.senderId === getCurrentUserId()) return <MissingLetterScreen fallback="/home" title="편지 읽기" />;
  if (letter.prototypeWaitingScenario === "returned") return <FocusShell title="편지 읽기" fallback="/home"><section className="flow-message"><h1>{RETURNED_LETTER_TITLE}</h1><p>{RETURNED_LETTER_BODY}</p><button className="flow-primary-button" type="button" onClick={() => navigateTo(getListenEntryPath(getCurrentUserId()))}>다른 편지 만나기</button></section></FocusShell>;
  if (letter.prototypeWaitingScenario === "blocked") return <FocusShell title="편지 읽기" fallback="/home"><section className="flow-message"><h1>차단한 사용자와 연결된 편지예요</h1><p>안전을 위해 이 내용은 확인할 수 없어요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo(getListenEntryPath(getCurrentUserId()))}>다른 편지 만나기</button></section></FocusShell>;
  if (letter.prototypeWaitingScenario === "deleted") return <FocusShell title="편지 읽기" fallback="/home"><section className="flow-message"><h1>이 편지를 찾을 수 없어요</h1><p>지워졌거나, 더는 열어볼 수 없는 편지예요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo(getListenEntryPath(getCurrentUserId()))}>다른 편지 만나기</button></section></FocusShell>;
  if (letter.status === "withdrawn") return <FocusShell title="편지 읽기" fallback="/home"><section className="flow-message"><h1>편지의 주인이<br />편지를 거두었어요</h1><p>더 이상 이 편지를 읽거나 답장을 쓸 수 없어요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo(getListenEntryPath(getCurrentUserId()))}>다른 편지 만나기</button></section></FocusShell>;
  if (["high_risk", "needs_revision", "under_review", "blocked"].includes(letter.safetyStatus ?? "clear") || ["pending", "reviewing", "rejected"].includes(letter.moderationStatus ?? "not_required")) return <FocusShell title="편지 읽기" fallback="/home"><section className="flow-message"><h1>현재 이 편지를<br />열 수 없어요</h1><p>안전을 위해 이 편지의 내용을 확인할 수 없어요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo(getListenEntryPath(getCurrentUserId()))}>다른 편지 만나기</button></section></FocusShell>;
  if (getLetterReturn(letter.id, getCurrentUserId())) return <FocusShell title="편지 읽기" fallback="/home"><section className="flow-message"><h1>{RETURNED_LETTER_TITLE}</h1><p>{RETURNED_LETTER_BODY}</p><button className="flow-primary-button" type="button" onClick={() => navigateTo(getListenEntryPath(getCurrentUserId()))}>다른 편지 만나기</button></section></FocusShell>;
  if (isUserBlocked(getCurrentUserId(), letter.senderId)) return <FocusShell title="편지 읽기" fallback="/home" hideBack><section className="flow-message"><h1>차단한 사용자의 콘텐츠예요</h1><p>안전을 위해 이 내용은 기본적으로 숨겨져 있어요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo("/safety-management")}>차단 내역 확인</button><button className="flow-text-button" type="button" onClick={() => navigateTo("/home")}>홈으로 돌아가기</button></section></FocusShell>;
  if (letter.assignedReaderId && letter.assignedReaderId !== getCurrentUserId()) return <FocusShell title="편지 읽기" fallback="/home"><section className="flow-message"><h1>이 편지는 다른 사람이<br />먼저 맡았어요</h1><p>다른 기다리는 마음을 만나볼 수 있어요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo(getListenEntryPath(getCurrentUserId()))}>다른 편지 만나기</button><button className="flow-text-button" type="button" onClick={() => navigateTo("/home")}>홈으로 돌아가기</button></section></FocusShell>;
  const alreadyAssignedToCurrentUser = letter.assignedReaderId === getCurrentUserId();
  const continueTo = (destination: "reply" | "return") => {
    if (alreadyAssignedToCurrentUser) {
      navigateTo(`/${destination === "reply" ? "write-reply" : "return-letter"}/${encodeURIComponent(letter.id)}${destination === "return" ? "?start=1" : ""}`);
      return;
    }

    const result = assignLetterToReader(letter.id, getCurrentUserId());
    if (result.ok) {
      navigateTo(`/${destination === "reply" ? "write-reply" : "return-letter"}/${encodeURIComponent(letter.id)}${destination === "return" ? "?start=1" : ""}`);
      return;
    }
    navigateTo(getListenEntryPath(getCurrentUserId()));
  };
  // 편지를 맡은 뒤에도 '안 받을게요'는 그대로 둔다.
  //
  // 예전에는 맡고 나면 이 버튼을 감췄다. 그러면 두고 갈 방법이 아예 사라진다 —
  // 두고 가기 시트를 여는 곳이 이 버튼 하나뿐이라, 답장을 보내거나 3일이 지나
  // 편지가 사라지기를 기다리는 것 말고는 빠져나올 길이 없었다.

  // 오른쪽 버튼 문구는 '맡았는가'가 아니라 '쓰다 만 답장이 있는가'로 갈린다.
  //
  // 편지를 맡는 것과 답장을 쓰기 시작하는 것은 다른 일이다. 맡기만 하고
  // 한 글자도 쓰지 않았는데 '이어 쓰기'라고 하면, 쓴 적 없는 것을 이어 쓰라는
  // 말이 된다 — 새 편지를 받자마자 이 화면에 오면 늘 그 상태다.
  const replyDraft = getReplyDraft(letter.id, getCurrentUserId());
  const hasReplyDraft = Boolean(replyDraft?.content.trim());
  const useFirstMeetingActions = letter.id === "sample-waiting-letter-one";
  const startReply = () => {
    if (useFirstMeetingActions) {
      if (!alreadyAssignedToCurrentUser) assignLetterToReader(letter.id, getCurrentUserId());
      navigateTo(`/write-reply/${encodeURIComponent(letter.id)}`);
      return;
    }
    continueTo("reply");
  };
  // 뒤로가기는 히스토리를 되감고, 되감을 것이 없을 때만 아래 fallback 으로 간다.
  //
  // 예전에는 답장을 쓰던 중일 때 `/write-reply/:id` 로 '밀어 넣어' 돌려보냈다.
  // 그 순간 답장 쓰기 ↔ 편지 읽기 사이를 오가는 순환이 생겼다. 뒤로가기가
  // 앞으로 가는 동작이면 언제나 이런 고리가 만들어진다.
  //
  // fallback 을 홈으로 둔 이유:
  //  · 이 화면에 오는 길이 여럿이다(편지 만나기 · 홈 소식 카드의 "답장 쓰기" · 편지함).
  //    편지 만나기로 되돌리면 다른 길로 온 사람에게는 가 본 적 없는 화면이 나온다.
  //  · 편지 만나기는 새 편지를 받는 관문이라, 이미 편지를 든 사람을 그리로 보내면
  //    한 통 더 받으라는 뜻으로 읽힌다.
  //  · 편지 만나기 자신의 뒤로가기도 홈이다. 한 단계를 건너뛸 뿐 방향은 어긋나지 않는다.
  return <FocusShell title="편지 읽기" fallback="/home" className="letter-flow-screen--active-reader" scrollClassName="active-reading-scroll" action={<div className="flow-fixed-action flow-fixed-action--split"><button className="flow-secondary-button" type="button" onClick={() => setShowReturnSheet(true)}>안 받을게요</button><button className="flow-primary-button" type="button" onClick={startReply}>{hasReplyDraft ? "답장 이어 쓰기" : "이 편지에 답장하기"}</button></div>}><section className="active-reading-room" aria-label="조용한 편지 읽기 공간"><div className="active-reading-room-copy"><h1><strong>{letter.anonymousName}</strong>님이<br />보낸 편지</h1><p className="active-reading-kicker"><time dateTime={letter.createdAt}>{formatLetterReadTime(letter.createdAt)}</time></p></div><img src="/assets/read-letter-room-framed-two-trimmed.png" alt="" aria-hidden="true" /></section><div className="active-reading-mat"><article className="active-reading-paper"><span className="active-reading-quote active-reading-quote--open" aria-hidden="true">“</span><blockquote>{letter.content}</blockquote><span className="active-reading-quote active-reading-quote--close" aria-hidden="true">”</span><div className="active-reading-report-area"><button className="flow-text-button active-reading-report" type="button" onClick={() => navigateTo(`/report-letter/${encodeURIComponent(letter.id)}`)}>신고하기</button></div></article></div><section className="active-reading-helper"><img src="/assets/home-cards-ornaments-01.svg" alt="" aria-hidden="true" /><p><strong>당신의 마음을 전해주세요</strong><span>짧은 한마디도 누군가에게 힘이 될 수 있어요.</span></p></section>{showReturnSheet && <LetterReturnSheet hasDraft={hasReplyDraft} onCancel={() => setShowReturnSheet(false)} onConfirm={() => continueTo("return")} />}</FocusShell>;
}

export function AssignedLetterFlowScreen({ letterId }: { letterId?: string }) {
  return <ReadLetterFlowScreen letterId={letterId} assignedReaderMode />;
}

export function AssignLetterScreen({ letterId }: { letterId?: string }) {
  const [notice, setNotice] = useState("");
  const [phase, setPhase] = useState<"processing" | "failed">("processing");
  const letter = letterId ? getLetterById(letterId) : undefined;
  useEffect(() => {
    if (!letter) return;
    const timer = window.setTimeout(() => {
      const result = letter.prototypeWaitingScenario === "race_lost" ? { ok: false as const, reason: "already-assigned" as const } : assignLetterToReader(letter.id, getCurrentUserId());
      if (result.ok) { navigateTo(`/write-reply/${encodeURIComponent(letter.id)}`); return; }
      setPhase("failed");
      setNotice(result.reason === "already-assigned" ? "이 편지는 다른 사람이 먼저 맡았어요. 다른 기다리는 편지를 만나볼 수 있어요." : "이 편지를 지금 맡을 수 없어요.");
    }, 460);
    return () => window.clearTimeout(timer);
  }, [letter?.id]);
  if (!letter) return <MissingLetterScreen fallback="/home" />;
  return <FocusShell title="편지 맡기" fallback={`/read-letter/${letter.id}`} action={phase === "failed" ? <div className="flow-fixed-action flow-fixed-action--split"><button className="flow-secondary-button" type="button" onClick={() => navigateTo("/home")}>홈으로 돌아가기</button><button className="flow-primary-button" type="button" onClick={() => navigateTo(getListenEntryPath(getCurrentUserId()))}>다른 편지 만나기</button></div> : undefined}><section className="assign-confirm"><h1>{phase === "processing" ? "편지를 맡고 있어요" : "다른 편지를 만나볼까요?"}</h1><p>{phase === "processing" ? "잠시만 기다려주세요." : "다른 기다리는 편지를 만나볼 수 있어요."}</p><p className="flow-notice" role="status">{notice}</p></section></FocusShell>;
}

export function WriteReplyFlowScreen({ letterId }: { letterId?: string }) {
  const currentUserId = getCurrentUserId();
  if (letterId === "reply-review-test") ensureReplyReviewTestLetter(currentUserId);
  if (letterId?.startsWith("sample-waiting-letter-")) seedSampleLetters();
  const forcedTestLetter = letterId?.startsWith("waiting-inline-test-") && getCurrentAppSearchParams().get("force") === "1" ? forceReplyTestAssignment(letterId, currentUserId) : undefined;
  let letter = forcedTestLetter ?? (letterId ? getLetterById(letterId) : undefined);
  // This first-meeting prototype is entered directly from the read screen.
  // Restore its reply-ready state even when a prior prototype session left no stored fixture.
  if (letterId === "sample-waiting-letter-one" && (!letter || letter.assignedReaderId !== currentUserId || !["assigned", "read", "waiting_for_reply"].includes(letter.status))) {
    const now = new Date().toISOString();
    letter = saveLetter({
      id: "sample-waiting-letter-one",
      senderId: letter?.senderId ?? "sample-sender-dawn",
      anonymousName: letter?.anonymousName ?? "새벽의 편지",
      content: letter?.content ?? "요즘은 누구에게도 쉽게 말하지 못한 마음이 있어요. 그냥 누군가가 끝까지 읽어준다면 조금 괜찮아질 것 같아요.",
      createdAt: letter?.createdAt ?? now,
      updatedAt: now,
      retryCount: letter?.retryCount ?? 0,
      ...letter,
      status: "assigned",
      assignedReaderId: currentUserId,
      assignedAt: now,
      lastStatusChangedAt: now,
    });
  }
  const initial = useMemo(() => letterId ? getReplyDraft(letterId, currentUserId) : undefined, [letterId, currentUserId]);
  const [content, setContent] = useState(initial?.content ?? "");
  const [notice, setNotice] = useState("");
  const [showExit, setShowExit] = useState(false); const [showSource, setShowSource] = useState(false);
  const [isSavingReplyAndLeaving, setIsSavingReplyAndLeaving] = useState(false);
  const [replyWriteState, setReplyWriteState] = useState<"empty" | "writing" | "saved" | "error">(initial?.content.trim() ? "writing" : "empty");
  const replyContentInputRef = useRef<HTMLTextAreaElement>(null);
  const replyCharacterCountRef = useRef<HTMLElement>(null);
  const meaningfulReplyLength = content.replace(/\s/g, "").length;
  if (letter?.status === "withdrawn") return <FocusShell title="답장 쓰기" fallback="/home"><section className="flow-message"><h1>편지의 주인이<br />편지를 거두었어요</h1><p>더 이상 답장을 쓸 수 없어요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo(getListenEntryPath(getCurrentUserId()))}>다른 편지 만나기</button></section></FocusShell>;
  if (letter && getLetterReturn(letter.id, currentUserId)) return <FocusShell title="답장 쓰기" fallback="/home"><section className="flow-message"><h1>{RETURNED_LETTER_TITLE}</h1><p>{RETURNED_LETTER_BODY}</p><button className="flow-primary-button" type="button" onClick={() => navigateTo(getListenEntryPath(getCurrentUserId()))}>다른 편지 만나기</button><button className="flow-text-button" type="button" onClick={() => navigateTo("/home")}>홈으로 돌아가기</button></section></FocusShell>;
  if (!letter || letter.assignedReaderId !== currentUserId || !["assigned", "read", "waiting_for_reply"].includes(letter.status)) return <MissingLetterScreen fallback="/home" />;
  useEffect(() => { if (letter.status === "assigned") transitionLetterStatus(letter.id, "waiting_for_reply", currentUserId, { waitingForReplyAt: new Date().toISOString() }); }, [letter.id, letter.status, currentUserId]);
  useLayoutEffect(() => {
    const input = replyContentInputRef.current;
    if (!input) return;
    const scroll = input.closest<HTMLElement>(".letter-flow-scroll");
    const previousScrollTop = scroll?.scrollTop;
    input.style.height = "auto";
    const nextHeight = Math.max(410, input.scrollHeight);
    input.style.height = `${nextHeight}px`;
    if (scroll && previousScrollTop !== undefined) scroll.scrollTop = previousScrollTop;
  }, [content]);
  const { saveNow } = useDraftAutosave({ content }, (value) => Boolean(updateReplyDraft(letter.id, currentUserId, { ...value, stage: "writing", letterStatusAtSave: letter.status })));
  /** 답장을 쓰다가 원문을 잠깐 들춰보는 전체화면 시트. 페이지를 떠나지 않으므로 초안이 유지된다. */
function ReplySourceSheet({ letter, onClose }: { letter: Letter; onClose: () => void }) {
  // 시트가 열리면 초점을 시트 자체로 옮긴다. 예전에는 닫기 버튼에 옮겼는데,
  // 전역 규칙 button:focus-visible 이 금색 사각 테두리를 그려서 실기기에서
  // 열자마자 X 에 테두리가 생겼다. 대화상자를 여는 표준은 '컨테이너로 초점 이동'이다 —
  // 화면 읽기 프로그램은 aria-labelledby 로 제목을 읽어주고, 키보드 Tab 은
  // 시트 안에서 이어지며, 버튼이 눌린 것처럼 보이는 표시는 남지 않는다.
  const sheetRef = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    sheetRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setClosing(true); };
    window.addEventListener("keydown", onKey);
    // 시트가 떠 있는 동안 뒤 화면이 스크롤되지 않게 잠근다.
    const scroller = document.querySelector<HTMLElement>(".letter-flow-scroll");
    const previousOverflow = scroller?.style.overflow ?? "";
    if (scroller) scroller.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      if (scroller) scroller.style.overflow = previousOverflow;
    };
  }, []);
  // 닫을 때는 내려가는 모션이 끝난 뒤에 사라진다. 시간을 코드에 박아두면
  // CSS 에서 속도를 바꿨을 때 어긋나므로, 애니메이션 종료 신호를 그대로 받는다.
  // (신호가 오지 않는 환경을 대비해 넉넉한 예비 타이머를 함께 둔다.)
  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(onClose, 900);
    return () => window.clearTimeout(timer);
  }, [closing, onClose]);
  const sentAt = formatDateTime(letter.createdAt);
  return (
    <div
      className={`reply-source-backdrop${closing ? " is-closing" : ""}`}
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) setClosing(true); }}
    >
      <div
        ref={sheetRef}
        tabIndex={-1}
        className={`reply-source-sheet${closing ? " is-closing" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reply-source-title"
        onAnimationEnd={(event) => { if (closing && event.target === event.currentTarget) onClose(); }}
      >
        <button className="reply-source-close" type="button" onClick={() => setClosing(true)} aria-label="원문 닫기">×</button>
        <div className="reply-source-header">
          <time dateTime={letter.createdAt}>{sentAt}</time>
          <h2 id="reply-source-title"><b>{letter.anonymousName}</b>님이 보낸 편지</h2>
        </div>
        <div className="reply-source-body">
          <p>원문 확인</p>
          <article className="reply-source-letter"><p>{letter.content}</p></article>
        </div>
      </div>
    </div>
  );
}

function saveReplyNow() { const saved = saveNow(); setReplyWriteState(saved ? "saved" : "error"); return saved; }
  function next() { if (meaningfulReplyLength < 10) { setNotice("마음을 10자 이상 적어주세요."); return; } const draft = updateReplyDraft(letter.id, currentUserId, { content, stage: "review", letterStatusAtSave: letter.status }); if (!draft) { setNotice("임시 저장하지 못했어요. 작성한 내용은 현재 화면에 남아 있어요."); return; } navigateTo(`/reply-review/${encodeURIComponent(letter.id)}`); }
  // 뒤로가기는 되돌아가는 것이지, 새 화면을 밀어 넣는 것이 아니다.
  //
  // 예전에는 초안이 비었을 때 navigateTo(`/assigned-letter/:id`) 로 편지 읽기
  // 화면을 '앞으로' 밀어 넣었다. 그런데 그 화면의 뒤로가기는 history.back() 이라
  // 다시 이 화면으로 돌아오고, 여기서 또 밀어 넣어 —
  // 답장 쓰기 → 편지 읽기 → 답장 쓰기 → … 가 끝없이 반복됐다.
  // 히스토리를 되감으면 온 길 그대로 나가므로 순환이 생기지 않는다.
  const leave = () => { if (content.trim()) setShowExit(true); else navigateBack("/home"); };
  const replyActions = <div className="flow-fixed-action flow-fixed-action--split reply-flow-fixed-action"><button type="button" className="flow-secondary-button" onClick={() => { if (!saveReplyNow()) setNotice("임시 저장하지 못했어요. 작성한 내용은 현재 화면에 남아 있어요."); }}>임시 저장</button><button type="button" className="flow-primary-button" onClick={next} disabled={meaningfulReplyLength < 10}>보내기 전 미리보기</button></div>;
  return <FocusShell title="답장 쓰기" onBack={leave} className="write-letter-screen--figma reply-compose-screen--figma" headerAction={<button className="reply-read-letter-button" type="button" onClick={() => setShowSource(true)} aria-haspopup="dialog" aria-expanded={showSource}><span>원문 보기</span></button>} action={replyActions}><section className="reply-compose-intro"><h1><strong>{letter.anonymousName}</strong>님에게<br />마음을 전해주세요</h1><p>읽는 동안 떠오른 말이면 충분해요.</p><img src="/assets/write-letter-object-reframed.png" alt="펜과 편지지, 잉크병" /></section><aside className="reply-compose-guidance"><strong>✻ <span>마음을 전하기 전에</span></strong><p>상대방을 판단하거나 해결책을 서두르기보다,<br />편지를 읽으며 느낀 마음을 천천히 전해주세요.</p></aside><section className="reply-compose-paper"><div className="letter-compose-field-heading"><label className="reply-compose-recipient" htmlFor="reply-content">{letter.anonymousName}님에게</label><small className={`letter-write-state is-${replyWriteState}`} role="status">{replyWriteState === "saved" ? "임시 저장 완료" : replyWriteState === "error" ? "저장하지 못했어요" : replyWriteState === "writing" ? "작성 중" : "작성 전"}</small></div><p className="flow-notice flow-notice--reply" role="status">{notice}</p><div className="reply-compose-writing"><textarea ref={replyContentInputRef} id="reply-content" aria-label="답장 내용" value={content} onChange={(event) => { const nextContent = event.target.value; setContent(nextContent); setNotice(""); setReplyWriteState(nextContent.trim() ? "writing" : "empty"); }} placeholder="마음을 10자 이상 적어주세요." rows={12} /><small ref={replyCharacterCountRef}>글자 수 {meaningfulReplyLength}자</small></div></section>{showSource && <ReplySourceSheet letter={letter} onClose={() => setShowSource(false)} />}{showExit && <DraftExitDialog kind="reply" isSaving={isSavingReplyAndLeaving} onContinue={() => setShowExit(false)} onSaveAndLeave={() => { if (isSavingReplyAndLeaving) return; setIsSavingReplyAndLeaving(true); window.setTimeout(() => { if (!saveReplyNow()) { setNotice("임시 저장하지 못했어요. 작성한 내용은 현재 화면에 남아 있어요."); setIsSavingReplyAndLeaving(false); return; } window.sessionStorage.setItem("gonggam-letter:draft-saved-toast", "reply-saved"); window.localStorage.setItem("gonggam-letter:draft-saved-toast-pending", "reply-saved"); navigateTo("/home?toast=reply-saved"); }, 640); }} onDiscardAndLeave={() => { deleteReplyDraft(letter.id, currentUserId); navigateTo("/home"); }} />}</FocusShell>;
}

function ensureReplyReviewTestLetter(userId: string) {
  const id = "reply-review-test";
  const now = new Date().toISOString();
  const existing = getLetterById(id);
  const letter: Letter = {
    id,
    senderId: "reply-review-test-sender",
    anonymousName: "별빛을닮은고요한새벽",
    content: "오늘은 마음이 조금 무거웠어요.\n누군가에게 조용히 이 이야기를 건네고 싶었어요.",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    status: "waiting_for_reply",
    assignedReaderId: userId,
    assignedAt: existing?.assignedAt ?? now,
    waitingForReplyAt: now,
    retryCount: 0,
    isPrototypeFixture: true,
    prototypeScenario: "reply-review-test",
    safetyStatus: "clear",
    moderationStatus: "not_required",
    statusHistory: [{ status: "waiting_for_reader", changedAt: existing?.createdAt ?? now }, { status: "assigned", changedAt: existing?.assignedAt ?? now }, { status: "waiting_for_reply", changedAt: now }],
    lastStatusChangedAt: now,
  };
  saveLetter(letter);
  updateReplyDraft(id, userId, { content: "읽으며 마음이 많이 쓰였어요.\n오늘은 스스로에게도 조금 다정한 시간을 내어주세요.", stage: "review", letterStatusAtSave: "waiting_for_reply" });
}

export function ReplyReviewScreen({ letterId }: { letterId?: string }) {
  const currentUserId = getCurrentUserId();
  if (letterId === "reply-review-test") ensureReplyReviewTestLetter(currentUserId);
  if (letterId?.startsWith("sample-waiting-letter-")) seedSampleLetters();
  const forcedTestLetter = letterId?.startsWith("waiting-inline-test-") ? forceReplyTestAssignment(letterId, currentUserId) : undefined;
  if (forcedTestLetter) ensureForcedReplyTestDraft(forcedTestLetter.id, currentUserId);
  let letter = forcedTestLetter ?? (letterId ? getLetterById(letterId) : undefined);
  if (letterId === "sample-waiting-letter-one" && (!letter || letter.assignedReaderId !== currentUserId || !["assigned", "read", "waiting_for_reply"].includes(letter.status))) {
    const now = new Date().toISOString();
    letter = saveLetter({
      id: "sample-waiting-letter-one",
      senderId: letter?.senderId ?? "sample-sender-dawn",
      anonymousName: letter?.anonymousName ?? "새벽의 편지",
      content: letter?.content ?? "요즘은 누구에게도 쉽게 말하지 못한 마음이 있어요. 그냥 누군가가 끝까지 읽어준다면 조금 괜찮아질 것 같아요.",
      createdAt: letter?.createdAt ?? now,
      updatedAt: now,
      retryCount: letter?.retryCount ?? 0,
      ...letter,
      status: "waiting_for_reply",
      assignedReaderId: currentUserId,
      assignedAt: now,
      waitingForReplyAt: now,
      lastStatusChangedAt: now,
    });
  }
  const draft = letterId ? getReplyDraft(letterId, currentUserId) : undefined;
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  if (letter && getLetterReturn(letter.id, currentUserId)) return <FocusShell title="보내기 전 점검" fallback="/home"><section className="flow-message"><h1>{RETURNED_LETTER_TITLE}</h1><p>{RETURNED_LETTER_BODY}</p><button className="flow-primary-button" type="button" onClick={() => navigateTo(getListenEntryPath(getCurrentUserId()))}>다른 편지 만나기</button></section></FocusShell>;
  if (!letter || !draft?.content.trim() || letter.assignedReaderId !== currentUserId || !["assigned", "read", "waiting_for_reply"].includes(letter.status)) return <MissingLetterScreen fallback="/home" />;
  if (draft.stage !== "review") updateReplyDraft(letter.id, currentUserId, { stage: "review", letterStatusAtSave: letter.status });
  const review = reviewReplySafety(draft.content, draft.id);
  const requiresRevision = review.status !== "clear";
  function submit() {
    if (submitting) return;
    if (shouldFailDraftOperation("reply-submit")) { recordDeliveryIssue("reply-send", letter.id, currentUserId); setNotice("답장을 보내지 못했어요. 작성한 내용은 그대로 보관되어 있어요."); return; }
    navigateTo(`/reply-sending/${encodeURIComponent(letter.id)}`);
  }
  return <FocusShell title="답장 미리보기" fallback={`/write-reply/${letter.id}`} className="reply-review-screen" action={<div className="flow-fixed-action flow-fixed-action--split reply-review-fixed-action"><button type="button" className="flow-secondary-button" onClick={() => { updateReplyDraft(letter.id, currentUserId, { stage: "writing", letterStatusAtSave: letter.status }); navigateTo(`/write-reply/${encodeURIComponent(letter.id)}`); }}>수정하기</button><button type="button" className="flow-primary-button" onClick={submit} disabled={submitting || requiresRevision}>답장 보내기</button></div>}><section className="flow-review"><h1><strong>답장</strong>을 보내기 전에<br />살펴봐주세요</h1><p className="reply-review-intro">서두르지 않아도 괜찮아요.</p><img className="reply-review-header-illustration" src="/assets/reply-review-open-letter-glasses.png" alt="" aria-hidden="true" /><article className="flow-letter-paper reply-review-paper">{requiresRevision && <PreviewSafetyWarning />}<p className="reply-compose-recipient">{letter.anonymousName}님에게</p><blockquote>{requiresRevision ? <HighlightedPreviewContent content={draft.content} matches={review.matches} /> : draft.content}</blockquote><small className="reply-review-edited-at">{formatDateWithYear(draft.updatedAt)}에 마지막으로 다듬었어요.</small></article><section className="reply-review-guidance" aria-label="보내기 전 점검"><h2>보내기 전, 잠시 살펴봐주세요</h2><ul className="review-list"><li>보내고 나면 내용을 고칠 수 없어요.</li><li>부적절하거나 불법적인 내용은 없나요?</li><li>개인정보나 연락처를 적지 않았나요?</li><li>상대를 판단하거나 비난하지 않았나요?</li></ul></section><p className="flow-notice" role="status">{notice}</p></section></FocusShell>;
}

export function ReplySentScreen({ letterId }: { letterId?: string }) {
  const letter = letterId ? getLetterById(letterId) : undefined;
  const isCompletionPreview = getCurrentAppSearchParams().get("preview") === "complete";
  if (!letter?.reply && !isCompletionPreview) return <MissingLetterScreen fallback="/mailbox" />;
  return <FocusShell title="답장 완료" fallback="/home" hideBack><section className="flow-complete"><img src="/assets/reply-sent-lavender-envelope.png" alt="봉인된 편지 봉투" /><h1>따뜻한 마음을 전했어요</h1><p>당신의 한 통이 그 사람의 편지함에<br />도착할거예요.</p><div><button className="flow-primary-button" type="button" onClick={() => navigateTo("/mailbox")}>편지함 가기</button><button className="flow-text-button" type="button" onClick={() => navigateTo("/home")}>홈으로 돌아가기</button></div></section></FocusShell>;
}

export function ReplySendingTransitionScreen({ letterId }: { letterId?: string }) {
  const currentUserId = getCurrentUserId();
  const isLoadingPreview = getCurrentAppSearchParams().get("preview") === "loading";
  const forcedTestLetter = !isLoadingPreview && letterId?.startsWith("waiting-inline-test-") ? forceReplyTestAssignment(letterId, currentUserId) : undefined;
  if (forcedTestLetter) ensureForcedReplyTestDraft(forcedTestLetter.id, currentUserId);
  /* 보내는 중과 실패는 성격이 다른 화면이라 나눠 둔다.
     예전에는 로딩 화면의 문구만 갈아끼웠는데, 그러면 점 물결은 계속 돌아
     '진행 중'이라 말하면서 글은 '실패했다'고 하는 모순이 생겼다.
     게다가 다시 시도할 버튼이 없어 헤더의 ← 말고는 빠져나갈 길이 없었다. */
  const [phase, setPhase] = useState<"sending" | "failed">("sending");
  // 다시 보내기를 누르면 이 값을 올려 아래 effect 를 처음부터 다시 돌린다.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!letterId || isLoadingPreview) return;
    const timer = window.setTimeout(() => {
      const letter = getLetterById(letterId);
      const draft = getReplyDraft(letterId, currentUserId);
      if (!letter || !draft?.content.trim()) { navigateTo(`/write-reply/${encodeURIComponent(letterId)}`); return; }
      const review = reviewReplySafety(draft.content, draft.id);
      if (!canSubmitReply(review)) {
        if (review.status === "high_risk") navigateTo("/urgent-support");
        else navigateTo(`/write-reply/${encodeURIComponent(letterId)}`);
        return;
      }
      const result = sendReply(letterId, currentUserId, draft.content);
      if (!result.ok) { setPhase("failed"); return; }
      resolveDeliveryIssues("reply-send", letterId, currentUserId);
      clearReplyDraft(letterId, currentUserId);
      navigateTo(`/reply-sent/${encodeURIComponent(letterId)}`);
      // 편지 로딩·계정 삭제와 같은 1700ms. 점 물결(720ms 주기 + 셋째 점 240ms 지연)이
      // 두 번 완성되는 길이라 애니메이션이 잘리지 않는다.
    }, 1700);
    return () => window.clearTimeout(timer);
  }, [currentUserId, isLoadingPreview, letterId, attempt]);

  const retry = () => { setPhase("sending"); setAttempt((value) => value + 1); };

  return <main className="mobile-prototype listen-entry-screen reply-sending-transition">{/* 뒤로가기는 쓰던 답장으로 돌아간다. 예전에는 편지 id 없이 "/write-reply" 였는데,
        그 경로는 시안 확인용 표본 편지를 띄우는 자리라 내가 쓰던 답장이 아니라
        엉뚱한 편지가 열렸다. id 가 없는 경우에만 편지함으로 보낸다. */}
    <header className="flow-header listen-entry-topbar">{phase === "sending" ? <span aria-hidden="true" /> : <button type="button" onClick={() => navigateBack(letterId ? `/write-reply/${encodeURIComponent(letterId)}` : "/mailbox")} aria-label="이전으로 돌아가기"><span aria-hidden="true">←</span></button>}<strong>답장 보내기</strong><span aria-hidden="true" /></header><div className="listen-entry-scroll">{phase === "failed"
    ? <section className="flow-message" role="alert"><h1>답장을 보내지 못했어요</h1><p>잠시 후 다시 시도해주세요.</p><button className="flow-primary-button" type="button" onClick={retry}>다시 보내기</button></section>
    : <ListenEntryLoadingState message="답장을 보내고 있어요" />}</div></main>;
}

type JourneyStep = "sent" | "waiting" | "assigned" | "reply_writing" | "reply_arrived" | "reply_opened";
const journeySteps: ReadonlyArray<{ key: JourneyStep; title: string; description: string }> = [
  { key: "sent", title: "편지를 보냈어요", description: "편지를 조심스럽게 전달했어요." },
  { key: "waiting", title: "편지가 마음을 전해줄 사람을 기다리고 있어요", description: "답장을 전해줄 사람을 천천히 기다리고 있어요." },
  { key: "assigned", title: "한 사람이 편지를 맡았어요", description: "한 사람이 이 편지에 답장을 전하기로 했어요." },
  { key: "reply_writing", title: "답장을 준비하고 있어요", description: "어떤 말을 건넬지 천천히 생각하고 있어요." },
  { key: "reply_arrived", title: "답장이 도착했어요", description: "당신의 이야기를 읽은 사람이 답장을 남겼어요." },
  { key: "reply_opened", title: "답장을 읽었어요", description: "도착한 답장을 열어보았어요." },
];

function journeyState(letter: Letter): JourneyStep {
  if (letter.replyOpenedAt) return "reply_opened";
  if (letter.reply || letter.status === "replied") return "reply_arrived";
  if (letter.status === "waiting_for_reply") return "reply_writing";
  if (letter.assignedReaderId || letter.status === "assigned") return "assigned";
  return "waiting";
}

function isJourneyStepReached(letter: Letter, step: JourneyStep) { return journeySteps.findIndex((item) => item.key === step) <= journeySteps.findIndex((item) => item.key === journeyState(letter)); }
function journeyDate(letter: Letter, step: JourneyStep) {
  if (step === "sent") return letter.createdAt;
  if (step === "assigned") return letter.assignedAt;
  if (step === "reply_writing") return letter.waitingForReplyAt ?? letter.assignedAt;
  if (step === "reply_arrived") return letter.repliedAt;
  if (step === "reply_opened") return letter.replyOpenedAt;
  return letter.lastRedistributedAt ?? letter.lastStatusChangedAt;
}

export function LetterJourneyScreen({ letterId }: { letterId?: string }) {
  const letter = letterId ? getLetterById(letterId) : undefined;
  if (!letter || letter.senderId !== getCurrentUserId()) return <MissingLetterScreen fallback="/home" />;
  const currentState = journeyState(letter);
  return <FocusShell title="편지의 여정" fallback="/home"><section className="journey-screen"><h1>편지의 여정</h1><p>{letter.status === "waiting_for_reader" && letter.lastReturnedAt ? "편지가 다시 천천히 답장을 기다리고 있어요." : getLetterStatusDescription(letter)}</p>{letter.status === "withdrawn" ? <section className="journey-withdrawn"><strong>이 편지는 조용히 거두었어요</strong>{letter.withdrawnAt && <small>{formatDate(letter.withdrawnAt)}</small>}</section> : <ol className="journey-timeline">{journeySteps.map((step) => { const reached = isJourneyStepReached(letter, step.key); const current = step.key === currentState; const changedAt = journeyDate(letter, step.key); return <li key={step.key} className={reached ? (current ? "is-current" : "is-complete") : ""}><span aria-hidden="true" /><div><strong>{step.title}</strong><p>{step.description}</p>{reached && changedAt && <time dateTime={changedAt}>{formatDate(changedAt)}</time>}</div></li>; })}</ol>}<JourneyActions letter={letter} /></section></FocusShell>;
}

function JourneyActions({ letter }: { letter: Letter }) {
  if (letter.status === "replied") return <div className="journey-actions"><button className="flow-primary-button" type="button" onClick={() => navigateTo(`/reply-arrived/${encodeURIComponent(letter.id)}`)}>답장 열어보기</button></div>;
  if (letter.status === "withdrawn") return <div className="journey-actions"><button className="flow-primary-button" type="button" onClick={() => navigateTo(`/mailbox/my/${encodeURIComponent(letter.id)}`)}>편지함에서 보기</button></div>;
  return <div className="journey-actions"><button className="flow-primary-button" type="button" onClick={() => navigateTo("/home")}>홈으로 돌아가기</button></div>;
}

export function ReplyArrivedScreen({ letterId }: { letterId?: string }) {
  const letter = letterId ? getLetterById(letterId) : undefined;
  if (!letter?.reply || letter.senderId !== getCurrentUserId()) return <MissingLetterScreen fallback="/home" />;
  function openReply() { markReplyOpened(letter.id, letter.senderId); navigateTo(`/mailbox/my/${encodeURIComponent(letter.id)}?reply=1`); }
  return <FocusShell title="답장 도착" fallback="/home"><section className="flow-complete reply-arrived"><img src="/assets/reply-sent-lavender-envelope.png" alt="도착한 편지 봉투" /><h1>답장이 도착했어요</h1><p>당신의 이야기를 읽은 사람이 마음을 전했어요.</p><div><button className="flow-primary-button" type="button" onClick={openReply}>답장 열어보기</button><button className="flow-text-button" type="button" onClick={() => navigateTo("/home")}>나중에 읽기</button></div></section></FocusShell>;
}

export function LetterWithdrawnScreen({ letterId }: { letterId?: string }) {
  const letter = letterId ? getLetterById(letterId) : undefined;
  if (!letter || letter.senderId !== getCurrentUserId() || letter.status !== "withdrawn") return <MissingLetterScreen fallback="/home" />;
  return <FocusShell title="편지 거두기" fallback="/home"><section className="flow-complete"><h1>편지를 조용히 거두었어요</h1><p>이 편지는 더 이상 새로운 사람에게 보이지 않아요.</p><div><button className="flow-primary-button" type="button" onClick={() => navigateTo(`/mailbox/my/${encodeURIComponent(letter.id)}`)}>편지함에 보관하기</button><button className="flow-text-button" type="button" onClick={() => navigateTo("/home")}>홈으로 돌아가기</button></div></section></FocusShell>;
}

export function MyLetterDetailScreen({ letterId }: { letterId?: string }) {
  const letter = letterId ? getLetterById(letterId) : undefined;
  if (!letter || letter.senderId !== getCurrentUserId()) return <MissingLetterScreen />;
  const userId = getCurrentUserId(); const params = getCurrentAppSearchParams(); const showReply = params.get("reply") === "1" || Boolean(params.get("excerpt")); const replyHidden = Boolean(letter.reply && isContentHidden(userId, "reply", letter.reply.id)); const replyBlocked = Boolean(letter.reply && isUserBlocked(userId, letter.reply.writerId)); const focusExcerptId = params.get("excerpt") ?? undefined; const display = getSentLetterDisplayStatus(letter, userId);
  if (display.isDeleted) return <FocusShell title="내가 보낸 편지" fallback="/mailbox"><section className="flow-message"><h1>이 편지를 찾을 수 없어요</h1><p>지워졌거나, 더는 열어볼 수 없는 편지예요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo("/mailbox")}>편지함 가기</button></section></FocusShell>;
  // 답장이 도착한 편지 — 설계된 화면(내가 답한 편지의 짝)으로 보여준다.
  // 예전에는 옛 레이아웃(상태 표 + '받은 답장 보기' 버튼)으로 빠졌고,
  // 설계본은 /mailbox-my-replied-demo 에 내용이 박힌 데모로만 있었다.
  // 안 읽은 답장도 봉투 화면(/reply-arrived)을 거치지 않고 바로 여기서 보여준다.
  // 차단·숨김은 예전 분기(아래 옛 레이아웃)가 그대로 처리하도록 여기서 제외한다.
  if (letter.reply && !replyBlocked && !replyHidden && !display.isRestricted && letter.status !== "withdrawn") {
    // 목록의 '안 읽음' 표시를 지운다. 이 화면에서 답장을 실제로 보여주기 때문이다.
    markReplyOpened(letter.id, letter.senderId);
    return <FocusShell title="내가 보낸 편지" fallback="/mailbox" className="my-letter-waiting-screen" scrollClassName="my-letter-waiting-scroll"><section className="my-letter-waiting" aria-label="내가 보낸 편지 공간"><header className="my-letter-waiting-heading"><h1>내 마음에<br /><strong>답장</strong>이 도착했어요</h1><img src="/assets/reply-sent-lavender-envelope.png" alt="보라색 봉인과 라벤더가 놓인 편지 봉투" /></header><article className="my-letter-waiting-paper"><header className="my-letter-waiting-paper-heading"><span>내가 보낸 편지</span><time dateTime={letter.createdAt}>{formatDateWithYear(letter.createdAt)}</time></header><span className="my-letter-waiting-quote my-letter-waiting-quote--open" aria-hidden="true">“</span><blockquote>{letter.content}</blockquote><span className="my-letter-waiting-quote my-letter-waiting-quote--close" aria-hidden="true">”</span><p>— {letter.anonymousName || "이름 없는 편지"}</p></article><div className="my-letter-reply-connector" aria-hidden="true"><span /></div><article className="my-letter-waiting-paper my-letter-reply-paper"><header className="my-letter-waiting-paper-heading"><span>받은 답장</span><time dateTime={letter.reply.createdAt}>{formatDateWithYear(letter.reply.createdAt)}</time></header><span className="my-letter-waiting-quote my-letter-waiting-quote--open" aria-hidden="true">“</span><blockquote>{letter.reply.content}</blockquote><span className="my-letter-waiting-quote my-letter-waiting-quote--close" aria-hidden="true">”</span><p>— {letter.reply.anonymousName || "익명의 누군가"}</p><div className="my-letter-reply-report"><button className="flow-text-button" type="button" onClick={() => navigateTo(`/report-reply/${encodeURIComponent(letter.id)}`)}>신고하기</button></div></article></section></FocusShell>;
  }
  if (!letter.reply && !display.isRestricted && letter.status !== "withdrawn") return <FocusShell title="내가 보낸 편지" fallback="/mailbox" className="my-letter-waiting-screen" scrollClassName="my-letter-waiting-scroll"><section className="my-letter-waiting" aria-label="내가 보낸 편지 공간"><header className="my-letter-waiting-heading"><h1><strong>답장</strong>을<br />기다리고 있어요</h1><img src="/assets/reply-sent-lavender-envelope.png" alt="보라색 봉인과 라벤더가 놓인 편지 봉투" /></header><article className="my-letter-waiting-paper"><header className="my-letter-waiting-paper-heading"><span>내가 보낸 편지</span><time dateTime={letter.createdAt}>{formatDateWithYear(letter.createdAt)}</time></header><span className="my-letter-waiting-quote my-letter-waiting-quote--open" aria-hidden="true">“</span><blockquote>{letter.content}</blockquote><span className="my-letter-waiting-quote my-letter-waiting-quote--close" aria-hidden="true">”</span><p>— {letter.anonymousName || "이름 없는 편지"}</p></article></section></FocusShell>;
  return <FocusShell title="내가 보낸 편지" fallback="/mailbox"><section className="letter-detail"><p className="detail-kicker">내가 보낸 편지</p><article className="flow-letter-paper"><blockquote>{letter.content}</blockquote></article><section className="detail-status-card"><strong>{display.label}</strong><p>{display.description}</p></section><dl><div><dt>현재 상태</dt><dd>{display.label}</dd></div><div><dt>보낸 날짜</dt><dd>{formatDate(letter.createdAt)}</dd></div>{letter.reply && <div><dt>답장 도착 날짜</dt><dd>{letter.repliedAt ? formatDate(letter.repliedAt) : "답장을 받았어요"}</dd></div>}</dl>{letter.reply ? (showReply ? <section className="detail-reply"><p>받은 답장 <button className="reply-more-button" type="button" onClick={() => navigateTo(`/report-reply/${encodeURIComponent(letter.id)}`)}>⋯</button></p>{replyBlocked ? <div className="content-restricted"><strong>차단한 사용자의 콘텐츠예요.</strong><span>안전을 위해 이 내용은 기본적으로 숨겨져 있어요.</span><button type="button" onClick={() => navigateTo("/safety-management")}>안전 관리에서 확인</button></div> : replyHidden ? <div className="content-restricted"><strong>숨긴 답장이에요.</strong><span>필요하면 다시 펼쳐볼 수 있어요.</span><button type="button" onClick={() => { revealContent(userId, "reply", letter.reply!.id); window.location.reload(); }}>답장 다시 보기</button><button type="button" onClick={() => navigateTo("/mailbox")}>편지함으로 돌아가기</button></div> : <><SealedReply letterId={letter.id} replyId={letter.reply.id} ownerId={userId} content={letter.reply.content} focusExcerptId={focusExcerptId} /><small>익명의 누군가 · {formatDate(letter.reply.createdAt)}</small><button className="detail-gratitude-button" type="button" onClick={() => navigateTo(`/gratitude/${encodeURIComponent(letter.id)}`)}>고마움 전하기</button></>}</section> : <section className="detail-reply-arrival"><strong>{display.hasUnreadReply ? "답장이 도착했어요." : "답장을 받았어요."}</strong><p>{display.hasUnreadReply ? "당신의 편지를 읽은 사람이 마음을 전했어요." : "도착한 답장을 다시 읽을 수 있어요."}</p><button className="flow-primary-button" type="button" onClick={() => navigateTo(display.hasUnreadReply ? `/reply-arrived/${encodeURIComponent(letter.id)}` : `/mailbox/my/${encodeURIComponent(letter.id)}?reply=1`)}>{display.hasUnreadReply ? "답장 읽기" : "받은 답장 보기"}</button></section>) : display.isRestricted ? <p className="detail-waiting">현재 이 편지의 내용을 확인할 수 없어요.</p> : letter.status === "withdrawn" ? <p className="detail-waiting">이 편지는 조용히 거두었어요</p> : <><p className="detail-waiting">{display.description}</p></>}</section></FocusShell>;
}

export function MyLetterRepliedDemoScreen() {
  return <FocusShell title="내가 보낸 편지" fallback="/mailbox" className="my-letter-waiting-screen" scrollClassName="my-letter-waiting-scroll"><section className="my-letter-waiting" aria-label="내가 보낸 편지 공간"><header className="my-letter-waiting-heading"><h1>내 마음에<br /><strong>답장</strong>이 도착했어요</h1><img src="/assets/reply-sent-lavender-envelope.png" alt="보라색 봉인과 라벤더가 놓인 편지 봉투" /></header><article className="my-letter-waiting-paper"><header className="my-letter-waiting-paper-heading"><span>내가 보낸 편지</span><time dateTime="2026-08-25T14:38:00+09:00">{formatDateWithYear("2026-08-25T14:38:00+09:00")}</time></header><span className="my-letter-waiting-quote my-letter-waiting-quote--open" aria-hidden="true">“</span><blockquote>요즘 자꾸 잠들기 전에 예전 생각이 나요. 괜찮다고 되뇌어도 마음 한켠이 계속 무거워서, 누군가에게 이 마음을 조용히 털어놓고 싶었어요. 읽어주셔서 고마워요.</blockquote><span className="my-letter-waiting-quote my-letter-waiting-quote--close" aria-hidden="true">”</span><p>— 조용한 별빛</p></article><div className="my-letter-reply-connector" aria-hidden="true"><span /></div><article className="my-letter-waiting-paper my-letter-reply-paper"><header className="my-letter-waiting-paper-heading"><span>받은 답장</span><time dateTime="2026-08-26T15:53:00+09:00">{formatDateWithYear("2026-08-26T15:53:00+09:00")}</time></header><span className="my-letter-waiting-quote my-letter-waiting-quote--open" aria-hidden="true">“</span><blockquote>이야기를 들려주셔서 고마워요. 무거운 마음을 안고도 이렇게 편지를 써주셔서, 그 마음이 저에게도 잘 전해졌어요. 오늘 밤은 조금 더 편안하시길 바라요.</blockquote><span className="my-letter-waiting-quote my-letter-waiting-quote--close" aria-hidden="true">”</span><p>— 달빛산책</p><div className="my-letter-reply-report"><button className="flow-text-button" type="button">신고하기</button></div></article></section></FocusShell>;
}

export function MyLetterWaitingDemoScreen() {
  return <FocusShell title="내가 보낸 편지" fallback="/mailbox?preview=content" className="my-letter-waiting-screen" scrollClassName="my-letter-waiting-scroll"><section className="my-letter-waiting" aria-label="답장을 기다리는 내가 보낸 편지"><header className="my-letter-waiting-heading"><h1><strong>답장</strong>을<br />기다리고 있어요</h1><img src="/assets/reply-sent-lavender-envelope.png" alt="보라색 봉인과 라벤더가 놓인 편지 봉투" /></header><article className="my-letter-waiting-paper"><header className="my-letter-waiting-paper-heading"><span>내가 보낸 편지</span><time dateTime="2026-08-25T09:00:00.000Z">{formatDateWithYear("2026-08-25T09:00:00.000Z")}</time></header><span className="my-letter-waiting-quote my-letter-waiting-quote--open" aria-hidden="true">“</span><blockquote>며칠째 같은 생각이 맴돌아 편지를 남깁니다. 괜찮은 척 지내왔지만, 오늘은 누군가에게 이 마음을 조용히 건네고 싶었어요.</blockquote><span className="my-letter-waiting-quote my-letter-waiting-quote--close" aria-hidden="true">”</span><p>— 마음의 온기를 나누는 한 사람</p></article></section></FocusShell>;
}

export function RepliedLetterDemoScreen() {
  return <FocusShell title="내가 답한 편지" fallback="/mailbox?preview=content" className="my-letter-waiting-screen my-letter-replied-demo-screen" scrollClassName="my-letter-waiting-scroll"><section className="my-letter-waiting replied-letter-detail" aria-label="내가 답한 편지"><header className="my-letter-waiting-heading"><h1>마음을 담아<br /><strong>답장</strong>을 전했어요</h1><img src="/assets/reply-sent-paper-airplane.png" alt="날아가는 종이비행기" /></header><article className="my-letter-waiting-paper"><header className="my-letter-waiting-paper-heading"><span>상대가 보낸 편지</span><time dateTime="2026-08-23T09:10:00.000Z">{formatDateWithYear("2026-08-23T09:10:00.000Z")}</time></header><span className="my-letter-waiting-quote my-letter-waiting-quote--open" aria-hidden="true">“</span><blockquote>오늘은 조금 천천히 걷고 싶어요. 누군가와 이 마음을 나누면 조금 가벼워질 것 같아 편지를 남깁니다.</blockquote><span className="my-letter-waiting-quote my-letter-waiting-quote--close" aria-hidden="true">”</span><p>— 노을산책</p></article><div className="my-letter-reply-connector" aria-hidden="true"><span /></div><article className="my-letter-waiting-paper my-letter-reply-paper"><header className="my-letter-waiting-paper-heading"><span>내가 보낸 답장</span><time dateTime="2026-08-23T16:20:00.000Z">{formatDateWithYear("2026-08-23T16:20:00.000Z")}</time></header><span className="my-letter-waiting-quote my-letter-waiting-quote--open" aria-hidden="true">“</span><blockquote>당신의 이야기를 천천히 읽었어요. 오늘은 마음이 조금 가벼워지는 시간이 되기를 바라요.</blockquote><span className="my-letter-waiting-quote my-letter-waiting-quote--close" aria-hidden="true">”</span><p>— 다정한 오후</p></article></section></FocusShell>;
}

export function RepliedLetterDetailScreen({ letterId }: { letterId?: string }) {
  const letter = letterId ? getLetterById(letterId) : undefined;
  if (!letter?.reply || letter.reply.writerId !== getCurrentUserId()) return <MissingLetterScreen />;
  return <FocusShell title="내가 답한 편지" fallback="/mailbox" className="my-letter-waiting-screen my-letter-replied-demo-screen" scrollClassName="my-letter-waiting-scroll"><section className="my-letter-waiting replied-letter-detail" aria-label="내가 답한 편지"><header className="my-letter-waiting-heading"><h1>마음을 담아<br /><strong>답장</strong>을 전했어요</h1><img src="/assets/reply-sent-paper-airplane.png" alt="날아가는 종이비행기" /></header><article className="my-letter-waiting-paper"><header className="my-letter-waiting-paper-heading"><span>상대가 보낸 편지</span><time dateTime={letter.createdAt}>{formatDateWithYear(letter.createdAt)}</time></header><span className="my-letter-waiting-quote my-letter-waiting-quote--open" aria-hidden="true">“</span><blockquote>{letter.content}</blockquote><span className="my-letter-waiting-quote my-letter-waiting-quote--close" aria-hidden="true">”</span><p>— {letter.anonymousName || "이름 없는 편지"}</p></article><div className="my-letter-reply-connector" aria-hidden="true"><span /></div><article className="my-letter-waiting-paper my-letter-reply-paper"><header className="my-letter-waiting-paper-heading"><span>내가 보낸 답장</span><time dateTime={letter.reply.createdAt}>{formatDateWithYear(letter.reply.createdAt)}</time></header><span className="my-letter-waiting-quote my-letter-waiting-quote--open" aria-hidden="true">“</span><blockquote>{letter.reply.content}</blockquote><span className="my-letter-waiting-quote my-letter-waiting-quote--close" aria-hidden="true">”</span><p>— {letter.reply.anonymousName || "이름 없는 편지"}</p></article></section></FocusShell>;
}

function getLettersForReading(userId: string) {
  seedSampleLetters();
  return getLetters().filter((letter) => letter.status === "waiting_for_reader" && letter.safetyStatus !== "high_risk" && letter.safetyStatus !== "needs_revision" && letter.safetyStatus !== "under_review" && letter.safetyStatus !== "blocked" && [undefined, "clear"].includes(letter.safetyStatus) && [undefined, "not_required", "approved"].includes(letter.moderationStatus) && !letter.assignedReaderId && letter.senderId !== userId && !isUserBlocked(userId, letter.senderId) && !isUserBlocked(letter.senderId, userId) && !isContentHidden(userId, "letter", letter.id) && !getReportForTarget(userId, "letter", letter.id));
}
