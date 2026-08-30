import { useEffect, useMemo, useState } from "react";
import { AppBottomNavigation } from "./AppBottomNavigation";
import { isPrototypeQaMode } from "./prototypeQa";
import { getCurrentUserId } from "./letters";
import { navigateTo } from "./navigation";
import { getLetterDraft, getReplyDraftsByWriter } from "./letterDraft";
import { getMockAuthSnapshot } from "./mockAuth";
import { seedNotificationTestState } from "./notifications";
import { getMailboxAttention } from "./mailboxAttention";

type HomeTestState = "normal" | "loading" | "error" | "partial-error";
type FloatingNotice = { id: string; title: string; description: string; action: string; onAction: () => void };
const DRAFT_SAVED_TOAST_KEY = "gonggam-letter:draft-saved-toast";
const DRAFT_SAVED_TOAST_FALLBACK_KEY = "gonggam-letter:draft-saved-toast-pending";

function consumeDraftSavedToastRequest() {
  const currentUrl = new URL(window.location.href);
  const fallback = window.localStorage.getItem(DRAFT_SAVED_TOAST_FALLBACK_KEY);
  const requested = window.sessionStorage.getItem(DRAFT_SAVED_TOAST_KEY) ?? currentUrl.searchParams.get("toast") ?? fallback;
  if (!requested) return null;

  window.sessionStorage.removeItem(DRAFT_SAVED_TOAST_KEY);
  window.localStorage.removeItem(DRAFT_SAVED_TOAST_FALLBACK_KEY);
  if (currentUrl.searchParams.has("toast")) {
    currentUrl.searchParams.delete("toast");
    window.history.replaceState({}, "", `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
  }

  return requested;
}

export function HomeScreen() {
  const [testState, setTestState] = useState<HomeTestState>("normal");
  const [noticeVersion, setNoticeVersion] = useState(0);
  const [dismissed, setDismissed] = useState<string>();
  const [draftSavedToastRequest] = useState(consumeDraftSavedToastRequest);
  const [showDraftSavedToast, setShowDraftSavedToast] = useState(() => Boolean(draftSavedToastRequest));
  const [isDraftSavedToastLeaving, setIsDraftSavedToastLeaving] = useState(false);
  const [draftSavedToastMessage] = useState(() => draftSavedToastRequest === "reply-saved" ? "작성 중인 글이 임시로 보관되었어요" : "작성 중인 편지가 임시 저장 됩니다");
  useEffect(() => {
    if (!showDraftSavedToast) return;
    const leaveTimer = window.setTimeout(() => setIsDraftSavedToastLeaving(true), 3000);
    const hideTimer = window.setTimeout(() => setShowDraftSavedToast(false), 3400);
    return () => { window.clearTimeout(leaveTimer); window.clearTimeout(hideTimer); };
  }, [showDraftSavedToast]);
  const userId = getCurrentUserId(); const account = getMockAuthSnapshot().account;
  const letterDraft = getLetterDraft(userId);
  const attention = useMemo(() => getMailboxAttention(userId, Boolean(letterDraft?.content.trim())), [userId, noticeVersion, letterDraft?.content]);
  const unreadReplies = attention.unreadReplies;
  const delayedLetters = attention.delayedLetters;
  const assignedLetter = attention.assignedLetters.find((letter) => !attention.replyDraftLetterIds.includes(letter.id));
  const replyDraft = getReplyDraftsByWriter(userId).find((item) => item.content.trim() && attention.replyDraftLetterIds.includes(item.letterId));
  const safetyNotice: FloatingNotice | undefined = attention.safetyNeedsReview ? { id: "safety-review", title: "전하기 전에 확인할 내용이 있어요.", description: "작성 중인 편지나 답장을 한 번 더 살펴봐주세요.", action: "확인하기", onAction: () => navigateTo("/write-letter") } : undefined;
  const deliveryNotice: FloatingNotice | undefined = attention.deliveryIssues.length ? { id: `delivery-${attention.deliveryIssues[0].id}`, title: "전송을 마치지 못한 편지가 있어요.", description: "작성한 내용은 이 기기에 그대로 보관되어 있어요.", action: "이어서 확인하기", onAction: () => attention.deliveryIssues[0].kind === "reply-send" && attention.deliveryIssues[0].letterId ? navigateTo(`/reply-review/${encodeURIComponent(attention.deliveryIssues[0].letterId)}`) : navigateTo("/letter-preview") } : undefined;
  const notice: FloatingNotice | undefined = safetyNotice ?? (unreadReplies.length ? (unreadReplies.length === 1 ? { id: `reply-${unreadReplies[0].id}`, title: "기다리던 답장이 도착했어요.", description: "당신의 편지를 읽은 사람이 마음을 전했어요.", action: "답장 읽기", onAction: () => navigateTo(`/mailbox/my/${encodeURIComponent(unreadReplies[0].id)}`) } : { id: "replies", title: `새로운 답장 ${unreadReplies.length}통이 도착했어요.`, description: "내가 보낸 편지에서 각각의 답장을 확인할 수 있어요.", action: "내가 보낸 편지 보기", onAction: () => navigateTo("/mailbox") }) : deliveryNotice ?? (delayedLetters.length ? (delayedLetters.length === 1 ? { id: `delay-${delayedLetters[0].id}`, title: "편지 한 통이 조금 오래 기다리고 있어요.", description: "지금의 편지 상태를 확인하고 선택해주세요.", action: "확인하기", onAction: () => navigateTo(`/letter-delay/${encodeURIComponent(delayedLetters[0].id)}`) } : { id: "delays", title: "답장을 기다리는 편지가 있어요.", description: "편지함에서 확인할 수 있어요.", action: "내가 보낸 편지 보기", onAction: () => navigateTo("/mailbox") }) : assignedLetter ? { id: `assigned-${assignedLetter.id}`, title: "맡은 편지에 답장을 전해주세요.", description: "당신의 한마디를 기다리고 있어요.", action: "답장 쓰기", onAction: () => navigateTo(`/write-reply/${encodeURIComponent(assignedLetter.id)}`) } : replyDraft ? { id: `reply-draft-${replyDraft.id}`, title: "전하지 못한 답장이 있어요.", description: "작성 중인 답장을 이어서 전할 수 있어요.", action: "이어서 답장하기", onAction: () => navigateTo(`/write-reply/${encodeURIComponent(replyDraft.letterId)}`) } : letterDraft?.content.trim() ? { id: `letter-draft-${letterDraft.id}`, title: "쓰다 만 편지가 있어요.", description: "작성 중인 내용을 이어서 적을 수 있어요.", action: "이어서 쓰기", onAction: () => navigateTo("/write-letter") } : undefined));
  const name = account?.anonymousName ?? "당신";
  const hasActionNotice = Boolean(notice && dismissed !== notice.id);
  const hasMailboxAttention = attention.reasons.length > 0;
  const qaMode = isPrototypeQaMode();
  return <main className="mobile-prototype home-screen" data-notice-version={noticeVersion}>{showDraftSavedToast && <p className={`home-draft-saved-toast${isDraftSavedToastLeaving ? " is-leaving" : ""}`} role="status" aria-live="polite" onAnimationEnd={(event) => { if (event.animationName === "home-draft-saved-toast-out") setShowDraftSavedToast(false); }}>{draftSavedToastMessage}</p>}<div className="home-scroll-region"><header className="home-heading home-heading--status"><div><p>공감편지</p><button className="home-notification-button" type="button" onClick={() => navigateTo("/notifications")} aria-label={hasMailboxAttention ? "알림, 확인이 필요한 새 소식 있음" : "알림"}><img src="/assets/notification-bell.png" alt="" aria-hidden="true" />{hasMailboxAttention && <i aria-hidden="true" />}{hasMailboxAttention && <span className="sr-only">확인이 필요한 편지함 소식이 있어요.</span>}</button></div><h1><em>{name.length > 12 ? `${name.slice(0, 12)}…` : name}</em>님,<br />오늘은 어떤 마음인가요?</h1><p className="home-heading-helper">지금 마음이 향하는 쪽을 골라주세요.</p></header>{hasActionNotice && notice && <aside className="home-notice-card" role="status"><button type="button" className="home-notice-dismiss" aria-label="소식 닫기" onClick={() => setDismissed(notice.id)}>×</button><strong>{notice.title}</strong><p>{notice.description}</p><button type="button" className="home-notice-action" onClick={notice.onAction}>{notice.action}</button></aside>}{testState === "loading" ? <section className="home-skeleton" aria-label="홈의 소식을 불러오는 중"><i /><i /><i /></section> : testState === "error" ? <section className="home-load-error"><h2>마음의 소식을 불러오지 못했어요.</h2><p>잠시 후 다시 확인해주세요.</p><button className="flow-primary-button" type="button" onClick={() => setTestState("normal")}>다시 불러오기</button></section> : <><section className="home-choices" aria-label="시작 선택"><button className="home-choice home-choice--primary" type="button" onClick={() => navigateTo("/write-letter")}><span className="home-choice-index">01</span><span className="home-choice-copy"><strong>내 마음을<br />털어놓고 싶어요</strong><span>말하지 못한 이야기를<br />익명의 편지에<br />담아보세요.</span></span><img src="/assets/direction-a-write-isolated-tight.png" alt="" aria-hidden="true" /></button><button className="home-choice home-choice--secondary" type="button" onClick={() => navigateTo("/listen-entry-a")}><span className="home-choice-index">02</span><span className="home-choice-copy"><strong>누군가의 마음을<br />들어주고 싶어요</strong><span>누군가가 조심스럽게<br />꺼낸 이야기를<br />천천히 읽어보세요.</span></span><img src="/assets/direction-a-listen-isolated-tight.png" alt="" aria-hidden="true" /></button></section><div className="home-choice-footer"><img src="/assets/decor.svg" alt="" aria-hidden="true" /><p>여기서 고른 선택은 언제든 홈에서 바꿀 수 있어요.</p></div>{testState === "partial-error" && <p className="home-partial-error">일부 소식을 불러오지 못했어요. 잠시 후 다시 확인해주세요.</p>}</>}{qaMode && <details className="prototype-test-panel home-test-panel"><summary>프로토타입 테스트</summary><p>홈 데이터와 소식 상태를 확인할 수 있어요.</p><div><button type="button" onClick={() => setTestState("loading")}>홈 로딩</button><button type="button" onClick={() => setTestState("error")}>전체 오류</button><button type="button" onClick={() => setTestState("partial-error")}>일부 오류</button><button type="button" onClick={() => setTestState("normal")}>정상</button></div><div><button type="button" onClick={() => { seedNotificationTestState("reply"); setNoticeVersion((value) => value + 1); }}>답장 도착</button><button type="button" onClick={() => { seedNotificationTestState("empty"); setNoticeVersion((value) => value + 1); }}>소식 없음</button></div></details>}</div><AppBottomNavigation active="home" /></main>;
}
