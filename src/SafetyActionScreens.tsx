import { useEffect, useRef, useState } from "react";
import { blockUser } from "./blocks";
import { deleteReplyDraft, getReplyDraft } from "./letterDraft";
import { getCurrentUserId, getLetterById, returnLetterToWaiting } from "./letters";
import { getLetterReturn, saveLetterReturn } from "./letterReturns";
import { getCurrentAppSearchParams, navigateBack, navigateTo } from "./navigation";
import { createReport, getReportForTarget, type ReportReason } from "./reports";
import { RETURNED_LETTER_BODY, RETURNED_LETTER_TITLE } from "./copy";
import { getListenEntryPath } from "./waitingLetters";
import { ListenEntryLoadingState } from "./ListenEntryVariants";

// action 은 스크롤 밖 하단 고정 바다. 편지 신고 최종본(ReportScreens.tsx)의 Shell 과 같은 형태로 맞췄다.
function Shell({ title, children, fallback, action, showBackButton = true }: { title: string; children: React.ReactNode; fallback: string; action?: React.ReactNode; showBackButton?: boolean }) { return <main className="mobile-prototype letter-flow-screen"><header className="flow-header">{showBackButton ? <button type="button" onClick={() => navigateBack(fallback)} aria-label="이전으로 돌아가기">←</button> : <span aria-hidden="true" />}<strong>{title}</strong><span /></header><div className="letter-flow-scroll">{children}</div>{action}</main>; }
const reportReasons: ReadonlyArray<[ReportReason, string]> = [["abusive", "모욕적이거나 공격적인 표현"], ["sexual", "성적이거나 불쾌한 내용"], ["personal_information", "개인정보 또는 연락처 포함"], ["spam", "광고 또는 반복적인 홍보"], ["dangerous_or_illegal", "위험하거나 불법적인 내용"], ["self_harm_encouragement", "자해·타해를 부추기는 내용"], ["other", "기타"]];

export function ReplyReportScreen({ letterId, complete = false }: { letterId?: string; complete?: boolean }) {
  const userId = getCurrentUserId(); const letter = letterId ? getLetterById(letterId) : undefined; const reply = letter?.reply;
  const existing = reply ? getReportForTarget(userId, "reply", reply.id) : undefined;
  const [reason, setReason] = useState<ReportReason | undefined>(); const [detail, setDetail] = useState(""); const [withBlock, setWithBlock] = useState(false); const [status, setStatus] = useState<"ready" | "submitting" | "failed" | "complete">(complete || existing ? "complete" : "ready");
  if (!letter || !reply || letter.senderId !== userId) return <Shell title="편지 신고" fallback="/mailbox"><section className="flow-message"><h1>신고할 편지를 찾을 수 없어요</h1><button className="flow-primary-button" type="button" onClick={() => navigateTo("/mailbox")}>편지함으로</button></section></Shell>;
  const returnTo = `/mailbox/my/${encodeURIComponent(letter.id)}`;
  if (existing && !complete) return <Shell title="편지 신고" fallback={returnTo}><section className="flow-message"><h1>이미 신고한 편지예요</h1><p>신고 내역은 차단 및 신고 관리에서 확인할 수 있어요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo("/safety-management")}>신고 내역 확인</button><button className="flow-text-button" type="button" onClick={() => navigateTo("/home")}>홈으로</button></section></Shell>;
  function submit() { if (!reason || status === "submitting") return; setStatus("submitting"); window.setTimeout(() => { const report = createReport({ reporterId: userId, targetType: "reply", targetId: reply.id, reason, detail: detail.trim() || undefined, hiddenByReporter: false, ...(withBlock ? { blockedUserId: reply.writerId } : {}) }); if (!report) { setStatus("failed"); return; } if (withBlock) blockUser(userId, reply.writerId, "reply_report"); setStatus("complete"); }, 640); }
  if (status === "complete") return <Shell title="신고 접수" fallback={returnTo}><section className="flow-message"><h1>{withBlock ? "신고를 접수하고 작성자를 차단했어요" : "신고를 접수했어요"}</h1><p>신고 내역은 차단 및 신고 관리에서 확인할 수 있어요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo("/safety-management")}>신고 내역 확인</button><button className="flow-text-button" type="button" onClick={() => navigateTo("/home")}>홈으로</button></section></Shell>;
  // 화면은 편지 신고 최종본(/report-letter/:id, LetterReportFigmaScreen)과 같은 figma-report-* 마크업을 쓴다.
  // 신고 대상은 답장(reply.id), 차단 대상은 답장 작성자(reply.writerId) 그대로다 — 동작은 바꾸지 않았다.
  return <Shell title="편지 신고" fallback={returnTo} action={<div className="flow-fixed-action flow-fixed-action--single figma-report-action"><button className="flow-primary-button" disabled={!reason || status === "submitting"} type="button" onClick={submit}>{status === "failed" ? "다시 시도" : "신고 접수하기"}</button></div>}><section className="figma-report-screen"><header><h1>어떤 점이 불편하셨나요?</h1><p>알려주신 내용은 운영 정책에 따라 살펴보고,<br />작성자에게는 알리지 않아요.</p></header><fieldset><legend>신고 사유 (필수)</legend>{reportReasons.map(([value, label]) => <label key={value} className={reason === value ? "is-selected" : ""}><input type="radio" name="reply-report-reason" checked={reason === value} onChange={() => setReason(value)} /><span>{label}</span></label>)}</fieldset><section className="figma-report-detail"><label htmlFor="figma-reply-report-detail">추가 설명 (선택)</label><textarea id="figma-reply-report-detail" value={detail} maxLength={200} onChange={(event) => setDetail(event.target.value)} placeholder="신고 사유를 자세히 입력해 주세요." /><small>{detail.length} / 200</small></section><label className={`figma-report-setting${withBlock ? " is-selected" : ""}`}><input type="checkbox" checked={withBlock} onChange={(event) => setWithBlock(event.target.checked)} /><span><strong>신고와 작성자 차단 함께하기</strong><small>앞으로 이 사용자의 편지가 나타나지 않아요.</small></span></label><p className="flow-notice" role="status">{status === "submitting" ? "신고를 접수하고 있어요." : status === "failed" ? "신고를 접수하지 못했어요. 다시 시도해주세요." : ""}</p></section></Shell>;
}


// 두고 갈지 묻는 시트. 편지 읽기 화면 위에 그대로 얹히도록 화면이 아니라 컴포넌트로 뺐다.
// 뒤에 읽던 편지가 남아 있어야 '이 편지를' 이라는 말이 성립한다.
// 형태·모션은 앱에 이미 있는 임시저장 확인 시트(.draft-exit-*)를 그대로 쓴다.
export function LetterReturnSheet({ onCancel, onConfirm }: { hasDraft: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <div className="draft-exit-overlay return-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="return-confirm-title">
    <section className="draft-exit-panel">
      <div className="draft-exit-copy">
        <h2 id="return-confirm-title">이 편지를 받지 않겠어요?</h2>
        <p>받지 않은 편지는 다시 확인할 수 없어요.</p>
      </div>
      <div className="draft-exit-actions">
        <button className="flow-primary-button" type="button" onClick={onCancel}>편지로 돌아가기</button>
        <button className="flow-secondary-button" type="button" onClick={onConfirm}>받지 않기</button>
      </div>
    </section>
  </div>;
}

export function LetterReturnScreen({ letterId }: { letterId?: string }) {
  const readerId = getCurrentUserId(); const letter = letterId ? getLetterById(letterId) : undefined; const draft = letterId ? getReplyDraft(letterId, readerId) : undefined;
  const hasDraft = Boolean(draft?.content.trim());
  // 편지 읽기 화면의 시트에서 이미 확인을 받고 왔다면(?start=1) 곧장 처리부터 시작한다.
  // 주소로 직접 들어온 경우에는 확인 시트부터 보여준다.
  const startNow = getCurrentAppSearchParams().get("start") === "1";
  // preview=loading 은 화면 검수용이다. 실제 편지 상태·초안·반환 기록은 바꾸지 않는다.
  const isLoadingPreview = getCurrentAppSearchParams().get("preview") === "loading";
  const isCompletePreview = getCurrentAppSearchParams().get("preview") === "complete";
  const [phase, setPhase] = useState<"intro" | "processing" | "failed" | "complete">(isCompletePreview ? "complete" : startNow || isLoadingPreview ? "processing" : "intro");
  // 처리는 훅 규칙 때문에 가드보다 위에 정의해 둔다 — 아래 가드들이 먼저 return 해버리면
  // useEffect 가 조건부로 호출되어 버린다.
  const runReturn = () => {
    const current = letterId ? getLetterById(letterId) : undefined;
    if (!current) { setPhase("failed"); return; }
    setPhase("processing");
    window.setTimeout(() => {
      const latest = getLetterById(current.id);
      const returned = latest ? returnLetterToWaiting(current.id, readerId) : undefined;
      if (!returned) { setPhase("failed"); return; }
      const now = new Date().toISOString();
      saveLetterReturn({ id: `return-${crypto.randomUUID?.() ?? Date.now()}`, letterId: current.id, readerId, hadReplyDraft: hasDraft, replyDraftDeleted: hasDraft, status: "completed", createdAt: now, completedAt: now });
      if (hasDraft) deleteReplyDraft(current.id, readerId);
      setPhase("complete");
    }, 1400);
  };
  // StrictMode 는 개발 중 효과를 두 번 실행한다. 그대로 두면 두 번째 실행이
  // 이미 두고 온 편지를 다시 두려다 실패해 '이미 두고 온 편지예요'가 떴다.
  // 한 번만 돌게 문을 걸어둔다.
  const startedRef = useRef(false);
  useEffect(() => { if (!startNow || isLoadingPreview || isCompletePreview || startedRef.current) return; startedRef.current = true; runReturn(); }, []);
  // 이 분기는 반드시 아래 가드보다 위에 있어야 한다.
  // runReturn 이 saveLetterReturn 까지 마치면 getLetterReturn 이 기록을 돌려주어
  // 가드가 먼저 걸리고, 완료 화면은 한 번도 보이지 않았다('이미 두고 온 편지예요'가 대신 떴다).
  if (phase === "complete") return <Shell title="편지 두고 가기" fallback="/home" showBackButton={false}><section className="flow-message"><h1>편지를 다시 놓아두었어요</h1><p>다른 누군가가 이 마음을 만나게 될 거예요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo(getListenEntryPath(getCurrentUserId()))}>다른 편지 만나기</button><button className="flow-text-button" type="button" onClick={() => navigateTo("/home")}>홈으로 돌아가기</button></section></Shell>;
  // 완료 직전의 사이 화면.
  // 앱의 표준 로딩 표현(편지 만나기에서 쓰던 것)을 그대로 빌려 둘이 같은 모양으로 읽힌다.
  // 직접 짜지 않는 이유: 점은 .listen-entry-loading-mark 안에서만 8px 로 커지고
  // 그 밖에서는 버튼 속 크기 그대로라 전체 화면에서 너무 작게 나온다.
  if (phase === "processing") return <Shell title="편지 두고 가기" fallback="/home" showBackButton={false}><ListenEntryLoadingState message="편지를 제자리에 두고 있어요" /></Shell>;
  if (!letter || letter.assignedReaderId !== readerId || !["assigned", "read", "waiting_for_reply"].includes(letter.status) || getLetterReturn(letter.id, readerId)) return <Shell title="편지 두고 가기" fallback="/home"><section className="flow-message"><h1>{RETURNED_LETTER_TITLE}</h1><p>{RETURNED_LETTER_BODY}</p><button className="flow-primary-button" type="button" onClick={() => navigateTo(getListenEntryPath(getCurrentUserId()))}>다른 편지 만나기</button><button className="flow-text-button" type="button" onClick={() => navigateTo("/home")}>홈으로 돌아가기</button></section></Shell>;
  if (phase === "failed") return <Shell title="편지 두고 가기" fallback={`/write-reply/${letter.id}`}><section className="flow-message"><h1>편지를 두고 오지 못했어요</h1><p>잠시 후 다시 시도해주세요.</p><button className="flow-primary-button" type="button" onClick={runReturn}>다시 시도</button><button className="flow-secondary-button" type="button" onClick={() => navigateTo(`/write-reply/${letter.id}`)}>답장으로 돌아가기</button><button className="flow-text-button" type="button" onClick={() => navigateTo("/home")}>홈으로 이동</button></section></Shell>;
  return <LetterReturnSheet hasDraft={hasDraft} onCancel={() => navigateTo(`/write-reply/${letter.id}`)} onConfirm={runReturn} />;
}
