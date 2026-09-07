import { getCurrentUserId } from "./letters";
import { seedSampleLetters } from "./sampleLetters";

/** Prototype-only in-app notification store. Replace with server + push APIs in production. */
export type MockNotificationType = "reply_arrived" | "letter_assigned" | "reply_reminder" | "report_received" | "report_resolved" | "service_notice";
export type MockNotification = { id: string; userId: string; type: MockNotificationType; title: string; message: string; targetType?: "letter" | "reply" | "report" | "notice"; targetId?: string; targetRoute?: string; isRead: boolean; createdAt: string; readAt?: string };
export type MockNotificationSettings = { userId: string; pushPermission: "not_requested" | "granted" | "denied"; replyArrived: boolean; letterUpdates: boolean; replyReminders: boolean; safetyUpdates: boolean; serviceNotices: boolean; updatedAt: string };

const NOTIFICATIONS_KEY = "gonggam_mock_notifications_v1";
const SETTINGS_KEY = "gonggam_mock_notification_settings_v1";
const id = () => `notice-${typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
const storage = () => typeof window !== "undefined" ? window.localStorage : undefined;

function read<T>(key: string, fallback: T): T { try { const raw = storage()?.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; } }
function write(key: string, value: unknown) { try { storage()?.setItem(key, JSON.stringify(value)); } catch { /* local prototype storage may be unavailable */ } }

function valid(item: unknown): item is MockNotification { const notice = item as Partial<MockNotification>; return Boolean(notice && typeof notice.id === "string" && typeof notice.userId === "string" && typeof notice.title === "string" && typeof notice.message === "string" && typeof notice.isRead === "boolean" && typeof notice.createdAt === "string"); }

export function getNotifications(userId = getCurrentUserId()) { return read<unknown[]>(NOTIFICATIONS_KEY, []).filter(valid).filter((item) => item.userId === userId && (item as { type?: string }).type !== "letter_read").sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
export function unreadNotificationCount(userId = getCurrentUserId()) { return getNotifications(userId).filter((item) => !item.isRead).length; }
/** 알림 하나를 목록 맨 앞에 넣는다. 만들어진 알림은 언제나 '안 읽음'으로 시작한다. */
export function addNotification(input: Omit<MockNotification, "id" | "isRead" | "createdAt"> & { createdAt?: string }) {
  const notices = read<unknown[]>(NOTIFICATIONS_KEY, []).filter(valid);
  const notice: MockNotification = { ...input, id: id(), isRead: false, createdAt: input.createdAt ?? new Date().toISOString() };
  write(NOTIFICATIONS_KEY, [notice, ...notices]);
  return notice;
}

/**
 * 같은 편지에 같은 종류의 알림이 이미 있는지 본다.
 *
 * 읽은 알림까지 함께 세는 것이 중요하다 — 읽었다고 다시 만들면
 * 앱을 열 때마다 같은 알림이 새로 쌓인다.
 */
export function hasNotificationFor(userId: string, type: MockNotificationType, targetId: string) {
  return read<unknown[]>(NOTIFICATIONS_KEY, []).filter(valid).some((item) => item.userId === userId && item.type === type && item.targetId === targetId);
}

export function markNotificationRead(notificationId: string) { const notices = read<unknown[]>(NOTIFICATIONS_KEY, []).filter(valid); write(NOTIFICATIONS_KEY, notices.map((item) => item.id === notificationId ? { ...item, isRead: true, readAt: new Date().toISOString() } : item)); }
export function markAllNotificationsRead(userId = getCurrentUserId()) { const notices = read<unknown[]>(NOTIFICATIONS_KEY, []).filter(valid); write(NOTIFICATIONS_KEY, notices.map((item) => item.userId === userId ? { ...item, isRead: true, readAt: new Date().toISOString() } : item)); }

export function getNotificationSettings(userId = getCurrentUserId()): MockNotificationSettings {
  const values = read<MockNotificationSettings[]>(SETTINGS_KEY, []);
  const current = values.find((item) => item?.userId === userId);
  return current ?? { userId, pushPermission: "not_requested", replyArrived: true, letterUpdates: true, replyReminders: true, safetyUpdates: true, serviceNotices: true, updatedAt: new Date().toISOString() };
}
export function updateNotificationSettings(changes: Partial<Omit<MockNotificationSettings, "userId" | "updatedAt">>, userId = getCurrentUserId()) { const current = getNotificationSettings(userId); const next = { ...current, ...changes, updatedAt: new Date().toISOString() }; const all = read<MockNotificationSettings[]>(SETTINGS_KEY, []).filter((item) => item?.userId !== userId); write(SETTINGS_KEY, [next, ...all]); return next; }

export function seedNotificationTestState(kind: "empty" | "one" | "many" | "all-read" | "reply" | "progress" | "report" | "missing") {
  const userId = getCurrentUserId();
  if (["reply", "progress", "many"].includes(kind)) seedSampleLetters();
  const now = Date.now();
  const base = (type: MockNotificationType, title: string, message: string, minutes: number, route?: string, isRead = false): MockNotification => ({ id: id(), userId, type, title, message, targetRoute: route, isRead, createdAt: new Date(now - minutes * 60_000).toISOString() });
  const notices = kind === "empty" ? [] : kind === "one" ? [base("service_notice", "공감편지에서 알려드려요", "앱 안의 알림은 언제든 이곳에서 확인할 수 있어요.", 12)] : kind === "reply" ? [base("reply_arrived", "기다리던 답장이 도착했어요.", "당신의 편지를 읽은 사람이 마음을 전했어요.", 18, "/mailbox/my/sample-waiting-letter-one")] : kind === "progress" ? [base("letter_assigned", "누군가가 편지를 맡았어요.", "편지함에서 지금 소식을 확인할 수 있어요.", 42, "/mailbox/my/sample-waiting-letter-one")] : kind === "report" ? [base("report_resolved", "신고 처리 결과를 알려드려요.", "안전하게 살펴본 결과를 나의 공간에서 확인할 수 있어요.", 90, "/safety-management")] : kind === "missing" ? [base("reply_arrived", "기다리던 답장이 도착했어요.", "이 알림과 연결된 내용을 더 이상 볼 수 없어요.", 120, "/mailbox/my/missing-letter")] : [base("reply_arrived", "기다리던 답장이 도착했어요.", "당신의 편지를 읽은 사람이 마음을 전했어요.", 10, "/mailbox/my/sample-waiting-letter-one"), base("reply_reminder", "맡은 편지에 답장을 전해주세요.", "준비되었을 때, 이어서 마음을 적어주세요.", 80, "/write-reply/sample-waiting-letter-two"), base("service_notice", "공감편지에서 알려드려요", "앱 안의 알림은 언제든 이곳에서 확인할 수 있어요.", 1440, undefined, true)];
  write(NOTIFICATIONS_KEY, notices);
}
