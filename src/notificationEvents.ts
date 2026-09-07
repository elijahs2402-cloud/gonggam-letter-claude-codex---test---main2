import { getCurrentUserId, getLetters, getMyLetters, getReplyDeadline, type Letter } from "./letters";
import { addNotification, getNotificationSettings, hasNotificationFor, type MockNotificationType } from "./notifications";

/**
 * 알림을 실제로 만들어 넣는 곳.
 *
 * 지금까지 알림 목록은 늘 비어 있었다. notifications.ts 에 저장 함수는 있었지만
 * 부르는 곳이 QA 패널뿐이라, 답장이 도착해도 알림은 생기지 않았다.
 *
 * 왜 '사건이 일어난 순간'이 아니라 '앱을 열 때 훑는' 방식인가:
 * 서버가 없으니 답장 도착·기한 임박 같은 사건을 알려줄 주체가 없다. 특히
 * '기한이 하루 남았다'는 아무 일도 일어나지 않는 시점이라, 코드에 끼워 넣을
 * 자리 자체가 없다. 그래서 알림 목록을 사건의 기록이 아니라 '지금 상태의 투영'
 * 으로 만든다 — 화면을 열 때마다 상태를 훑어, 아직 없는 알림만 채운다.
 * 화면 이동이 전부 페이지 새로고침이라 이 한 번의 호출이 모든 화면을 덮는다.
 *
 * 서버가 생기면 이 파일은 통째로 푸시 알림으로 대체된다.
 */

// 답장 기한이 이만큼 남았을 때 한 번 알린다.
const REMINDER_LEAD_MS = 24 * 60 * 60 * 1000;

const HELD_STATUSES = ["assigned", "read", "waiting_for_reply"];

export function syncDerivedNotifications(userId = getCurrentUserId()) {
  const settings = getNotificationSettings(userId);
  const now = Date.now();

  // 이미 있으면 다시 만들지 않는다. 읽음 처리한 알림도 '있는' 것으로 본다.
  const add = (type: MockNotificationType, letter: Letter, title: string, message: string, targetRoute: string) => {
    if (hasNotificationFor(userId, type, letter.id)) return;
    addNotification({ userId, type, title, message, targetType: "letter", targetId: letter.id, targetRoute });
  };

  for (const letter of getMyLetters(userId)) {
    if (settings.replyArrived && letter.reply && !letter.replyOpenedAt) {
      add("reply_arrived", letter, "기다리던 답장이 도착했어요.", "당신의 편지를 읽은 사람이 마음을 전했어요.", `/mailbox/my/${encodeURIComponent(letter.id)}`);
    }
    if (settings.letterUpdates && letter.assignedReaderId && HELD_STATUSES.includes(letter.status)) {
      add("letter_assigned", letter, "누군가가 편지를 맡았어요.", "편지함에서 지금 소식을 확인할 수 있어요.", `/mailbox/my/${encodeURIComponent(letter.id)}`);
    }
  }

  if (!settings.replyReminders) return;
  for (const letter of getLetters()) {
    if (letter.assignedReaderId !== userId || !HELD_STATUSES.includes(letter.status)) continue;
    const deadline = getReplyDeadline(letter);
    // 기한이 없거나(옛 기록), 아직 멀거나, 이미 지났으면 알리지 않는다.
    // 지난 편지를 재촉하는 것은 도움이 되지 않는다.
    if (!deadline || deadline - now > REMINDER_LEAD_MS || deadline <= now) continue;
    add("reply_reminder", letter, "맡은 편지에 답장을 전해주세요.", "준비되었을 때, 이어서 마음을 적어주세요.", `/write-reply/${encodeURIComponent(letter.id)}`);
  }
}
