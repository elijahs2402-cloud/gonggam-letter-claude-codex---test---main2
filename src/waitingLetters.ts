import { isUserBlocked } from "./blocks";
import { isContentHidden } from "./contentVisibility";
import { getLetters, type Letter } from "./letters";
import { getLetterReturn } from "./letterReturns";
import { seedSampleLetters } from "./sampleLetters";
import { getReportForTarget } from "./reports";

const VIEWED_KEY = "gonggam_waiting_letters_viewed_v1";
const ORDER_KEY = "gonggam_waiting_letters_order_v1";

function sessionRead(key: string) { try { return window.sessionStorage.getItem(key); } catch { return null; } }
function sessionWrite(key: string, value: string) { try { window.sessionStorage.setItem(key, value); } catch { /* session ordering is optional */ } }
function viewedIds() { try { const value: unknown = JSON.parse(sessionRead(VIEWED_KEY) ?? "[]"); return Array.isArray(value) ? new Set(value.filter((id): id is string => typeof id === "string")) : new Set<string>(); } catch { return new Set<string>(); } }
function hash(value: string) { return [...value].reduce((total, char) => (total * 31 + char.charCodeAt(0)) >>> 0, 7); }

export function waitingLetterPreview(content: string, maxLength = 112) {
  const clean = content.replace(/\s+/g, " ").replace(/(?:\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4}|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/g, "•••").trim();
  return clean.length > maxLength ? `${clean.slice(0, maxLength)}…` : clean;
}

export function waitingLetterTimeText(value: string) {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 3_600_000));
  if (hours < 24) return "오늘 도착한 편지";
  if (hours < 48) return "어제 도착한 편지";
  return `${Math.floor(hours / 24)}일째 기다리는 편지`;
}

export function isAvailableWaitingLetter(letter: Letter, userId: string) {
  return !letter.isPrototypeFixture
    && letter.status === "waiting_for_reader"
    && !letter.assignedReaderId
    && !letter.reply
    && letter.senderId !== userId
    && !letter.withdrawnAt
    && !["high_risk", "needs_revision", "under_review", "blocked"].includes(letter.safetyStatus ?? "clear")
    && !["pending", "reviewing", "rejected"].includes(letter.moderationStatus ?? "not_required")
    && !isUserBlocked(userId, letter.senderId)
    && !isUserBlocked(letter.senderId, userId)
    && !isContentHidden(userId, "letter", letter.id)
    && !getReportForTarget(userId, "letter", letter.id)
    && !getLetterReturn(letter.id, userId);
}

export function getAvailableWaitingLetters(userId: string, refresh = 0) {
  const viewed = viewedIds(); const rotation = Number(sessionRead(ORDER_KEY) ?? "0") + refresh;
  return getLetters().filter((letter) => isAvailableWaitingLetter(letter, userId)).sort((left, right) => {
    const leftViewed = viewed.has(left.id) ? 1 : 0; const rightViewed = viewed.has(right.id) ? 1 : 0;
    if (leftViewed !== rightViewed) return leftViewed - rightViewed;
    const leftAge = Date.now() - new Date(left.createdAt).getTime(); const rightAge = Date.now() - new Date(right.createdAt).getTime();
    const leftScore = (hash(left.id) + rotation * 97) % 1000 - Math.min(700, Math.floor(leftAge / 3_600_000) * 8);
    const rightScore = (hash(right.id) + rotation * 97) % 1000 - Math.min(700, Math.floor(rightAge / 3_600_000) * 8);
    return leftScore - rightScore;
  });
}

export function markWaitingLetterViewed(letterId: string) { const next = viewedIds(); next.add(letterId); sessionWrite(VIEWED_KEY, JSON.stringify([...next].slice(-80))); }
export function refreshWaitingLetterOrder() { const next = Number(sessionRead(ORDER_KEY) ?? "0") + 1; sessionWrite(ORDER_KEY, String(next)); return next; }

/**
 * 홈의 '읽기' 카드가 어디로 갈지 정한다.
 *
 * 기다리는 편지가 없는데도 '편지 만나기'를 먼저 보여주면,
 * 만날 편지가 없다는 사실을 한 화면 뒤에 가서야 알게 된다.
 * 편지가 있을 때만 관문을 지나고, 없으면 곧장 '기다리는 편지가 없어요'(/listen-entry-empty) 로 보낸다.
 *
 * 목록 화면과 같은 기준을 쓰려고 씨앗까지 같이 심는다 —
 * 씨앗 전에 세면 첫 방문자가 항상 '편지 없음'으로 보인다.
 */
export function getListenEntryPath(userId: string) {
  seedSampleLetters();
  return getAvailableWaitingLetters(userId).length > 0 ? "/listen-entry-a" : "/listen-entry-empty";
}

/**
 * 지금 내가 맡고 있는 편지. 읽기만 하고 아직 답장을 보내지 않은 상태다.
 *
 * 답장을 보내면 status 가 'replied' 로 바뀌고, 두고 가면 assignedReaderId 가 비워진다.
 * 둘 다 아래 조건에서 스스로 빠지므로 따로 지울 필요가 없다.
 *
 * 두고 간 기록(getLetterReturn)까지 함께 본다 — 편지 읽기 화면의 가드와 기준이
 * 어긋나면, 여기서 보낸 편지가 저기서 '이미 두고 온 편지'로 막혀버린다.
 *
 * 여러 통이면 먼저 맡은 것부터 돌려준다. 답장 기한(3일)이 먼저 끝나는 쪽이라,
 * 놓쳤을 때 되돌릴 수 없는 편지다.
 */
export function getHeldLetter(userId: string) {
  return getLetters()
    .filter((letter) => letter.assignedReaderId === userId
      && ["assigned", "read", "waiting_for_reply"].includes(letter.status)
      && !letter.reply
      && !getLetterReturn(letter.id, userId))
    .sort((left, right) => (left.assignedAt ?? left.createdAt).localeCompare(right.assignedAt ?? right.createdAt))[0];
}

/**
 * 홈의 '편지 읽기' 카드(02번)가 어디로 갈지 정한다.
 *
 * 읽어두고 아직 답장을 보내지 않은 편지가 남아 있으면 그 편지로 돌아간다.
 * 맡은 편지가 있는데도 '편지 만나기'로 보내면 한 통을 더 받으라는 뜻으로 읽히고,
 * 정작 들고 있는 편지를 다시 찾아갈 길이 홈의 소식 카드 하나뿐이 된다
 * (그 카드는 한 번 닫으면 그 세션 동안 다시 뜨지 않는다).
 *
 * 답장을 보냈거나 두고 갔다면 평소대로 기다리는 편지를 찾으러 간다.
 */
export function getReadCardPath(userId: string) {
  seedSampleLetters();
  const held = getHeldLetter(userId);
  return held ? "/read-letter/" + encodeURIComponent(held.id) : getListenEntryPath(userId);
}
