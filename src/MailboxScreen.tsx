import { useState } from "react";
import { navigateTo } from "./navigation";
import { AppBottomNavigation } from "./AppBottomNavigation";
import { getCurrentUserId, getLettersRepliedByUser, getMyLetters, type Letter } from "./letters";
import { getSentLetterDisplayStatus, sortSentLettersByActivity } from "./mailboxStatus";

export type MailboxKey = "sent" | "replied" | "favorite";

export const MAILBOX_RECORDS: ReadonlyArray<{ id: MailboxKey; title: string; description: string; count: number }> = [
  { id: "sent", title: "내가 보낸 편지", description: "내 마음을 털어놓았던 기록", count: 8 },
  { id: "replied", title: "내가 답한 편지", description: "누군가에게 건넨 마음", count: 12 },
  { id: "favorite", title: "즐겨찾기", description: "오래 간직하고 싶은 편지", count: 4 },
];

export function formatMailboxCount(count: number) { return `${count > 999 ? "999+" : count}통`; }

export function MailboxNavigation({ onUnavailable }: { onUnavailable: (label: string) => void }) {
  return <nav className="app-bottom-navigation" aria-label="주요 메뉴"><button type="button" onClick={() => navigateTo("/home")}><img className="app-nav-mark app-nav-mark--home" src="/assets/home_icon.png" alt="" aria-hidden="true" /><span>홈</span></button><button type="button" className="is-active" aria-current="page"><img className="app-nav-mark app-nav-mark--mailbox" src="/assets/letter_icon.png" alt="" aria-hidden="true" /><span>편지함</span></button><button type="button" onClick={() => onUnavailable("나의 공간")}><img className="app-nav-mark app-nav-mark--space" src="/assets/notebook_icon.png" alt="" aria-hidden="true" /><span>나의 공간</span></button></nav>;
}

export function MailboxScreen() {
  const userId = getCurrentUserId();
  const myLetters = sortSentLettersByActivity(getMyLetters(userId), userId);
  const repliedLetters = getLettersRepliedByUser(userId);
  const records = [
    ...myLetters.map((letter) => toUnifiedMailboxRecord(letter, "mine", userId)),
    ...repliedLetters.map((letter) => toUnifiedMailboxRecord(letter, "replied", userId)),
  ].sort((left, right) => right.activityAt.localeCompare(left.activityAt));
  return <MailboxCollection records={records} illustrationVariant="directional-status-inline" />;
}

export function MailboxDemoScreen() {
  return <MailboxCollection records={getMailboxDemoRecords("/mailbox-demo")} isDemo />;
}

export function MailboxEmptyDemoScreen() {
  return <MailboxCollection records={[]} isDemo illustrationVariant="directional-status-inline" />;
}

export function MailboxReplyArrivedDemoScreen() {
  return <MailboxCollection records={[{ id: "reply-arrived-demo", href: "/mailbox-my-replied-demo", status: "arrived", label: "답장 도착", nickname: "고요한 별빛", activityAt: "2026-08-28T09:30:00.000Z", isUnread: true }]} isDemo illustrationVariant="directional-status-inline" />;
}

export function MailboxDemoStatusIconScreen() {
  return <MailboxCollection records={getMailboxDemoRecords("/mailbox-demo-status-icons")} isDemo illustrationVariant="demo-status" />;
}

export function MailboxDemoDirectionalStatusScreen() {
  return <MailboxCollection records={getMailboxDemoRecords("/mailbox-demo-directional-status")} isDemo illustrationVariant="directional-status" />;
}

export function MailboxDemoInlineDirectionalStatusScreen() {
  return <MailboxCollection records={getMailboxDemoRecords("/mailbox-demo-inline-directional-status")} isDemo illustrationVariant="directional-status-inline" />;
}

export function MailboxDemoIconSetScreen() {
  return <MailboxCollection records={getMailboxDemoRecords("/mailbox-demo-icons")} isDemo illustrationVariant="icon-set" />;
}

export function MailboxDemoUploadedIconSetScreen() {
  return <MailboxCollection records={getMailboxDemoRecords("/mailbox-demo-upload-icons")} isDemo illustrationVariant="icon-set-upload" />;
}

function getMailboxDemoRecords(href: string): UnifiedMailboxRecord[] {
  return [
    { id: "demo-waiting-1", href, status: "waiting", label: "답장 기다리는 중", nickname: "마음의온기를나누는한사람", activityAt: "2026-08-25T09:00:00.000Z" },
    { id: "demo-arrived-1", href, status: "arrived", label: "답장 도착", nickname: "비오는날창가에앉은고양이", activityAt: "2026-08-24T12:30:00.000Z", isUnread: true },
    { id: "demo-sent-1", href, status: "sent", label: "답장 보냄", nickname: "따뜻한차한잔을건네는마음", activityAt: "2026-08-23T16:20:00.000Z" },
    { id: "demo-waiting-2", href, status: "waiting", label: "답장 기다리는 중", nickname: "새벽공기를좋아하는한사람", activityAt: "2026-08-22T10:10:00.000Z" },
    { id: "demo-arrived-2", href, status: "arrived", label: "답장 도착", nickname: "오늘도천천히걷는한마음씨", activityAt: "2026-08-21T08:40:00.000Z", isUnread: true },
  ];
}

function MailboxCollection({ records, isDemo = false, illustrationVariant = "default" }: { records: UnifiedMailboxRecord[]; isDemo?: boolean; illustrationVariant?: MailboxIllustrationVariant }) {
  const [activeFilter, setActiveFilter] = useState<MailboxFilter>("all");
  const visibleRecords = activeFilter === "all" ? records : records.filter((record) => record.status === activeFilter);
  const filters: ReadonlyArray<{ id: MailboxFilter; label: string }> = [
    { id: "all", label: "전체" },
    { id: "waiting", label: "답장 기다리는 중" },
    { id: "arrived", label: "답장 도착" },
    { id: "sent", label: "답장 보냄" },
  ];

  const usesInlineDirection = illustrationVariant === "directional-status-inline";
  return <main className={`mobile-prototype mailbox-screen${isDemo ? " mailbox-screen--demo" : ""}${illustrationVariant !== "default" ? " mailbox-screen--icon-set" : ""}${illustrationVariant === "demo-status" ? " mailbox-screen--status-icons" : ""}${usesInlineDirection ? " mailbox-screen--inline-direction" : ""}`}><div className={`mailbox-scroll-region${visibleRecords.length ? "" : " mailbox-scroll-region--empty"}`}><header className="mailbox-heading mailbox-heading--unified" aria-labelledby="mailbox-title"><p>{usesInlineDirection ? "공감편지" : "편지함"}</p><h1 id="mailbox-title">{usesInlineDirection ? "편지함" : "내 편지"}</h1>{usesInlineDirection && <span>주고받은 마음을 다시 꺼내볼 수 있어요.</span>}</header><div className="mailbox-filter-chips" role="group" aria-label="편지 상태로 정렬"><span className="sr-only">편지 상태 필터</span>{filters.map((filter) => <button key={filter.id} type="button" className={activeFilter === filter.id ? "is-active" : ""} aria-pressed={activeFilter === filter.id} onClick={() => setActiveFilter(filter.id)}>{filter.label}</button>)}</div>{visibleRecords.length ? <section className="mailbox-unified-list" aria-label="내 편지 목록">{visibleRecords.map((record) => <button type="button" className={`mailbox-unified-item mailbox-unified-item--${record.status}${record.isUnread ? " is-unread" : ""}`} key={record.id} onClick={() => navigateTo(record.href)}><MailboxStatusIllustration status={record.status} variant={illustrationVariant} /><span className="mailbox-unified-copy"><time dateTime={record.activityAt}>{usesInlineDirection ? formatFigmaMailboxDate(record.activityAt) : formatFullMailboxDate(record.activityAt)}</time><strong>{usesInlineDirection && record.status === "waiting" ? "내가 보낸 편지" : record.nickname}{record.isUnread && <i className="mailbox-unified-unread" aria-label="읽지 않은 답장" />}</strong><em>{usesInlineDirection && <i className={`mailbox-inline-direction mailbox-inline-direction--${record.status}`} aria-hidden="true">{getDirectionMark(record.status)}</i>}{record.label}</em></span></button>)}</section> : <UnifiedMailboxEmpty filter={activeFilter} />}</div><AppBottomNavigation active="mailbox" showAttention={!isDemo} /></main>;
}

type MailboxFilter = "all" | "waiting" | "arrived" | "sent";
type MailboxIllustrationVariant = "default" | "demo-status" | "directional-status" | "directional-status-inline" | "icon-set" | "icon-set-upload";
type UnifiedMailboxRecord = { id: string; href: string; status: Exclude<MailboxFilter, "all">; label: string; nickname: string; activityAt: string; isUnread?: boolean };

function toUnifiedMailboxRecord(letter: Letter, mode: "mine" | "replied", userId: string): UnifiedMailboxRecord {
  if (mode === "replied") return { id: letter.id, href: `/mailbox/replied/${encodeURIComponent(letter.id)}`, status: "sent", label: "답장 보냄", nickname: letter.anonymousName || "누군가", activityAt: letter.repliedAt ?? letter.updatedAt };
  const displayStatus = getSentLetterDisplayStatus(letter, userId);
  const arrived = displayStatus.kind === "reply_arrived_unread" || displayStatus.kind === "reply_opened";
  return { id: letter.id, href: `/mailbox/my/${encodeURIComponent(letter.id)}`, status: arrived ? "arrived" : "waiting", label: arrived ? "답장 도착" : "답장 기다리는 중", nickname: letter.anonymousName || "익명", activityAt: displayStatus.activityAt, isUnread: displayStatus.hasUnreadReply };
}

function formatFullMailboxDate(date: string) {
  const value = new Date(date);
  return `${value.getFullYear()}. ${String(value.getMonth() + 1).padStart(2, "0")}. ${String(value.getDate()).padStart(2, "0")}`;
}

function MailboxStatusIllustration({ status, variant }: { status: Exclude<MailboxFilter, "all">; variant: MailboxIllustrationVariant }) {
  if (variant === "directional-status-inline") return null;
  if (variant === "directional-status") {
    const mark = getDirectionMark(status);
    const label = status === "arrived" ? "답장이 도착한 편지" : status === "sent" ? "답장을 보낸 편지" : "답장을 기다리는 편지";
    return <span className={`mailbox-status-direction mailbox-status-direction--${status}`} aria-label={label}>{mark}</span>;
  }
  const source = variant === "demo-status" && status === "waiting" ? "/assets/mailbox-status/status-waiting-dots-uploaded.png" : variant === "icon-set-upload" ? status === "arrived" ? "/assets/mailbox-status/uploaded-arrived.png" : status === "sent" ? "/assets/mailbox-status/uploaded-sent.png" : "/assets/mailbox-status/uploaded-waiting.png" : variant === "icon-set" ? status === "arrived" ? "/assets/mailbox-status/set-arrived.png" : status === "sent" ? "/assets/mailbox-status/set-sent.png" : "/assets/mailbox-status/set-waiting.png" : status === "arrived" ? "/assets/mailbox-status/arrived.png" : status === "sent" ? "/assets/mailbox-status/sent.png" : "/assets/mailbox-status/waiting.png";
  const label = status === "arrived" ? "답장이 도착한 편지" : status === "sent" ? "답장을 보낸 편지" : "답장을 기다리는 편지";
  return <span className="mailbox-status-illustration" aria-label={label}><img src={source} alt="" /></span>;
}

function formatFigmaMailboxDate(date: string) {
  const value = new Date(date);
  return `${value.getFullYear()}년 ${value.getMonth() + 1}월 ${value.getDate()}일`;
}

function getDirectionMark(status: Exclude<MailboxFilter, "all">) {
  return status === "arrived" ? "←" : status === "sent" ? "→" : "–";
}

function UnifiedMailboxEmpty({ filter }: { filter: MailboxFilter }) {
  const label = filter === "all" ? "아직 편지가 없어요." : "이 상태의 편지는 아직 없어요.";
  return <section className="mailbox-letter-empty mailbox-letter-empty--unified"><p>{label}</p><span>새로운 마음이 오면 이곳에 차분히 기록할게요.</span>{filter === "all" && <button type="button" onClick={() => navigateTo("/write-letter")}>편지 쓰기</button>}</section>;
}

function MailboxEmpty({ mode }: { mode: "mine" | "replied" }) { const mine = mode === "mine"; return <section className="mailbox-letter-empty"><p>{mine ? "아직 보낸 편지가 없어요." : "아직 답장을 전한 편지가 없어요."}</p><span>{mine ? "마음을 남기면 한 사람이 읽고 답장을 전해요." : "기다리는 마음을 만나 천천히 답장을 전해보세요."}</span><button type="button" onClick={() => navigateTo(mine ? "/write-letter" : "/waiting-letters")}>{mine ? "편지 쓰기" : "기다리는 편지 보기"}</button></section>; }

export function MailboxLetterListItem({ letter, mode, userId, onClick, statusOverride, previewOverride }: { letter: Letter; mode: "mine" | "replied"; userId: string; onClick: () => void; statusOverride?: string; previewOverride?: string }) {
  const date = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(new Date(letter.updatedAt));
  const sentStatus = getSentLetterDisplayStatus(letter, userId);
  const status = statusOverride ?? (mode === "replied" ? "답장을 전했어요" : sentStatus.label);
  const preview = previewOverride ?? (mode === "replied" ? letter.reply?.content : letter.content);
  const aria = mode === "mine" ? `${date}에 보낸 편지, ${status}${sentStatus.hasUnreadReply ? ", 읽지 않은 새 답장 있음" : ""}` : `${date}에 답한 편지, ${status}`;
  return <button type="button" className={`mailbox-letter-item mailbox-letter-item--${mode}${sentStatus.hasUnreadReply && mode === "mine" ? " is-unread" : ""}${sentStatus.isRestricted ? " is-restricted" : ""}`} onClick={onClick} aria-label={aria}><span className="mailbox-letter-meta"><time dateTime={letter.updatedAt}>{date}</time><em>{sentStatus.hasUnreadReply && mode === "mine" && <i className="mailbox-unread-dot" aria-hidden="true" />}{status}</em></span><strong>{preview || "내용을 준비하고 있어요."}</strong><span>{mode === "replied" ? "내가 건넨 답장" : letter.anonymousName || "익명으로 보낸 편지"}</span>{mode === "mine" && sentStatus.requiresAttention && <small>확인 필요</small>}</button>;
}
