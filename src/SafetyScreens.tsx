import { useState } from "react";
import { createLetter, getCurrentUserId, getLetterById, sendReply } from "./letters";
import { clearLetterDraft, clearReplyDraft, getLetterDraft, getReplyDraft, updateLetterDraft } from "./letterDraft";
import { canSubmitLetter, reviewLetterSafety, reviewReplySafety } from "./safety";
import { navigateBack, navigateTo } from "./navigation";
import { getLetterReturn } from "./letterReturns";
import { resolveDeliveryIssues } from "./deliveryIssues";
import { RETURNED_LETTER_BODY, RETURNED_LETTER_TITLE } from "./copy";
import { getListenEntryPath } from "./waitingLetters";

function Shell({ title, children, fallback = "/home", action }: { title: string; children: React.ReactNode; fallback?: string; action?: React.ReactNode }) {
  return <main className="mobile-prototype letter-flow-screen"><header className="flow-header"><button type="button" onClick={() => navigateBack(fallback)} aria-label="이전으로 돌아가기">←</button><strong>{title}</strong><span /></header><div className="letter-flow-scroll">{children}</div>{action}</main>;
}

function ReviewNotice({ content, matches, target }: { content: string; matches: ReturnType<typeof reviewLetterSafety>["matches"]; target: "편지" | "답장" }) {
  return <section className="safety-review">
    <p className="safety-review-kicker">안전 검토</p>
    <h1>{target}를 전하기 전에<br />조금만 다듬어볼까요?</h1>
    <p>누군가를 알아볼 수 있는 정보나 직접 연결을 요청하는 표현이 있어요. 내용은 이 기기에 그대로 보관되어 있어요.</p>
    <article className="flow-letter-paper"><blockquote>{content}</blockquote></article>
    <ul>{matches.map((match, index) => <li key={`${match.category}-${index}`}><strong>{match.matchedText ?? "확인이 필요한 표현"}</strong><span>{match.message}</span></li>)}</ul>
  </section>;
}

export function LetterSafetyReviewScreen() {
  const userId = getCurrentUserId();
  const draft = getLetterDraft(userId);
  const [error, setError] = useState("");
  if (!draft?.content.trim()) return <Shell title="편지 안전 검토" fallback="/write-letter"><section className="flow-message"><h1>검토할 편지가 없어요</h1><p>편지를 작성한 뒤 다시 확인해주세요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo("/write-letter")}>편지 쓰기</button></section></Shell>;
  const review = reviewLetterSafety(draft.content, draft.id);

  function send() {
    const latest = getLetterDraft(userId);
    if (!latest?.content.trim()) return;
    const latestReview = reviewLetterSafety(latest.content, latest.id);
    updateLetterDraft(userId, { lastSafetyReviewId: latestReview.id, lastSafetyStatus: latestReview.status, lastSafetyCheckedAt: latestReview.checkedAt });
    if (!canSubmitLetter(latestReview)) { navigateTo(latestReview.status === "high_risk" ? "/urgent-support" : "/letter-safety-review"); return; }
    const letter = createLetter({ senderId: userId, anonymousName: latest.anonymousName, content: latest.content, sourceDraftId: latest.id });
    if (!getLetterById(letter.id)) { setError("편지를 보내지 못했어요. 작성한 내용은 그대로 보관되어 있어요."); return; }
    resolveDeliveryIssues("letter-send", undefined, userId);
    clearLetterDraft();
    navigateTo(`/letter-sent?id=${encodeURIComponent(letter.id)}`);
  }

  if (review.status === "high_risk") return <UrgentSupportScreen kind="letter" returnTo="/write-letter" />;
  if (review.status === "needs_revision") return <Shell title="편지 안전 검토" fallback="/letter-preview" action={<div className="flow-fixed-action flow-fixed-action--split"><button className="flow-secondary-button" type="button" onClick={() => navigateTo("/letter-preview")}>미리보기로</button><button className="flow-primary-button" type="button" onClick={() => navigateTo("/write-letter")}>내용 수정하기</button></div>}><ReviewNotice content={draft.content} matches={review.matches} target="편지" /></Shell>;
  return <Shell title="편지 안전 검토" fallback="/letter-preview" action={<div className="flow-fixed-action flow-fixed-action--split"><button className="flow-secondary-button" type="button" onClick={() => navigateTo("/write-letter")}>수정하기</button><button className="flow-primary-button" type="button" onClick={send}>편지 보내기</button></div>}><section className="flow-message"><h1>편지를 안전하게<br />전할 수 있어요</h1><p>보내기 전에 내용을 한 번 더 살펴봤어요.</p><p className="flow-notice" role="status">{error}</p></section></Shell>;
}

export function ReplySafetyReviewScreen({ letterId }: { letterId?: string }) {
  const userId = getCurrentUserId(); const letter = letterId ? getLetterById(letterId) : undefined; const draft = letterId ? getReplyDraft(letterId, userId) : undefined; const [error, setError] = useState("");
  if (letter && getLetterReturn(letter.id, userId)) return <Shell title="답장 안전 검토" fallback="/home"><section className="flow-message"><h1>{RETURNED_LETTER_TITLE}</h1><p>{RETURNED_LETTER_BODY}</p><button className="flow-primary-button" type="button" onClick={() => navigateTo(getListenEntryPath(getCurrentUserId()))}>다른 편지 만나기</button></section></Shell>;
  if (!letter || !draft?.content.trim()) return <Shell title="답장 안전 검토" fallback="/mailbox"><section className="flow-message"><h1>검토할 답장이 없어요</h1><p>답장을 작성한 뒤 다시 확인해주세요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo("/mailbox")}>편지함으로</button></section></Shell>;
  const review = reviewReplySafety(draft.content, draft.id);
  function send() { const latest = getReplyDraft(letter.id, userId); const current = getLetterById(letter.id); if (!latest?.content.trim() || !current) return; const latestReview = reviewReplySafety(latest.content, latest.id); if (!canSubmitLetter(latestReview)) { navigateTo(latestReview.status === "high_risk" ? "/urgent-support" : `/reply-safety-review/${encodeURIComponent(letter.id)}`); return; } const result = sendReply(letter.id, userId, latest.content); if (!result.ok) { setError("답장을 보내지 못했어요. 작성한 내용은 그대로 보관되어 있어요."); return; } resolveDeliveryIssues("reply-send", letter.id, userId); clearReplyDraft(letter.id, userId); navigateTo(`/reply-sent/${encodeURIComponent(letter.id)}`); }
  if (review.status === "high_risk") return <UrgentSupportScreen kind="reply" returnTo={`/write-reply/${letter.id}`} />;
  if (review.status === "needs_revision") return <Shell title="답장 안전 검토" fallback={`/reply-review/${letter.id}`} action={<div className="flow-fixed-action flow-fixed-action--split"><button className="flow-secondary-button" type="button" onClick={() => navigateTo(`/reply-review/${letter.id}`)}>미리보기로</button><button className="flow-primary-button" type="button" onClick={() => navigateTo(`/write-reply/${letter.id}`)}>내용 수정하기</button></div>}><ReviewNotice content={draft.content} matches={review.matches} target="답장" /></Shell>;
  return <Shell title="답장 안전 검토" fallback={`/reply-review/${letter.id}`} action={<div className="flow-fixed-action flow-fixed-action--split"><button className="flow-secondary-button" type="button" onClick={() => navigateTo(`/write-reply/${letter.id}`)}>수정하기</button><button className="flow-primary-button" type="button" onClick={send}>답장 보내기</button></div>}><section className="flow-message"><h1>답장을 안전하게<br />전할 수 있어요</h1><p>보내기 전에 내용을 한 번 더 살펴봤어요.</p><p className="flow-notice" role="status">{error}</p></section></Shell>;
}

export function UrgentSupportScreen({ kind, returnTo }: { kind: "letter" | "reply"; returnTo: string }) { return <Shell title="지금 확인하기" fallback={returnTo}><section className="flow-message urgent-support"><h1>지금은 편지보다<br />빠른 도움이 먼저 필요해요</h1><p>작성한 내용에서 지금 바로 확인이 필요한 상황이 느껴져요. 혼자 감당하지 않아도 괜찮아요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo(returnTo)}>내용 다시 확인하기</button><button className="flow-secondary-button" type="button" onClick={() => navigateTo("/home")}>홈으로 돌아가기</button><small>{kind === "letter" ? "편지는 아직 보내지지 않았어요." : "답장은 아직 보내지지 않았어요."}</small></section></Shell>; }
