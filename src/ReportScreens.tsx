import { useState } from "react";
import { blockUser, getBlockedUsers, unblockUser, type UserBlock } from "./blocks";
import { hideContent } from "./contentVisibility";
import { getCurrentUserId, getLetterById, getLetters } from "./letters";
import { createReport, getReportForTarget, getReportsByUser, type Report, type ReportReason } from "./reports";
import { navigateBack, navigateTo } from "./navigation";
import { formatDate } from "./datetime";
import { getListenEntryPath } from "./waitingLetters";

const reasons: ReadonlyArray<[ReportReason, string]> = [["abusive", "모욕적이거나 공격적인 표현"], ["sexual", "성적이거나 불쾌한 내용"], ["personal_information", "개인정보 또는 연락처 포함"], ["spam", "광고 또는 반복적인 홍보"], ["dangerous_or_illegal", "위험하거나 불법적인 내용"], ["self_harm_encouragement", "자해·타해를 부추기는 내용"], ["other", "기타"]];
function Shell({ title, children, fallback = "/home", action, screenClassName = "", showBackButton = true }: { title: string; children: React.ReactNode; fallback?: string; action?: React.ReactNode; screenClassName?: string; showBackButton?: boolean }) { return <main className={`mobile-prototype letter-flow-screen ${screenClassName}`}><header className="flow-header">{showBackButton ? <button type="button" onClick={() => navigateBack(fallback)} aria-label="이전으로 돌아가기">←</button> : <span aria-hidden="true" />}<strong>{title}</strong><span /></header><div className="letter-flow-scroll">{children}</div>{action}</main>; }

export function LetterReportScreen({ letterId }: { letterId?: string }) {
  const userId = getCurrentUserId(); const letter = letterId ? getLetterById(letterId) : undefined; const existing = letter ? getReportForTarget(userId, "letter", letter.id) : undefined;
  const [reason, setReason] = useState<ReportReason | undefined>(); const [detail, setDetail] = useState(""); const [hide, setHide] = useState(true); const [block, setBlock] = useState(false); const [state, setState] = useState<"ready" | "processing" | "failed" | "complete">("ready");
  if (!letter) return <Shell title="편지 신고"><section className="flow-message"><h1>신고할 편지를 찾을 수 없어요</h1><button className="flow-primary-button" type="button" onClick={() => navigateTo(getListenEntryPath(getCurrentUserId()))}>다른 편지 만나기</button></section></Shell>;
  if (existing) return <Shell title="편지 신고"><section className="flow-message"><h1>이미 신고한 편지예요</h1><p>신고한 편지는 대기 목록에 다시 나타나지 않아요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo("/safety-management")}>신고 내역 확인</button><button className="flow-text-button" type="button" onClick={() => navigateTo(getListenEntryPath(getCurrentUserId()))}>다른 편지 만나기</button></section></Shell>;
  function submit() { if (!reason || state === "processing") return; setState("processing"); window.setTimeout(() => { const report = createReport({ reporterId: userId, targetType: "letter", targetId: letter.id, reason, detail: detail.trim() || undefined, hiddenByReporter: hide, ...(block ? { blockedUserId: letter.senderId } : {}) }); if (!report) { setState("failed"); return; } if (hide) hideContent(userId, "letter", letter.id); if (block) blockUser(userId, letter.senderId, "letter_report"); setState("complete"); }, 580); }
  if (state === "complete") return <Shell title="신고 접수"><section className="flow-message"><h1>{block ? "신고를 접수하고 작성자를 차단했어요" : "신고를 받았어요"}</h1><p>{hide ? "이 편지는 내 대기 목록에서 숨겨졌어요." : "신고 내역은 안전 관리에서 확인할 수 있어요."}</p><small className="flow-state-helper">신고 접수만으로 운영 결과가 바로 결정되지는 않아요.</small><button className="flow-primary-button" type="button" onClick={() => navigateTo(getListenEntryPath(getCurrentUserId()))}>다른 편지 만나기</button><button className="flow-text-button" type="button" onClick={() => navigateTo("/safety-management")}>신고·차단 관리 보기</button></section></Shell>;
  return <Shell title="편지 신고"><section className="report-screen report-screen--expanded"><h1>이 편지를 신고할까요?</h1><p>다른 사람을 해치거나 불편하게 만드는 내용이 있다면 알려주세요.</p><fieldset><legend>신고 사유</legend>{reasons.map(([value, label]) => <label key={value}><input type="radio" name="letter-report-reason" checked={reason === value} onChange={() => setReason(value)} />{label}</label>)}</fieldset><label className="report-detail-label">추가 설명 <span>선택</span><textarea value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="개인정보는 적지 않아도 괜찮아요." /></label><label className="report-block-choice"><input type="checkbox" checked={hide} onChange={(event) => setHide(event.target.checked)} /><span><strong>이 편지를 대기 목록에서 숨기기</strong><small>신고와 별개로 내 목록에서만 숨겨져요.</small></span></label><label className="report-block-choice"><input type="checkbox" checked={block} onChange={(event) => setBlock(event.target.checked)} /><span><strong>이 작성자도 함께 차단하기</strong><small>차단하면 앞으로 이 사용자의 편지가 나타나지 않아요.</small></span></label><p className="flow-notice">{state === "processing" ? "신고를 접수하고 있어요." : state === "failed" ? "신고를 접수하지 못했어요. 다시 시도해주세요." : ""}</p><button className="flow-primary-button" disabled={!reason || state === "processing"} type="button" onClick={submit}>{state === "failed" ? "다시 시도" : "신고 접수하기"}</button></section></Shell>;
}

export function LetterReportFigmaScreen({ letterId }: { letterId?: string }) {
  const userId = getCurrentUserId(); const letter = letterId ? getLetterById(letterId) : undefined; const existing = letter ? getReportForTarget(userId, "letter", letter.id) : undefined;
  const [reason, setReason] = useState<ReportReason | undefined>("abusive"); const [detail, setDetail] = useState(""); const hide = true; const [block, setBlock] = useState(false); const [state, setState] = useState<"ready" | "processing" | "failed" | "complete">("ready");
  if (!letter) return <Shell title="편지 신고"><section className="flow-message"><h1>신고할 편지를 찾을 수 없어요</h1><button className="flow-primary-button" type="button" onClick={() => navigateTo(getListenEntryPath(getCurrentUserId()))}>다른 편지 만나기</button></section></Shell>;
  if (existing) return <Shell title="편지 신고" showBackButton={false}><section className="flow-message"><h1>이미 신고한 편지예요</h1><p>신고한 편지는 대기 목록에 다시 나타나지 않아요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo("/safety-management")}>신고 내역 확인</button><button className="flow-text-button" type="button" onClick={() => navigateTo("/home")}>홈으로 돌아가기</button></section></Shell>;
  function submit() { if (!reason || state === "processing") return; setState("processing"); window.setTimeout(() => { const report = createReport({ reporterId: userId, targetType: "letter", targetId: letter.id, reason, detail: detail.trim() || undefined, hiddenByReporter: hide, ...(block ? { blockedUserId: letter.senderId } : {}) }); if (!report) { setState("failed"); return; } if (hide) hideContent(userId, "letter", letter.id); if (block) blockUser(userId, letter.senderId, "letter_report"); navigateTo("/report-letter-complete-demo"); }, 580); }
  if (state === "complete") return <Shell title="신고 접수"><section className="flow-message"><h1>{block ? "신고를 접수하고 작성자를 차단했어요" : "신고를 받았어요"}</h1><p>{hide ? "이 편지는 내 대기 목록에서 숨겨졌어요." : "신고 내역은 안전 관리에서 확인할 수 있어요."}</p><button className="flow-primary-button" type="button" onClick={() => navigateTo("/home")}>홈으로 돌아가기</button></section></Shell>;
  return <Shell title="편지 신고" action={<div className="flow-fixed-action flow-fixed-action--split figma-report-action"><button className="flow-secondary-button" type="button" onClick={() => navigateTo("/home")}>홈으로</button><button className="flow-primary-button" disabled={!reason || state === "processing"} type="button" onClick={submit}>{state === "failed" ? "다시 시도" : "신고 접수하기"}</button></div>}><section className="figma-report-screen"><header><h1>어떤 점이 불편하셨나요?</h1><p>알려주신 내용은 운영 정책에 따라 살펴보고,<br />작성자에게는 알리지 않아요.</p></header><fieldset><legend>신고 사유 (필수)</legend>{reasons.map(([value, label]) => <label key={value} className={reason === value ? "is-selected" : ""}><input type="radio" name="figma-letter-report-reason" checked={reason === value} onChange={() => setReason(value)} /><span>{label}</span></label>)}</fieldset><section className="figma-report-detail"><label htmlFor="figma-report-detail">추가 설명 (선택)</label><textarea id="figma-report-detail" value={detail} maxLength={200} onChange={(event) => setDetail(event.target.value)} placeholder="신고 사유를 자세히 입력해 주세요." /><small>{detail.length} / 200</small></section><label className={`figma-report-setting${block ? " is-selected" : ""}`}><input type="checkbox" checked={block} onChange={(event) => setBlock(event.target.checked)} /><span><strong>신고와 작성자 차단 함께하기</strong><small>앞으로 이 사용자의 편지가 나타나지 않아요.</small></span></label><p className="flow-notice" role="status">{state === "processing" ? "신고를 접수하고 있어요." : state === "failed" ? "신고를 접수하지 못했어요. 다시 시도해주세요." : ""}</p></section></Shell>;
}

export function LetterReportCompleteDemoScreen() {
  return <Shell title="신고 접수" showBackButton={false}><section className="flow-message"><h1>신고가 접수되었어요</h1><p>이 편지는 대기 목록에서 숨겨졌어요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo("/safety-management")}>신고 내역 확인</button><button className="flow-text-button" type="button" onClick={() => navigateTo("/home")}>홈으로 돌아가기</button></section></Shell>;
}

const reasonLabels: Record<string, string> = { abusive: "모욕적 표현", sexual: "불쾌한 내용", personal_information: "개인정보", spam: "광고", dangerous_or_illegal: "위험하거나 불법적인 내용", self_harm_encouragement: "위험 조장", irrelevant_or_insincere: "성의 없는 답장", other: "기타" };

const managementDate = (value: string) => formatDate(value);

const nicknameOrFallback = (nickname?: string) => nickname?.trim() || "이름을 확인할 수 없는 사용자";

function reportedNickname(report: Report) {
  if (report.targetType === "letter") return nicknameOrFallback(getLetterById(report.targetId)?.anonymousName);
  if (report.targetType === "reply") {
    const letter = getLetters(true).find((candidate) => candidate.reply?.id === report.targetId);
    return nicknameOrFallback(letter?.reply?.anonymousName);
  }
  return nicknameOrFallback();
}

function blockedNickname(blockedUserId: string, reports: Report[]) {
  const report = reports.find((item) => item.blockedUserId === blockedUserId);
  if (report) return reportedNickname(report);
  const letter = getLetters(true).find((candidate) => candidate.senderId === blockedUserId);
  return nicknameOrFallback(letter?.anonymousName);
}

// 차단 목록은 익명이라 항목이 전부 "익명의 사용자"로 똑같아 보인다.
// 어떤 경위로 차단했는지를 함께 보여 줘야 서로 구분된다.
const blockSource = (source: string) => {
  if (source === "letter_report") return "편지 신고로 차단";
  if (source === "reply_report") return "답장 신고로 차단";
  return "직접 차단";
};

// "검토 종료"(dismissed)는 끝난 상태인데 "검토 중"과 같은 색이라
// 아직 처리를 기다리는 것처럼 보였다. 끝났지만 조치는 없었다는 뜻이
// 색으로 전달되도록 완료(딥플럼)와도 구분해 회색으로 둔다.
const reportStatusTone = (status: string) => {
  if (status === "resolved") return "is-complete";
  if (status === "dismissed") return "is-closed";
  return "is-reviewing";
};

const reportStatus = (status: string) => {
  if (status === "resolved") return "처리 완료";
  if (status === "dismissed") return "검토 종료";
  return "검토 중";
};

export function SafetyManagementScreen({ stageClassName = "" }: { stageClassName?: string } = {}) {
  const userId = getCurrentUserId();
  const [refresh, setRefresh] = useState(0);
  const [confirm, setConfirm] = useState<string | undefined>();
  const isContentPreview = new URLSearchParams(window.location.search).get("preview") === "content";
  const previewBlocks: UserBlock[] = [{ id: "preview-block-1", blockerUserId: userId, blockedUserId: "preview-blocked-user", source: "letter_report", createdAt: "2026-09-07T09:00:00.000Z" }];
  const previewReports: Report[] = [
    { id: "preview-report-1", reporterId: userId, targetType: "letter", targetId: "preview-letter", reason: "abusive", createdAt: "2026-09-07T09:00:00.000Z", status: "reviewing", hiddenByReporter: true, blockedUserId: "preview-blocked-user" },
    { id: "preview-report-2", reporterId: userId, targetType: "reply", targetId: "preview-reply", reason: "sexual", createdAt: "2026-09-05T09:00:00.000Z", status: "resolved", hiddenByReporter: false },
  ];
  const blocks = isContentPreview ? previewBlocks : getBlockedUsers(userId);
  const reports = isContentPreview ? previewReports : getReportsByUser(userId);
  const previewNames: Record<string, string> = { "preview-block-1": "달빛산책", "preview-report-1": "달빛산책", "preview-report-2": "고요한 구름" };

  return <Shell title="차단 및 신고 관리" fallback="/my-space" screenClassName={`safety-management-screen${stageClassName ? ` ${stageClassName}` : ""}`}>
    <section className="management-screen" data-refresh={refresh}>
      {/* 상단 안내 문구를 뺐다. 헤더 타이틀과 각 섹션 설명이
          이미 무엇을 하는 화면인지 말하고 있어 한 번 더 설명할 필요가 없었다. */}
      <section className="management-section" aria-labelledby="blocked-users-heading">
        <header>
          <h2 id="blocked-users-heading">차단한 사용자</h2>
          <p>차단한 사용자는 나에게 편지를 보내거나 내 프로필을 볼 수 없어요.</p>
        </header>
        {blocks.length ? <ul className="management-record-list">
          {blocks.map((item) => <li key={item.id}>
            <span className="management-record-copy"><strong>{previewNames[item.id] ?? blockedNickname(item.blockedUserId, reports)}</strong><small>{blockSource(item.source)} <i /> {managementDate(item.createdAt)}</small></span>
            <button type="button" onClick={() => setConfirm(item.blockedUserId)}>차단 해제</button>
          </li>)}
        </ul> : <p className="management-empty">차단한 사용자가 없어요.</p>}
      </section>

      <section className="management-section" aria-labelledby="reports-heading">
        <header>
          <h2 id="reports-heading">내가 접수한 신고</h2>
          <p>신고 내역은 운영팀에서 검토 후 조치합니다.</p>
        </header>
        {reports.length ? <ul className="management-record-list management-report-list">
          {reports.map((item) => <li key={item.id}>
            <span className="management-record-copy"><strong>{previewNames[item.id] ?? reportedNickname(item)}</strong><small>{reasonLabels[item.reason] ?? "기타"} <i /> {managementDate(item.createdAt)}</small></span>
            <em className={reportStatusTone(item.status)}>{reportStatus(item.status)}</em>
          </li>)}
        </ul> : <p className="management-empty">신고 내역이 없어요.</p>}
      </section>
    </section>
    {/* 가운데 다이얼로그는 스크롤 컨테이너 안에 absolute 로 놓여 있어,
        목록을 내린 뒤 누르면 화면 밖에 그려져 아무것도 보이지 않았다.
        앱의 다른 팝업과 같은 하단 시트(fixed)로 바꿔 함께 해결한다. */}
    {confirm && <div className="draft-exit-overlay" role="dialog" aria-modal="true" aria-labelledby="unblock-dialog-title">
      <section className="draft-exit-panel">
        <div className="draft-exit-copy">
          <h2 id="unblock-dialog-title">차단을 해제할까요?</h2>
          <p>앞으로 이 사용자의 편지가 다시 연결될 수 있어요.</p>
        </div>
        <div className="draft-exit-actions">
          <button className="flow-primary-button" type="button" onClick={() => { unblockUser(userId, confirm); setConfirm(undefined); setRefresh((value) => value + 1); }}>차단 해제</button>
          <button className="flow-text-button" type="button" onClick={() => setConfirm(undefined)}>계속 차단하기</button>
        </div>
      </section>
    </div>}
  </Shell>;
}
