import { useState } from "react";
import { AppBottomNavigation } from "./AppBottomNavigation";
import { isUserBlocked } from "./blocks";
import { isContentHidden } from "./contentVisibility";
import { getCurrentUserId, getLetterById } from "./letters";
import { navigateBack, navigateTo } from "./navigation";
import { getReportForTarget } from "./reports";
import { deleteSealedExcerpt, getSealedExcerptsByUser, restoreSealedExcerpt, type SealedExcerpt } from "./sealedExcerpts";
import { formatDate } from "./datetime";

function date(value: string) { return formatDate(value); }

export function SavedExcerptsScreen() {
  const userId = getCurrentUserId();
  const [items, setItems] = useState(() => getSealedExcerptsByUser(userId));
  const [undo, setUndo] = useState<SealedExcerpt>();
  const refresh = () => setItems(getSealedExcerptsByUser(userId));
  const groups = [...new Map(items.map((item) => [`${item.letterId}:${item.replyId}`, items.filter((candidate) => candidate.letterId === item.letterId && candidate.replyId === item.replyId)] as const)).values()].sort((a, b) => b[0].updatedAt.localeCompare(a[0].updatedAt));
  const remove = (item: SealedExcerpt) => { if (deleteSealedExcerpt(item.id, userId)) { setUndo(item); refresh(); } };
  return <main className="mobile-prototype saved-excerpts-screen">
    <header className="flow-header"><button type="button" onClick={() => navigateBack("/my-space")} aria-label="이전으로 돌아가기">←</button><strong>간직한 문구</strong><span /></header>
    <div className="saved-excerpts-scroll">
      <section className="saved-excerpts-heading"><p>공감편지</p><h1>마음에 남은 문구를<br />모아두었어요</h1><span>답장에서 간직한 문구를 다시 살펴볼 수 있어요.</span></section>
      {groups.length ? <section className="saved-excerpts-groups">{groups.map((group) => <ExcerptGroup key={`${group[0].letterId}:${group[0].replyId}`} items={group} userId={userId} onRemove={remove} />)}</section> : <section className="saved-excerpts-empty"><h2>아직 간직한 문구가 없어요</h2><p>휴대폰에서는 문장을 길게 누르고, PC에서는 문장을 드래그해 선택해보세요.</p><small>답장마다 마음에 남은 문구를 최대 5개까지 간직할 수 있어요.</small><button className="flow-primary-button" type="button" onClick={() => navigateTo("/mailbox")}>편지함 보기</button></section>}
    </div>
    {undo && <div className="saved-excerpts-undo" role="status">간직한 문구를 지웠어요.<button type="button" onClick={() => { if (restoreSealedExcerpt(undo)) { refresh(); setUndo(undefined); } }}>되돌리기</button></div>}
    <AppBottomNavigation active="my-space" />
  </main>;
}

function ExcerptGroup({ items, userId, onRemove }: { items: SealedExcerpt[]; userId: string; onRemove: (item: SealedExcerpt) => void }) {
  const letter = getLetterById(items[0].letterId); const reply = letter?.reply;
  const restricted = Boolean(reply && (isContentHidden(userId, "reply", reply.id) || isUserBlocked(userId, reply.writerId) || getReportForTarget(userId, "reply", reply.id)));
  const available = Boolean(letter && reply && !restricted);
  return <article className="saved-excerpt-group">
    <header><div><p>익명의 누군가</p><strong>{reply ? date(reply.createdAt) : "원문을 찾을 수 없어요"}</strong></div><span>{items.length}개</span></header>
    {restricted && <p className="saved-excerpt-restricted">원문 답장은 현재 숨김 또는 안전 처리 상태예요. 간직한 문구는 계속 보관돼요.</p>}
    {!letter && <p className="saved-excerpt-restricted">원문 답장은 더 이상 찾을 수 없어요.</p>}
    <div className="saved-excerpt-quotes">{items.sort((a, b) => a.startOffset - b.startOffset).map((item) => <div key={item.id}><blockquote>“{item.text}”</blockquote><button type="button" onClick={() => onRemove(item)}>간직하지 않기</button></div>)}</div>
    <button className="flow-secondary-button" type="button" disabled={!available} onClick={() => navigateTo(`/mailbox/my/${encodeURIComponent(items[0].letterId)}?excerpt=${encodeURIComponent(items[0].id)}`)}>원래 답장 보기</button>
  </article>;
}
