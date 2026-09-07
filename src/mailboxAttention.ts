import { getReplyDraftsByWriter } from "./letterDraft";
import { getLetterDraft } from "./letterDraft";
import { getOpenDeliveryIssues, type DeliveryIssue } from "./deliveryIssues";
import { getLetters, getMyLetters, getUnreadReplyLettersByUser, type Letter } from "./letters";

export type MailboxAttentionReason = "safety-review" | "unread-replies" | "delivery-failure" | "assigned-letter" | "reply-draft" | "letter-draft";

export type MailboxAttention = {
  reasons: MailboxAttentionReason[];
  unreadReplies: Letter[];
  assignedLetters: Letter[];
  replyDraftLetterIds: string[];
  hasLetterDraft: boolean;
  safetyNeedsReview: boolean;
  deliveryIssues: DeliveryIssue[];
};

export function getMailboxAttention(userId: string, hasLetterDraft = false): MailboxAttention {
  const unreadReplies = getUnreadReplyLettersByUser(userId);
  const assignedLetters = getLetters().filter((letter) => letter.assignedReaderId === userId && ["assigned", "read", "waiting_for_reply"].includes(letter.status));
  const replyDraftLetterIds = getReplyDraftsByWriter(userId)
    .filter((draft) => draft.content.trim() && assignedLetters.some((letter) => letter.id === draft.letterId))
    .map((draft) => draft.letterId);
  const allReplyDrafts = getReplyDraftsByWriter(userId);
  const safetyNeedsReview = getLetterDraft(userId)?.lastSafetyStatus === "high_risk" || allReplyDrafts.some((draft) => draft.lastSafetyStatus === "high_risk");
  const deliveryIssues = getOpenDeliveryIssues(userId);
  const reasons: MailboxAttentionReason[] = [];
  if (safetyNeedsReview) reasons.push("safety-review");
  if (unreadReplies.length) reasons.push("unread-replies");
  if (deliveryIssues.length) reasons.push("delivery-failure");
  if (assignedLetters.some((letter) => !replyDraftLetterIds.includes(letter.id))) reasons.push("assigned-letter");
  if (replyDraftLetterIds.length) reasons.push("reply-draft");
  if (hasLetterDraft) reasons.push("letter-draft");
  return { reasons, unreadReplies, assignedLetters, replyDraftLetterIds, hasLetterDraft, safetyNeedsReview, deliveryIssues };
}

/**
 * 편지함 탭에 점을 찍을지 정한다.
 *
 * 이 점은 '소식이 있다'가 아니라 '편지함에 가면 볼 것이 있다'를 뜻해야 한다.
 * 편지함 화면은 내가 보낸 편지와 내가 답장한 편지, 이 둘만 보여준다.
 * 그 목록에 나타나지 않는 사유로 점을 찍으면 눌러도 빈 화면만 나온다.
 *
 * 빠진 다섯 가지는 모두 편지함에 없는 것들이다 —
 * 편지 초안·답장 초안은 아직 보내지 않았고, 맡은 편지는 내 편지가 아니며,
 * 초안 안전검토도 초안의 일이고, 전송 실패는 편지 자체가 만들어지지 않는다.
 * 이들은 홈의 소식 카드와 각 화면이 이미 알려준다.
 */
const MAILBOX_VISIBLE_REASONS: MailboxAttentionReason[] = ["unread-replies"];

export function hasMailboxAttention(userId: string, hasLetterDraft = false) {
  return getMailboxAttention(userId, hasLetterDraft).reasons.some((reason) => MAILBOX_VISIBLE_REASONS.includes(reason));
}
