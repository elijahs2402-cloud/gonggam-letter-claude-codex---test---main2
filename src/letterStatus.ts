import type { Letter, LetterStatus } from "./letters";

const copy: Record<LetterStatus, { label: string; description: string }> = {
  submitted: { label: "편지를 맡아두었어요", description: "당신의 이야기를 조심스럽게 전달할 준비를 하고 있어요." },
  waiting_for_reader: { label: "읽어줄 사람을 기다리고 있어요", description: "당신의 이야기를 읽어줄 사람을 기다리고 있어요." },
  assigned: { label: "한 사람이 편지를 맡았어요", description: "당신의 이야기를 천천히 읽고 있어요." },
  read: { label: "답장을 준비하고 있어요", description: "기존 읽기 기록은 여정에 별도로 표시하지 않아요." },
  waiting_for_reply: { label: "답장을 준비하고 있어요", description: "어떤 말을 건넬지 천천히 생각하고 있어요." },
  replied: { label: "답장이 도착했어요", description: "당신의 이야기를 읽은 사람이 답장을 남겼어요." },
  withdrawn: { label: "거둔 편지", description: "이 편지는 조용히 거두었어요." },
};

export function getLetterStatusLabel(letter: Letter) { return copy[letter.status].label; }
export function getLetterStatusDescription(letter: Letter) { return copy[letter.status].description; }

export function getLetterStatusDate(letter: Letter) {
  if (letter.status === "assigned") return letter.assignedAt;
  if (letter.status === "read") return letter.readAt;
  if (letter.status === "waiting_for_reply") return letter.waitingForReplyAt ?? letter.readAt;
  if (letter.status === "replied") return letter.repliedAt;
  if (letter.status === "withdrawn") return letter.withdrawnAt;
  return letter.lastStatusChangedAt ?? letter.createdAt;
}

