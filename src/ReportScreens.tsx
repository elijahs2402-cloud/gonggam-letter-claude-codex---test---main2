import { useState } from "react";
import { blockUser, getBlockedUsers, unblockUser } from "./blocks";
import { hideContent } from "./contentVisibility";
import { getCurrentUserId, getLetterById } from "./letters";
import { createReport, getReportForTarget, getReportsByUser, type ReportReason } from "./reports";
import { navigateBack, navigateTo } from "./navigation";

const reasons: ReadonlyArray<[ReportReason, string]> = [["abusive", "모욕적이거나 공격적인 표현"], ["sexual", "성적이거나 불쾌한 내용"], ["personal_information", "개인정보 또는 연락처 포함"], ["spam", "광고 또는 반복적인 홍보"], ["dangerous_or_illegal", "위험하거나 불법적인 내용"], ["self_harm_encouragement", "자해·타해를 부추기는 내용"], ["other", "기타"]];
function Shell({ title, children, fallback = "/waiting-letters", action, screenClassName = "" }: { title: string; children: React.ReactNode; fallback?: string; action?: React.ReactNode; screenClassName?: string }) { return <main className={`mobile-prototype letter-flow-screen ${screenClassName}`}><header className="flow-header"><button type="button" onClick={() => navigateBack(fallback)} aria-label="이전으로 돌아가기">←</button><strong>{title}</strong><span /></header><div className="letter-flow-scroll">{children}</div>{action}</main>; }

export function LetterReportScreen({ letterId }: { letterId?: string }) {
  const userId = getCurrentUserId(); const letter = letterId ? getLetterById(letterId) : undefined; const existing = letter ? getReportForTarget(userId, "letter", letter.id) : undefined;
  const [reason, setReason] = useState<ReportReason | undefined>(); const [detail, setDetail] = useState(""); const [hide, setHide] = useState(true); const [block, setBlock] = useState(false); const [state, setState] = useState<"ready" | "processing" | "failed" | "complete">("ready");
  if (!letter) return <Shell title="편지 신고"><section className="flow-message"><h1>신고할 편지를 찾을 수 없어요.</h1><button className="flow-primary-button" type="button" onClick={() => navigateTo("/waiting-letters")}>기다리는 편지로</button></section></Shell>;
  if (existing) return <Shell title="편지 신고"><section className="flow-message"><h1>이미 신고한 편지예요.</h1><p>신고한 편지는 대기 목록에 다시 나타나지 않아요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo("/safety-management")}>신고 내역 확인</button><button className="flow-text-button" type="button" onClick={() => navigateTo("/waiting-letters")}>대기 편지 목록으로</button></section></Shell>;
  function submit() { if (!reason || state === "processing") return; setState("processing"); window.setTimeout(() => { const report = createReport({ reporterId: userId, targetType: "letter", targetId: letter.id, reason, detail: detail.trim() || undefined, hiddenByReporter: hide, ...(block ? { blockedUserId: letter.senderId } : {}) }); if (!report) { setState("failed"); return; } if (hide) hideContent(userId, "letter", letter.id); if (block) blockUser(userId, letter.senderId, "letter_report"); setState("complete"); }, 580); }
  if (state === "complete") return <Shell title="신고 접수"><section className="flow-message"><h1>{block ? "신고를 접수하고 작성자를 차단했어요." : "신고를 접수했어요."}</h1><p>{hide ? "이 편지는 내 대기 목록에서 숨겨졌어요." : "신고 내역은 안전 관리에서 확인할 수 있어요."}</p><small className="flow-state-helper">신고 접수만으로 운영 결과가 바로 결정되지는 않아요.</small><button className="flow-primary-button" type="button" onClick={() => navigateTo("/waiting-letters")}>대기 편지 목록으로</button><button className="flow-text-button" type="button" onClick={() => navigateTo("/safety-management")}>신고·차단 관리 보기</button></section></Shell>;
  return <Shell title="편지 신고"><section className="report-screen report-screen--expanded"><h1>이 편지를 신고할까요?</h1><p>다른 사람을 해치거나 불편하게 만드는 내용이 있다면 알려주세요.</p><fieldset><legend>신고 사유</legend>{reasons.map(([value, label]) => <label key={value}><input type="radio" name="letter-report-reason" checked={reason === value} onChange={() => setReason(value)} />{label}</label>)}</fieldset><label className="report-detail-label">추가 설명 <span>선택</span><textarea value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="개인정보는 적지 않아도 괜찮아요." /></label><label className="report-block-choice"><input type="checkbox" checked={hide} onChange={(event) => setHide(event.target.checked)} /><span><strong>이 편지를 대기 목록에서 숨기기</strong><small>신고와 별개로 내 목록에서만 숨겨져요.</small></span></label><label className="report-block-choice"><input type="checkbox" checked={block} onChange={(event) => setBlock(event.target.checked)} /><span><strong>이 작성자도 함께 차단하기</strong><small>차단하면 앞으로 이 사용자의 편지가 나타나지 않아요.</small></span></label><p className="flow-notice">{state === "processing" ? "신고를 접수하고 있어요." : state === "failed" ? "신고를 접수하지 못했어요. 다시 시도해주세요." : ""}</p><button className="flow-primary-button" disabled={!reason || state === "processing"} type="button" onClick={submit}>{state === "failed" ? "다시 시도" : "신고 접수하기"}</button></section></Shell>;
}

export function LetterReportFigmaScreen({ letterId }: { letterId?: string }) {
  const userId = getCurrentUserId(); const letter = letterId ? getLetterById(letterId) : undefined; const existing = letter ? getReportForTarget(userId, "letter", letter.id) : undefined;
  const [reason, setReason] = useState<ReportReason | undefined>("abusive"); const [detail, setDetail] = useState(""); const [hide, setHide] = useState(true); const [block, setBlock] = useState(false); const [state, setState] = useState<"ready" | "processing" | "failed" | "complete">("ready");
  if (!letter) return <Shell title="편지 신고"><section className="flow-message"><h1>신고할 편지를 찾을 수 없어요.</h1><button className="flow-primary-button" type="button" onClick={() => navigateTo("/waiting-letters")}>기다리는 편지로</button></section></Shell>;
  if (existing) return <Shell title="편지 신고"><section className="flow-message"><h1>이미 신고한 편지예요.</h1><p>신고한 편지는 대기 목록에 다시 나타나지 않아요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo("/safety-management")}>신고 내역 확인</button><button className="flow-text-button" type="button" onClick={() => navigateTo("/home")}>홈으로 돌아가기</button></section></Shell>;
  function submit() { if (!reason || state === "processing") return; setState("processing"); window.setTimeout(() => { const report = createReport({ reporterId: userId, targetType: "letter", targetId: letter.id, reason, detail: detail.trim() || undefined, hiddenByReporter: hide, ...(block ? { blockedUserId: letter.senderId } : {}) }); if (!report) { setState("failed"); return; } if (hide) hideContent(userId, "letter", letter.id); if (block) blockUser(userId, letter.senderId, "letter_report"); setState("complete"); }, 580); }
  if (state === "complete") return <Shell title="신고 접수"><section className="flow-message"><h1>{block ? "신고를 접수하고 작성자를 차단했어요." : "신고를 접수했어요."}</h1><p>{hide ? "이 편지는 내 대기 목록에서 숨겨졌어요." : "신고 내역은 안전 관리에서 확인할 수 있어요."}</p><button className="flow-primary-button" type="button" onClick={() => navigateTo("/home")}>홈으로 돌아가기</button></section></Shell>;
  return <Shell title="편지 신고" action={<div className="flow-fixed-action flow-fixed-action--split figma-report-action"><button className="flow-secondary-button" type="button" onClick={() => navigateTo("/home")}>홈으로 돌아가기</button><button className="flow-primary-button" disabled={!reason || state === "processing"} type="button" onClick={submit}>{state === "failed" ? "다시 시도" : "신고 접수하기"}</button></div>}><section className="figma-report-screen"><header><h1>어떤 점이 불편하셨나요?</h1><p>신고하신 내용은 운영 정책에 따라 검토되며,<br />작성자에게는 알려지지 않습니다.</p></header><fieldset><legend>신고 사유 (필수)</legend>{reasons.map(([value, label]) => <label key={value} className={reason === value ? "is-selected" : ""}><input type="radio" name="figma-letter-report-reason" checked={reason === value} onChange={() => setReason(value)} /><span>{label}</span></label>)}</fieldset><section className="figma-report-detail"><label htmlFor="figma-report-detail">추가 설명 (선택)</label><textarea id="figma-report-detail" value={detail} maxLength={200} onChange={(event) => setDetail(event.target.value)} placeholder="신고 사유를 자세히 입력해 주세요." /><small>{detail.length} / 200</small></section><label className={`figma-report-setting${hide ? " is-selected" : ""}`}><input type="checkbox" checked={hide} onChange={(event) => setHide(event.target.checked)} /><span><strong>이 편지를 대기 목록에서 숨기기</strong><small>신고와 별개로 내 목록에서만 숨겨져요.</small></span></label><label className={`figma-report-setting${block ? " is-selected" : ""}`}><input type="checkbox" checked={block} onChange={(event) => setBlock(event.target.checked)} /><span><strong>이 작성자도 함께 차단하기</strong><small>앞으로 이 사용자의 편지가 나타나지 않아요.</small></span></label><p className="flow-notice" role="status">{state === "processing" ? "신고를 접수하고 있어요." : state === "failed" ? "신고를 접수하지 못했어요. 다시 시도해주세요." : ""}</p></section></Shell>;
}

export function LetterReportCompleteDemoScreen() {
  return <Shell title="신고 접수"><section className="flow-message"><h1>신고를 접수했어요.</h1><p>이 편지는 내 대기 목록에서 숨겨졌어요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo("/home")}>홈으로 돌아가기</button></section></Shell>;
}

const reasonLabels: Record<string, string> = { abusive: "모욕적 표현", sexual: "불쾌한 내용", personal_information: "개인정보", spam: "광고", dangerous_or_illegal: "위험하거나 불법적인 내용", self_harm_encouragement: "위험 조장", irrelevant_or_insincere: "성의 없는 답장", other: "기타" };

const managementDate = (value: string) => new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "numeric", day: "numeric" }).format(new Date(value));

const reportStatus = (status: string) => {
  if (status === "resolved") return "처리 완료";
  if (status === "dismissed") return "검토 종료";
  return "검토 중";
};

export function SafetyManagementScreen() {
  const userId = getCurrentUserId();
  const [refresh, setRefresh] = useState(0);
  const [confirm, setConfirm] = useState<string | undefined>();
  const blocks = getBlockedUsers(userId);
  const reports = getReportsByUser(userId);

  return <Shell title="차단 및 신고 관리" fallback="/my-space" screenClassName="safety-management-screen">
    <section className="management-screen" data-refresh={refresh}>
      <header className="management-hero">
        <h1>안전 관리</h1>
        <p>당신의 마음이 안전할 수 있도록,<br />차단 및 신고 내역을 관리할 수 있습니다.</p>
      </header>

      <div className="management-divider" aria-hidden="true" />

      <section className="management-section" aria-labelledby="blocked-users-heading">
        <header>
          <h2 id="blocked-users-heading">차단한 사용자</h2>
          <p>차단한 사용자는 나에게 편지를 보내거나 내 프로필을 볼 수 없습니다.</p>
        </header>
        {blocks.length ? <ul className="management-record-list">
          {blocks.map((item) => <li key={item.id}>
            <span className="management-record-copy"><strong>익명의 사용자</strong><small>차단일&nbsp; {managementDate(item.createdAt)}</small></span>
            <button type="button" onClick={() => setConfirm(item.blockedUserId)}>차단 해제</button>
          </li>)}
        </ul> : <p className="management-empty">차단한 사용자가 없어요.<span>지금 이 공간은 안전하게 지켜지고 있어요.</span></p>}
      </section>

      <div className="management-divider" aria-hidden="true" />

      <section className="management-section" aria-labelledby="reports-heading">
        <header>
          <h2 id="reports-heading">내가 접수한 신고</h2>
          <p>신고 내역은 운영팀에서 검토 후 조치합니다.</p>
        </header>
        {reports.length ? <ul className="management-record-list management-report-list">
          {reports.map((item) => <li key={item.id}>
            <span className="management-record-copy"><strong>{item.targetType === "reply" ? "받은 답장" : "다른 사람의 편지"}</strong><small>신고일&nbsp; {managementDate(item.createdAt)} <i /> 사유&nbsp; {reasonLabels[item.reason] ?? "기타"}</small></span>
            <em className={item.status === "resolved" ? "is-complete" : "is-reviewing"}>{reportStatus(item.status)}</em>
          </li>)}
        </ul> : <p className="management-empty management-empty--report">신고 내역이 없습니다.<span>당신의 공간이 평온하길 응원합니다.</span></p>}
      </section>

      <section className="management-support-note" aria-labelledby="management-support-title">
        <h2 id="management-support-title">지금 도움이 필요하신가요?</h2>
        <p>위험하거나 긴급한 상황이라면, 주저하지 말고 도움을 요청하세요.</p>
        <strong>긴급전화&nbsp; 112 <i /> 자살예방상담전화&nbsp; 1393 <i /> 여성긴급전화&nbsp; 1366</strong>
      </section>
    </section>
    {confirm && <div className="auth-dialog-backdrop"><section className="auth-dialog" role="dialog" aria-modal="true"><p>차단 해제</p><h2>차단을 해제할까요?</h2><span>앞으로 이 사용자의 편지가 다시 연결될 수 있어요.</span><button className="auth-primary" type="button" onClick={() => { unblockUser(userId, confirm); setConfirm(undefined); setRefresh((value) => value + 1); }}>차단 해제</button><button className="auth-secondary" type="button" onClick={() => setConfirm(undefined)}>계속 차단하기</button></section></div>}
  </Shell>;
}
