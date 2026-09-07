export type LetterStatus =
  | "submitted"
  | "waiting_for_reader"
  | "assigned"
  | "read"
  | "waiting_for_reply"
  | "replied"
  | "withdrawn";

export type LetterReply = {
  id: string;
  letterId: string;
  writerId: string;
  anonymousName?: string;
  content: string;
  createdAt: string;
  safetyStatus?: import("./safety").SafetyStatus;
  safetyReviewId?: string;
  moderationStatus?: import("./safety").ModerationStatus;
};

export type SealedSentence = {
  text: string;
  createdAt: string;
};

export type LetterStatusHistoryItem = {
  status: LetterStatus;
  changedAt: string;
  actorId?: string;
};

export type Letter = {
  id: string;
  senderId: string;
  anonymousName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  status: LetterStatus;
  assignedReaderId?: string;
  assignedAt?: string;
  readAt?: string;
  waitingForReplyAt?: string;
  repliedAt?: string;
  withdrawnAt?: string;
  reply?: LetterReply;
  sealedSentence?: SealedSentence;
  retryCount: number;
  sourceDraftId?: string;
  lastRedistributedAt?: string;
  waitingExtendedAt?: string;
  replyOpenedAt?: string;
  statusHistory?: LetterStatusHistoryItem[];
  lastStatusChangedAt?: string;
  safetyStatus?: import("./safety").SafetyStatus;
  safetyReviewId?: string;
  moderationStatus?: import("./safety").ModerationStatus;
  returnCount?: number;
  lastReturnedAt?: string;
  lastReturnReason?: string;
  isPrototypeFixture?: boolean;
  prototypeScenario?: string;
  prototypeListScenario?: string;
  prototypeWaitingScenario?: string;
};

const LETTERS_KEY = "gonggam_letters_v1";
const CURRENT_USER_KEY = "gonggam_current_user_v1";

function createId(prefix: string) {
  const randomPart = typeof crypto?.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${randomPart}`;
}

function isLetterStatus(value: unknown): value is LetterStatus {
  return typeof value === "string" && [
    "submitted",
    "waiting_for_reader",
    "assigned",
    "read",
    "waiting_for_reply",
    "replied",
    "withdrawn",
  ].includes(value);
}

function isLetter(value: unknown): value is Letter {
  if (!value || typeof value !== "object") return false;
  const letter = value as Partial<Letter>;
  return typeof letter.id === "string"
    && typeof letter.senderId === "string"
    && typeof letter.anonymousName === "string"
    && typeof letter.content === "string"
    && typeof letter.createdAt === "string"
    && typeof letter.updatedAt === "string"
    && isLetterStatus(letter.status)
    && typeof letter.retryCount === "number";
}

function normalizeLetter(letter: Letter): Letter {
  const repairedStatus: LetterStatus = letter.reply && letter.status !== "replied"
    ? "replied"
    : !letter.reply && letter.status === "replied"
      ? "waiting_for_reply"
      : letter.status;
  const statusChangedAt = letter.lastStatusChangedAt ?? statusDate({ ...letter, status: repairedStatus }) ?? letter.updatedAt;
  const statusHistory = Array.isArray(letter.statusHistory) && letter.statusHistory.length > 0
    ? letter.statusHistory.filter((item) => isLetterStatus(item.status) && typeof item.changedAt === "string")
    : [{ status: repairedStatus, changedAt: statusChangedAt }];
  return { ...letter, status: repairedStatus, statusHistory, lastStatusChangedAt: statusChangedAt };
}

function statusDate(letter: Letter) {
  if (letter.status === "assigned") return letter.assignedAt;
  if (letter.status === "read") return letter.readAt;
  if (letter.status === "waiting_for_reply") return letter.waitingForReplyAt ?? letter.readAt;
  if (letter.status === "replied") return letter.repliedAt;
  if (letter.status === "withdrawn") return letter.withdrawnAt;
  return undefined;
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** 맡은 편지에 답장할 수 있는 기간. 이 시간이 지나면 편지는 자동으로 사라진다. */
export const REPLY_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * 맡은 편지가 사라지는 시각(ms). 기준은 편지를 맡은 때(assignedAt)다.
 * 아직 맡지 않았거나 이미 답장을 보낸 편지는 기한이 없으므로 undefined 를 준다.
 * assignedAt 이 비어 있는 옛 기록은 기한을 계산할 수 없어 역시 undefined 다 —
 * 이때는 남은 시간을 감추고 문구만 보여주는 쪽이 틀린 숫자를 띄우는 것보다 낫다.
 */
export function getReplyDeadline(letter: Pick<Letter, "status" | "assignedAt">) {
  if (!letter.assignedAt) return undefined;
  if (!["assigned", "read", "waiting_for_reply"].includes(letter.status)) return undefined;
  const assigned = new Date(letter.assignedAt).getTime();
  if (!Number.isFinite(assigned)) return undefined;
  return assigned + REPLY_WINDOW_MS;
}

export function createLocalAnonymousUser() {
  return createId("local-user");
}

export function getCurrentUserId() {
  if (!canUseStorage()) return "local-user-memory";

  try {
    const stored = window.localStorage.getItem(CURRENT_USER_KEY);
    if (stored && stored.trim()) return stored;
    const userId = createLocalAnonymousUser();
    window.localStorage.setItem(CURRENT_USER_KEY, userId);
    return userId;
  } catch {
    return "local-user-memory";
  }
}

/** 계정 삭제 뒤 재가입 사용자가 이전 로컬 계정의 편지 상태를 물려받지 않게 한다. */
export function resetCurrentUserId() {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(CURRENT_USER_KEY);
  } catch {
    // Storage can be unavailable in private browser contexts.
  }
}

export function getLetters(includePrototypeFixtures = false): Letter[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(LETTERS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isLetter).map(normalizeLetter).filter((letter) => includePrototypeFixtures || !letter.isPrototypeFixture).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

function writeLetters(letters: Letter[]) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(LETTERS_KEY, JSON.stringify(letters));
  } catch {
    // Storage can be unavailable in private or quota-limited browser contexts.
  }
}

export function getLetterById(id: string) {
  return getLetters(true).find((letter) => letter.id === id);
}

export function saveLetter(letter: Letter) {
  const letters = getLetters(true);
  const nextLetters = [letter, ...letters.filter((item) => item.id !== letter.id)];
  writeLetters(nextLetters);
  return letter;
}

export function updateLetter(id: string, changes: Partial<Omit<Letter, "id" | "createdAt">>) {
  const letter = getLetterById(id);
  if (!letter) return undefined;
  const updated: Letter = { ...letter, ...changes, updatedAt: new Date().toISOString() };
  return saveLetter(updated);
}

export function getMyLetters(userId: string) {
  return getLetters().filter((letter) => letter.senderId === userId);
}

export function getOutgoingLettersByUser(userId: string) {
  return getMyLetters(userId);
}

export function getActiveOutgoingLettersByUser(userId: string) {
  const activeStatuses: LetterStatus[] = ["submitted", "waiting_for_reader", "assigned", "read", "waiting_for_reply"];
  return getMyLetters(userId).filter((letter) => activeStatuses.includes(letter.status));
}

export function getWaitingReplyLettersByUser(userId: string) {
  return getMyLetters(userId).filter((letter) => !letter.reply && !["replied", "withdrawn"].includes(letter.status));
}

export function getUnreadReplyLettersByUser(userId: string) {
  return getMyLetters(userId).filter((letter) => Boolean(letter.reply) && !letter.replyOpenedAt);
}

export function getOutgoingLetterStatusSummary(userId: string) {
  return getMyLetters(userId).reduce<Record<LetterStatus, number>>((summary, letter) => {
    summary[letter.status] += 1;
    return summary;
  }, { submitted: 0, waiting_for_reader: 0, assigned: 0, read: 0, waiting_for_reply: 0, replied: 0, withdrawn: 0 });
}

export function getLettersRepliedByUser(userId: string) {
  return getLetters().filter((letter) => letter.reply?.writerId === userId);
}

export function getReceivedRepliesByUser(userId: string) {
  return getMyLetters(userId).filter((letter) => Boolean(letter.reply)).sort((a, b) => (b.repliedAt ?? b.updatedAt).localeCompare(a.repliedAt ?? a.updatedAt));
}

export function getReceivedReplyCount(userId: string) { return getReceivedRepliesByUser(userId).length; }

export function createLetter(input: Pick<Letter, "senderId" | "anonymousName" | "content"> & { sourceDraftId?: string }) {
  if (input.sourceDraftId) {
    const existing = getLetters().find((letter) => letter.sourceDraftId === input.sourceDraftId);
    if (existing) return existing;
  }
  const now = new Date().toISOString();
  const letter: Letter = {
    id: createId("letter"),
    senderId: input.senderId,
    anonymousName: input.anonymousName.trim() || "이름 없는 편지",
    content: input.content.trim(),
    createdAt: now,
    updatedAt: now,
    status: "waiting_for_reader",
    safetyStatus: "clear",
    moderationStatus: "not_required",
    retryCount: 0,
    sourceDraftId: input.sourceDraftId,
    statusHistory: [{ status: "waiting_for_reader", changedAt: now, actorId: input.senderId }],
    lastStatusChangedAt: now,
  };
  return saveLetter(letter);
}

export function transitionLetterStatus(letterId: string, status: LetterStatus, actorId?: string, changes: Partial<Letter> = {}) {
  const latest = getLetterById(letterId);
  if (!latest) return undefined;
  const now = new Date().toISOString();
  const history = [...(latest.statusHistory ?? []), { status, changedAt: now, ...(actorId ? { actorId } : {}) }];
  return updateLetter(letterId, { ...changes, status, statusHistory: history, lastStatusChangedAt: now });
}

export type AssignLetterResult =
  | { ok: true; letter: Letter }
  | { ok: false; reason: "not-found" | "already-assigned" | "own-letter" };

export function assignLetterToReader(letterId: string, readerId: string): AssignLetterResult {
  const latest = getLetterById(letterId);
  if (!latest) return { ok: false, reason: "not-found" };
  if (latest.senderId === readerId) return { ok: false, reason: "own-letter" };
  if (latest.status !== "waiting_for_reader" || latest.assignedReaderId) {
    return { ok: false, reason: "already-assigned" };
  }

  const now = new Date().toISOString();
  const letter = transitionLetterStatus(letterId, "assigned", readerId, {
    assignedReaderId: readerId,
    assignedAt: now,
  });
  return letter ? { ok: true, letter } : { ok: false, reason: "not-found" };
}

export type SendReplyResult =
  | { ok: true; letter: Letter }
  | { ok: false; reason: "not-found" | "not-assigned" | "already-replied" };

export function sendReply(letterId: string, writerId: string, content: string): SendReplyResult {
  const latest = getLetterById(letterId);
  if (!latest) return { ok: false, reason: "not-found" };
  if (latest.reply || latest.status === "replied") return { ok: false, reason: "already-replied" };
  if (latest.assignedReaderId !== writerId || !["assigned", "read", "waiting_for_reply"].includes(latest.status)) {
    return { ok: false, reason: "not-assigned" };
  }

  const now = new Date().toISOString();
  const reply: LetterReply = {
    id: createId("reply"),
    letterId,
    writerId,
    // The public name is captured at writing time. It must never be replaced by a later nickname change.
    anonymousName: (() => { try { return JSON.parse(localStorage.getItem("gonggam_mock_auth_v1") ?? "{}").account?.anonymousName; } catch { return undefined; } })(),
    content: content.trim(),
    createdAt: now,
  };
  const letter = transitionLetterStatus(letterId, "replied", writerId, { reply, repliedAt: now });
  return letter ? { ok: true, letter } : { ok: false, reason: "not-found" };
}

export function markLetterReadForReply(letterId: string, readerId: string) {
  const latest = getLetterById(letterId);
  if (!latest || latest.assignedReaderId !== readerId || latest.status !== "assigned") return undefined;
  const now = new Date().toISOString();
  return transitionLetterStatus(letterId, "waiting_for_reply", readerId, { readAt: now, waitingForReplyAt: now });
}

export function redistributeLetter(letterId: string, senderId: string) {
  const latest = getLetterById(letterId);
  if (!latest || latest.senderId !== senderId || latest.status !== "waiting_for_reader") return undefined;
  const now = new Date().toISOString();
  return transitionLetterStatus(letterId, "waiting_for_reader", senderId, { retryCount: latest.retryCount + 1, lastRedistributedAt: now, waitingExtendedAt: undefined });
}

export function extendLetterWaiting(letterId: string, senderId: string) {
  const latest = getLetterById(letterId);
  if (!latest || latest.senderId !== senderId || ["replied", "withdrawn"].includes(latest.status)) return undefined;
  return updateLetter(letterId, { waitingExtendedAt: new Date().toISOString() });
}

export function withdrawLetter(letterId: string, senderId: string) {
  const latest = getLetterById(letterId);
  if (!latest || latest.senderId !== senderId || latest.status === "replied" || latest.status === "withdrawn") return undefined;
  const now = new Date().toISOString();
  return transitionLetterStatus(letterId, "withdrawn", senderId, { withdrawnAt: now, assignedReaderId: undefined, assignedAt: undefined });
}

export function markReplyOpened(letterId: string, senderId: string) {
  const latest = getLetterById(letterId);
  if (!latest || latest.senderId !== senderId || latest.status !== "replied" || latest.replyOpenedAt) return latest;
  return updateLetter(letterId, { replyOpenedAt: new Date().toISOString() });
}

export function returnLetterToWaiting(letterId: string, readerId: string, reason = "unspecified") {
  const latest = getLetterById(letterId);
  if (!latest || latest.assignedReaderId !== readerId || !["assigned", "read", "waiting_for_reply"].includes(latest.status)) return undefined;
  const now = new Date().toISOString();
  return transitionLetterStatus(letterId, "waiting_for_reader", readerId, { assignedReaderId: undefined, assignedAt: undefined, readAt: undefined, waitingForReplyAt: undefined, returnCount: (latest.returnCount ?? 0) + 1, lastReturnedAt: now, lastReturnReason: reason });
}

export const letterStorageKeys = { letters: LETTERS_KEY, currentUser: CURRENT_USER_KEY } as const;
