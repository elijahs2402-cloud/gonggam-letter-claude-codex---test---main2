import { useMemo, useState } from "react";
import { getCurrentUserId, getLetterById } from "./letters";
import { navigateBack, navigateTo } from "./navigation";

type GratitudeRecord = { letterId: string; userId: string; content: string; createdAt: string };
const STORAGE_KEY = "gonggam_gratitude_notes_v1";

function saveGratitude(record: GratitudeRecord) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const previous: GratitudeRecord[] = raw ? JSON.parse(raw) : [];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([record, ...previous.filter((item) => !(item.letterId === record.letterId && item.userId === record.userId))].slice(0, 100)));
  } catch {
    // Prototype persistence is best-effort.
  }
}

export function GratitudeScreen({ letterId }: { letterId?: string }) {
  const letter = letterId ? getLetterById(letterId) : undefined;
  const userId = getCurrentUserId();
  const [content, setContent] = useState("읽어주고 답장을 남겨줘서 고마워요.");
  const [sent, setSent] = useState(false);
  const destination = useMemo(() => letter ? `/mailbox/my/${encodeURIComponent(letter.id)}?reply=1` : "/mailbox", [letter]);

  if (!letter?.reply || letter.senderId !== userId) {
    return <main className="mobile-prototype letter-flow-screen"><header className="flow-header"><button type="button" onClick={() => navigateBack("/mailbox")} aria-label="이전으로 돌아가기">←</button><strong>고마움 전하기</strong><span /></header><section className="flow-message"><h1>전할 답장을 찾을 수 없어요</h1><p>받은 답장을 연 뒤 다시 시도해주세요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo("/mailbox")}>편지함으로</button></section></main>;
  }

  const send = () => {
    const message = content.trim();
    if (!message) return;
    saveGratitude({ letterId: letter.id, userId, content: message, createdAt: new Date().toISOString() });
    setSent(true);
  };

  return <main className="mobile-prototype letter-flow-screen gratitude-screen"><header className="flow-header"><button type="button" onClick={() => navigateBack(destination)} aria-label="이전으로 돌아가기">←</button><strong>고마움 전하기</strong><span /></header><div className="letter-flow-scroll">{sent ? <section className="flow-complete gratitude-complete"><p className="gratitude-kicker">마음을 남겼어요</p><h1>고마운 마음을<br />조심스럽게 전했어요</h1><p>전한 마음은 이 기기에만 남아요.</p><div><button className="flow-primary-button" type="button" onClick={() => navigateTo(destination)}>받은 답장으로</button><button className="flow-text-button" type="button" onClick={() => navigateTo("/home")}>홈으로 돌아가기</button></div></section> : <section className="gratitude-compose"><p className="gratitude-kicker">받은 답장에 마음 남기기</p><h1>답장을 읽으며 든<br />고마운 마음을 전해보세요</h1><p>짧은 한 문장으로도 충분해요. 상대의 답장을 평가하거나 개인정보를 남기지 않도록 살펴봐주세요.</p><article className="gratitude-source"><span>받은 답장에서</span><blockquote>{letter.reply.content.length > 90 ? `${letter.reply.content.slice(0, 90)}…` : letter.reply.content}</blockquote></article><label htmlFor="gratitude-message">고마운 마음</label><textarea id="gratitude-message" value={content} maxLength={240} onChange={(event) => setContent(event.target.value)} rows={6} /><small>{content.length} / 240</small></section>}</div>{!sent && <div className="flow-fixed-action flow-fixed-action--split"><button className="flow-secondary-button" type="button" onClick={() => navigateTo(destination)}>나중에 하기</button><button className="flow-primary-button" type="button" disabled={!content.trim()} onClick={send}>고마움 전하기</button></div>}</main>;
}
