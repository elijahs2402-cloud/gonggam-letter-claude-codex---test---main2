import { getOpenDeliveryIssues } from "./deliveryIssues";
import type { Letter } from "./letters";

export type SentLetterDisplayKind =
  | "safety_review"
  | "moderation_review"
  | "restricted"
  | "send_failed"
  | "reply_arrived_unread"
  | "reply_opened"
  | "withdrawn"
  | "reply_writing"
  | "assigned"
  | "redistributed"
  | "waiting"
  | "sent"
  | "deleted";

export type SentLetterDisplayStatus = {
  kind: SentLetterDisplayKind;
  label: string;
  description: string;
  hasUnreadReply?: boolean;
  requiresAttention?: boolean;
  isRestricted?: boolean;
  isDeleted?: boolean;
  activityAt: string;
};

const fixtureStatus = (letter: Letter): SentLetterDisplayStatus | undefined => {
  const scenario = letter.prototypeListScenario;
  if (!scenario) return undefined;
  const at = letter.updatedAt;
  const lookup: Partial<Record<string, Omit<SentLetterDisplayStatus, "activityAt">>> = {
    sent: { kind: "sent", label: "편지를 맡아두었어요", description: "당신의 이야기를 전달할 준비를 하고 있어요." },
    waiting: { kind: "waiting", label: "답장을 기다리고 있어요", description: "읽어줄 사람을 조용히 기다리고 있어요." },
    assigned: { kind: "assigned", label: "한 사람이 편지를 맡았어요", description: "당신의 이야기를 천천히 읽고 있어요." },
    reply_writing: { kind: "reply_writing", label: "답장을 준비하고 있어요", description: "어떤 말을 건넬지 천천히 생각하고 있어요." },
    reply_arrived_unread: { kind: "reply_arrived_unread", label: "답장이 도착했어요", description: "당신의 편지를 읽은 사람이 마음을 전했어요.", hasUnreadReply: true },
    reply_opened: { kind: "reply_opened", label: "답장을 받았어요", description: "도착한 답장을 다시 읽을 수 있어요." },
    redistributed: { kind: "redistributed", label: "다시 전달되어 기다리고 있어요", description: "새로운 사람이 편지를 만날 수 있도록 다시 기다리고 있어요." },
    withdrawn: { kind: "withdrawn", label: "거둔 편지", description: "이 편지는 조용히 거두었어요." },
    send_failed: { kind: "send_failed", label: "발송을 마치지 못했어요", description: "작성한 내용은 이 기기에 보관되어 있어요.", requiresAttention: true },
    safety: { kind: "safety_review", label: "안전 확인이 필요해요", description: "전하기 전에 내용을 한 번 더 살펴봐주세요.", requiresAttention: true },
    review: { kind: "moderation_review", label: "운영 확인 중이에요", description: "안전을 위해 내용을 확인하고 있어요.", requiresAttention: true },
    restricted: { kind: "restricted", label: "접근이 제한된 편지예요", description: "현재 이 편지의 내용을 확인할 수 없어요.", requiresAttention: true, isRestricted: true },
    deleted: { kind: "deleted", label: "더 이상 찾을 수 없는 편지예요", description: "연결된 기록이 삭제되었거나 접근할 수 없어요.", isDeleted: true },
  };
  const result = lookup[scenario];
  return result ? { ...result, activityAt: at } : undefined;
};

export function getSentLetterDisplayStatus(letter: Letter, userId?: string): SentLetterDisplayStatus {
  const fixture = fixtureStatus(letter);
  if (fixture) return fixture;
  const activityAt = letter.repliedAt ?? letter.lastStatusChangedAt ?? letter.updatedAt;
  if (letter.safetyStatus === "high_risk" || letter.safetyStatus === "needs_revision") return { kind: "safety_review", label: "안전 확인이 필요해요", description: "전하기 전에 내용을 한 번 더 살펴봐주세요.", requiresAttention: true, activityAt };
  if (letter.safetyStatus === "under_review" || letter.moderationStatus === "reviewing" || letter.moderationStatus === "pending") return { kind: "moderation_review", label: "운영 확인 중이에요", description: "안전을 위해 내용을 확인하고 있어요.", requiresAttention: true, activityAt };
  if (letter.safetyStatus === "blocked" || letter.moderationStatus === "rejected") return { kind: "restricted", label: "접근이 제한된 편지예요", description: "현재 이 편지의 내용을 확인할 수 없어요.", requiresAttention: true, isRestricted: true, activityAt };
  if (userId && getOpenDeliveryIssues(userId).some((issue) => issue.letterId === letter.id && issue.kind === "letter-send")) return { kind: "send_failed", label: "발송을 마치지 못했어요", description: "작성한 내용은 이 기기에 보관되어 있어요.", requiresAttention: true, activityAt };
  if (letter.reply) return !letter.replyOpenedAt
    ? { kind: "reply_arrived_unread", label: "답장이 도착했어요", description: "당신의 편지를 읽은 사람이 마음을 전했어요.", hasUnreadReply: true, activityAt: letter.repliedAt ?? activityAt }
    : { kind: "reply_opened", label: "답장을 받았어요", description: "도착한 답장을 다시 읽을 수 있어요.", activityAt: letter.replyOpenedAt ?? letter.repliedAt ?? activityAt };
  if (letter.status === "withdrawn") return { kind: "withdrawn", label: "거둔 편지", description: "이 편지는 조용히 거두었어요.", activityAt: letter.withdrawnAt ?? activityAt };
  if (letter.status === "waiting_for_reply" || letter.status === "read") return { kind: "reply_writing", label: "답장을 준비하고 있어요", description: "어떤 말을 건넬지 천천히 생각하고 있어요.", activityAt };
  if (letter.status === "assigned") return { kind: "assigned", label: "한 사람이 편지를 맡았어요", description: "당신의 이야기를 천천히 읽고 있어요.", activityAt: letter.assignedAt ?? activityAt };
  if (letter.lastRedistributedAt) return { kind: "redistributed", label: "다시 전달되어 기다리고 있어요", description: "새로운 사람이 편지를 만날 수 있도록 다시 기다리고 있어요.", activityAt: letter.lastRedistributedAt };
  if (letter.status === "submitted") return { kind: "sent", label: "편지를 맡아두었어요", description: "당신의 이야기를 전달할 준비를 하고 있어요.", activityAt: letter.createdAt };
  return { kind: "waiting", label: "답장을 기다리고 있어요", description: "읽어줄 사람을 조용히 기다리고 있어요.", activityAt };
}

export function sortSentLettersByActivity(letters: Letter[], userId?: string) {
  return [...letters].sort((left, right) => getSentLetterDisplayStatus(right, userId).activityAt.localeCompare(getSentLetterDisplayStatus(left, userId).activityAt));
}
