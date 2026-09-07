/**
 * 홈에서 닫은 소식은 다시 띄우지 않는다. 알림 id 는 편지마다 다르므로
 * (예: reply-{편지id}) 닫은 것만 정확히 기억하고 새 소식은 그대로 뜬다.
 */
type DismissedNotice = { userId: string; noticeId: string; dismissedAt: string };

const KEY = "gonggam_dismissed_notices_v1";

const isRecord = (item: unknown): item is DismissedNotice =>
  Boolean(item) && typeof item === "object"
  && typeof (item as DismissedNotice).userId === "string"
  && typeof (item as DismissedNotice).noticeId === "string";

const read = (): DismissedNotice[] => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(value) ? value.filter(isRecord) : [];
  } catch {
    return [];
  }
};

const write = (items: DismissedNotice[]) => {
  try {
    // 무한정 쌓이지 않게 최근 것만 남긴다.
    localStorage.setItem(KEY, JSON.stringify(items.slice(-200)));
    return true;
  } catch {
    return false;
  }
};

export function dismissNotice(userId: string, noticeId: string) {
  if (isNoticeDismissed(userId, noticeId)) return true;
  return write([...read(), { userId, noticeId, dismissedAt: new Date().toISOString() }]);
}

export const isNoticeDismissed = (userId: string, noticeId: string) =>
  read().some((item) => item.userId === userId && item.noticeId === noticeId);


/* ── 이번 접속에서 이미 보여준 소식 ─────────────────────────────────
   '앱에 접속할 때마다 한 번은 뜨되, 접속해 있는 동안은 다시 뜨지 않는' 소식이
   쓴다(맡은 편지 알림). localStorage 는 영영 기억하므로 여기엔 맞지 않고,
   sessionStorage 는 탭을 닫으면 비워져 '한 번의 접속'과 뜻이 정확히 맞는다.
   이 앱은 화면 이동이 페이지 새로고침이라 접속 중에도 모듈이 다시 평가되는데,
   sessionStorage 는 새로고침을 넘어 남으므로 그 사이에도 기억이 유지된다. */
const SEEN_KEY = "gonggam_seen_notices_session_v1";

const readSeen = (): string[] => {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
};

/**
 * 페이지가 뜨는 시점에 한 번만 읽어 고정한다.
 * 아래 markNoticeSeen 이 곧바로 sessionStorage 를 갱신하는데, 그 값을 그대로
 * 다시 읽으면 방금 띄운 소식이 같은 화면에서 즉시 사라진다. '이 페이지가
 * 뜨기 전에 이미 봤는가'를 기준으로 삼아야 한 번은 보이고, 다음 접속·다음
 * 페이지에서 사라진다.
 */
const seenBeforeThisLoad = new Set(readSeen());

export const wasNoticeSeenThisSession = (noticeId: string) => seenBeforeThisLoad.has(noticeId);

export function markNoticeSeen(noticeId: string) {
  const seen = readSeen();
  if (seen.includes(noticeId)) return;
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen, noticeId].slice(-50)));
  } catch {
    // 세션스토리지를 못 쓰는 환경에서는 매번 보이게 둔다 — 안 보이는 것보다 낫다.
  }
}
