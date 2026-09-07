import { getLetters, saveLetter, type Letter } from "./letters";

const SAMPLE_PREFIX = "sample-waiting-letter-";

const samples: ReadonlyArray<Omit<Letter, "createdAt" | "updatedAt">> = [
  {
    id: `${SAMPLE_PREFIX}one`, senderId: "sample-sender-dawn", anonymousName: "새벽의 편지", content: "요즘은 누구에게도 쉽게 말하지 못한 마음이 있어요. 그냥 누군가가 끝까지 읽어준다면 조금 괜찮아질 것 같아요.", status: "waiting_for_reader", retryCount: 0,
  },
  {
    id: `${SAMPLE_PREFIX}two`, senderId: "sample-sender-rain", anonymousName: "비 오는 오후", content: "오늘은 작은 일에도 마음이 자꾸 흔들렸어요. 답을 듣기보다 이 이야기를 조용히 건넬 곳이 필요했어요.", status: "waiting_for_reader", retryCount: 0,
  },
];

export function seedSampleLetters() {
  const existingIds = new Set(getLetters().map((letter) => letter.id));
  const now = new Date().toISOString();
  samples.forEach((sample, index) => {
    if (existingIds.has(sample.id)) return;
    const createdAt = new Date(Date.now() - (index + 1) * 60 * 60 * 1000).toISOString();
    saveLetter({ ...sample, createdAt, updatedAt: now });
  });
}

/** 계정 삭제 후 재가입 흐름을 새 사용자처럼 검수할 수 있도록 샘플 편지를 되돌린다. */
export function resetSampleLetters() {
  const now = new Date().toISOString();
  samples.forEach((sample, index) => {
    const createdAt = new Date(Date.now() - (index + 1) * 60 * 60 * 1000).toISOString();
    saveLetter({ ...sample, createdAt, updatedAt: now });
  });
}

export function isSampleLetter(letter: Letter) {
  return letter.id.startsWith(SAMPLE_PREFIX);
}
