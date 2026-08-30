import { useState } from "react";
import { getBlockedUsers, isUserBlocked } from "./blocks";
import { isContentHidden } from "./contentVisibility";
import { getCurrentUserId, getLetterById, getWaitingReplyLettersByUser, getReceivedRepliesByUser, markReplyOpened, type Letter } from "./letters";
import { deleteMockAccount, generateAnonymousName, getCurrentAnonymousName, getMockAuthSnapshot, logoutMockAccount, updateAnonymousName } from "./mockAuth";
import { navigateBack, navigateTo } from "./navigation";
import { isPrototypeQaMode } from "./prototypeQa";
import { getNotificationSettings } from "./notifications";
import { getReportForTarget, getReportsByUser } from "./reports";
import { getSealedExcerptsByReplyId, getSealedExcerptsByUser } from "./sealedExcerpts";

function Header({ title, fallback = "/my-space" }: { title: string; fallback?: string }) { return <header className="flow-header"><button type="button" onClick={() => navigateBack(fallback)} aria-label="이전으로 돌아가기">←</button><strong>{title}</strong><span /></header>; }
const short = (value: string, length = 52) => { const text = value.trim().replace(/\s+/g, " "); return text.length > length ? `${text.slice(0, length)}…` : text; };
const date = (value?: string) => value ? new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value)) : "도착 날짜를 알 수 없어요";

export function ReceivedRepliesScreen() {
  const userId = getCurrentUserId(); const [version, setVersion] = useState(0); const qaMode = isPrototypeQaMode(); const replies = getReceivedRepliesByUser(userId);
  const waitingLetters = getWaitingReplyLettersByUser(userId);
  return <main className="mobile-prototype received-replies-screen" data-version={version}><Header title="받은 답장" /><div className="received-replies-scroll"><section className="subpage-heading"><h1>받은 답장</h1><p>내 이야기를 읽은 사람이 전한 마음이에요.</p></section>{replies.length ? <section className="received-reply-list">{replies.map((letter) => <ReceivedReplyRow key={letter.id} letter={letter} userId={userId} onOpen={() => { markReplyOpened(letter.id, userId); setVersion((value) => value + 1); navigateTo(`/mailbox/my/${encodeURIComponent(letter.id)}`); }} />)}</section> : <section className="received-reply-empty"><h2>아직 도착한 답장이 없어요.</h2><p>{waitingLetters.length ? "보낸 편지들이 각자의 답장을 기다리고 있어요." : "마음을 남기면 한 사람이 읽고 답장을 전해요."}</p><button className="flow-primary-button" type="button" onClick={() => navigateTo(waitingLetters.length ? "/mailbox" : "/write-letter")}>{waitingLetters.length ? "내가 보낸 편지 보기" : "편지 쓰기"}</button></section>}{qaMode && <details className="prototype-test-panel"><summary>프로토타입 테스트</summary><p>데이터가 없는 상태는 새 사용자 또는 답장이 없는 계정에서 확인할 수 있어요.</p></details>}</div></main>;
}

function ReceivedReplyRow({ letter, userId, onOpen }: { letter: Letter; userId: string; onOpen: () => void }) {
  const reply = letter.reply!; const hidden = isContentHidden(userId, "reply", reply.id); const report = getReportForTarget(userId, "reply", reply.id); const blocked = isUserBlocked(userId, reply.writerId); const unavailable = reply.safetyStatus === "blocked"; const sealed = getSealedExcerptsByReplyId(reply.id, userId).length; const unread = !letter.replyOpenedAt;
  const state = unavailable ? ["이 답장은 더 이상 볼 수 없어요.", "연결된 내 편지는 계속 확인할 수 있어요."] : hidden || blocked ? ["숨긴 답장이에요.", "필요하면 다시 확인할 수 있어요."] : report ? ["신고한 답장이에요.", ({ submitted: "접수됨", reviewing: "확인 중", resolved: "처리 완료", dismissed: "검토 종료" } as const)[report.status]] : undefined;
  return <button type="button" className={`received-reply-row${unread ? " is-unread" : ""}`} onClick={onOpen}><span className="received-reply-top"><time>{date(reply.createdAt)}</time>{unread && <em>새 답장</em>}</span><strong>{reply.anonymousName ?? "익명의 누군가"}에게서 답장이 도착했어요.</strong><span>{state ? state[0] : `내 편지: ${short(letter.content)}`}</span>{state && <small>{state[1]}</small>}{sealed > 0 && <small>간직한 문구 {sealed}개</small>}</button>;
}

export function AnonymousNameSettingsScreen() {
  const [current, setCurrent] = useState(getCurrentAnonymousName());
  const [name, setName] = useState(current);
  const [confirm, setConfirm] = useState(false);
  const [failed, setFailed] = useState(false);
  const [toast, setToast] = useState("");
  const [isToastLeaving, setIsToastLeaving] = useState(false);
  const canSubmit = Boolean(name.trim());
  const suggestRandom = () => { setName(generateAnonymousName(current)); setFailed(false); };
  const save = () => {
    const finalized = name.trim();
    if (!finalized || new URLSearchParams(window.location.search).get("state") === "error") { setFailed(true); return; }
    const account = updateAnonymousName(finalized);
    if (!account) { setFailed(true); return; }
    const updatedName = account.anonymousName ?? finalized;
    setCurrent(updatedName);
    setName(updatedName);
    setConfirm(false);
    setToast("나의 이름을 바꿨어요.");
    setIsToastLeaving(false);
    window.setTimeout(() => setIsToastLeaving(true), 3000);
  };
  return <main className="mobile-prototype auth-screen nef-screen">
    {toast && <p className={`home-draft-saved-toast${isToastLeaving ? " is-leaving" : ""}`} role="status" aria-live="polite" onAnimationEnd={() => { if (isToastLeaving) setToast(""); }}>{toast}</p>}
    <header className="auth-header"><button type="button" onClick={() => navigateBack("/my-space")} aria-label="이전 화면으로 돌아가기">←</button><span>나의 이름</span><i aria-hidden="true" /></header>
    <div className="auth-scroll nef-scroll">
      <section className="auth-intro-copy nef-intro"><h1>이름 바꾸기</h1><p className="auth-helper">앞으로 보내는 편지와 답장에 이 이름이 보여요.<br />이전에 보낸 편지와 답장에는 당시의 이름이 그대로 남아요.</p></section>
      <section className="nef-field" aria-labelledby="nickname-settings-label">
        <label id="nickname-settings-label" className="nef-label" htmlFor="nickname-settings-input">이름</label>
        <div className="anonymous-name-input-wrap"><input id="nickname-settings-input" type="text" value={name} maxLength={12} onChange={(event) => { setName(event.target.value); setFailed(false); }} placeholder="이름을 입력해주세요" aria-describedby="nickname-settings-note nickname-settings-count" />{name && <button className="anonymous-name-clear" type="button" onClick={() => setName("")} aria-label="입력한 이름 지우기">×</button>}</div>
        <div className="anonymous-name-field__meta"><span id="nickname-settings-note">12자 이내로 입력해주세요.</span><span id="nickname-settings-count" aria-live="polite">{name.length} / 12</span></div>
      </section>
      <div className="nef-suggest-wrap"><button className="nef-suggest-button" type="button" onClick={suggestRandom}>이름 추천 받기</button></div>
      {failed && <div className="flow-notice"><strong>익명 이름을 바꾸지 못했어요.</strong><span>잠시 후 다시 시도해주세요.</span></div>}
    </div>
    <footer className="auth-actions nickname-settings-actions"><button className="auth-primary" type="button" disabled={!canSubmit} onClick={() => setConfirm(true)}>이 이름으로 바꾸기</button></footer>
    {confirm && <div className="draft-exit-overlay nickname-change-sheet" role="dialog" aria-modal="true" aria-labelledby="nickname-change-title"><section className="draft-exit-panel"><div className="draft-exit-copy"><h2 id="nickname-change-title">나의 이름을 바꿀까요?</h2><span>앞으로 작성하는 편지와 답장에는 새로운 이름이 보여요.<br />이전에 작성한 기록의 이름은 바뀌지 않아요.</span></div><div className="draft-exit-actions"><button className="auth-primary" type="button" onClick={save}>이름 바꾸기</button><button className="auth-secondary" type="button" onClick={() => setConfirm(false)}>취소</button></div></section></div>}
  </main>;
}

const guideContent = [
  ["공감편지는", "익명으로 마음을 담은 편지를 남기고, 한 사람이 읽어 답장을 전하는 서비스예요."],
  ["답장이 도착하기까지", "답장은 바로 도착하지 않을 수 있어요. 편지를 맡은 사람이 천천히 마음을 읽고 답장을 전해요."],
  ["편지와 답장", "여러 통의 편지를 보낼 수 있고, 각 편지는 저마다의 여정을 이어가요. 편지를 맡은 뒤 답장이 어렵다면 조용히 돌려보낼 수 있어요."],
  ["안전하게 이용하기", "불편한 편지는 언제든 신고하거나 차단할 수 있어요. 공감편지는 전문적인 상담이나 의료 서비스가 아니므로, 위급한 상황에서는 반드시 전문 기관의 도움을 먼저 요청해 주세요."],
];
const safetyContent = [
  ["개인정보", "실명, 연락처, 주소, SNS 계정은 적지 않도록 해요."], ["서로를 존중하기", "상대방을 비난하거나 모욕하는 표현은 사용할 수 없어요."], ["제한되는 내용", "성적·불법·위협 콘텐츠와 자해·타해를 부추기는 표현은 제한돼요."], ["신고와 차단", "편지와 답장은 신고될 수 있으며, 차단하면 해당 사용자와 다시 연결되지 않아요."], ["프로토타입 안내", "AI 또는 규칙 기반 안전 검토는 오판할 수 있어요. 실제 서비스에서는 중요한 제재에 운영 검토가 필요해요."],
];

export function GuideScreen({ kind }: { kind: "service" | "safety" }) { const isSafety = kind === "safety"; const content = isSafety ? safetyContent : guideContent; return <main className="mobile-prototype guide-screen"><Header title={isSafety ? "안전하게 마음을 나누기 위해" : "이용 안내"} /><div className="my-detail-scroll"><section className="subpage-heading"><h1>{isSafety ? "안전하게 마음을\n나누기 위해" : "공감편지를\n이용하는 방법"}</h1>{isSafety && <p>서로의 마음이 안전하게 머물 수 있도록 함께 지켜주세요.</p>}</section><section className="guide-sections">{content.map(([title, body]) => <article key={title}><h2>{title}</h2><p>{body}</p></article>)}</section>{!isSafety && <p className="guide-urgent-note"><span aria-hidden="true">✻</span><strong>지금 바로 도움이 필요한 상황이라면, 편지보다 가까운 사람이나 지역의 긴급 지원에 먼저 연락해주세요.</strong></p>}{isSafety && <p className="guide-todo">TODO · 실제 서비스 개발 시 운영 정책과 검토 절차를 연결해야 해요.</p>}</div></main>; }

export function PolicyScreen({ kind }: { kind: "privacy" | "terms" }) {
  const privacy = kind === "privacy";
  const title = privacy ? "개인정보 처리방침" : "서비스 이용약관";
  const privacySections = [
    ["1. 문서의 목적과 적용 범위", "이 개인정보 처리방침은 공감편지 서비스를 이용하는 과정에서 수집·이용되는 정보의 종류와 처리 방식을 안내하기 위해 마련되었습니다."],
    ["2. 서비스 이용과 사용자 보호", "공감편지는 익명 기반 서비스로, 이용자를 특정할 수 있는 정보를 필수로 요구하지 않으며 최소한의 정보만 수집합니다."],
    ["3. 정보 처리 및 보관 기준", "수집된 정보는 서비스 제공 목적으로만 이용되며, 관련 법령에 따른 보관 기간이 지나면 지체 없이 파기됩니다."],
    ["4. 문의와 변경 사항 안내", "개인정보 처리방침에 대한 문의는 앱 내 문의 경로를 통해 접수할 수 있으며, 내용이 변경되는 경우 서비스 내 공지로 안내드립니다."],
  ];
  if (privacy) return <main className="mobile-prototype policy-screen privacy-policy-screen"><Header title={title} /><div className="my-detail-scroll"><section className="privacy-policy-document" aria-label="개인정보 처리방침">{privacySections.map(([heading, body]) => <article key={heading}><h2>{heading}</h2><p>{body}</p></article>)}</section></div></main>;
  const notice = privacy ? "최종 개인정보 처리방침은 실제 서비스 개발과 법률 검토 후 연결됩니다." : "최종 이용약관은 실제 서비스 정책과 법률 검토 후 연결됩니다.";
  const sections = ["문서의 목적과 적용 범위", "서비스 이용과 사용자 보호", "정보 처리 및 보관 기준", "문의와 변경 사항 안내"];

  return <main className="mobile-prototype policy-screen">
    <Header title={title} />
    <div className="my-detail-scroll">
      <article className="policy-document">
        <header className="policy-document-heading">
          <p>공감편지의 약속</p>
          <span className="policy-document-mark" aria-hidden="true">01</span>
          <h1>{title}</h1>
          <time>적용 예정일 · 실제 서비스 준비 후 확정</time>
        </header>
        <aside className="policy-notice" aria-label="문서 안내">
          <span aria-hidden="true">✦</span>
          <div><strong>{notice}</strong><p>개발 단계에서는 이 안내 문서로 제공하며, 운영 전 실제 URL 또는 CMS 문서로 교체합니다.</p></div>
        </aside>
        <section className="policy-contents" aria-labelledby="policy-contents-title">
          <div className="policy-section-label"><span>contents</span><h2 id="policy-contents-title">문서의 차례</h2></div>
          <ol>{sections.map((section, index) => <li key={section}><span>{String(index + 1).padStart(2, "0")}</span><strong>{section}</strong><i aria-hidden="true">↗</i></li>)}</ol>
        </section>
        <p className="policy-document-footnote">궁금한 점이 있다면, 서비스가 정식으로 시작된 뒤 안내되는 문의 경로로 연락해주세요.</p>
      </article>
    </div>
  </main>;
}

export function AppInfoScreen() { return <main className="mobile-prototype app-info-screen"><Header title="공감편지 정보" /><div className="my-detail-scroll"><section className="app-info-card"><p>공감편지</p><h1>Prototype 0.1.0</h1><span>실제 운영 앱이 아닌 디자인 프로토타입 버전이에요.</span><dl><div><dt>오픈소스 라이선스</dt><dd>실제 개발 단계에서 사용 패키지 기준으로 연결합니다.</dd></div><div><dt>문의 경로</dt><dd>문의 경로는 실제 서비스 운영 준비 후 연결됩니다.</dd></div></dl><button type="button" onClick={() => navigateTo("/privacy-policy")}>개인정보 처리방침</button><button type="button" onClick={() => navigateTo("/terms-of-service")}>서비스 이용약관</button></section></div></main>; }

function providerLabel(provider?: string) {
  if (provider === "apple") return "Apple";
  if (provider === "google") return "Google";
  if (provider === "kakao") return "카카오";
  return "mock";
}

export function AccountSettingsScreen() {
  const account = getMockAuthSnapshot().account;
  const [dialog, setDialog] = useState<"logout" | "delete" | undefined>();

  const logout = () => {
    logoutMockAccount();
    navigateTo("/intro");
  };

  const removeAccount = () => {
    deleteMockAccount();
    navigateTo("/intro");
  };

  return <main className="mobile-prototype account-settings-screen"><Header title="계정 관리" /><div className="my-detail-scroll"><section className="subpage-heading"><h1>계정 관리</h1><p>이 기기에서 공감편지를 어떻게 이어갈지 정할 수 있어요.</p></section><section className="account-state-card"><p>현재 연결된 mock 계정</p><strong>{account?.anonymousName ?? "익명 사용자"}</strong><span>{providerLabel(account?.authProvider)}로 연결된 프로토타입 계정이에요.</span></section><section className="account-action-list" aria-label="계정 행동"><button type="button" onClick={() => setDialog("logout")}><span><strong>로그아웃</strong><small>다시 로그인하면 이 기기의 기록을 이어서 볼 수 있어요.</small></span><i aria-hidden="true">›</i></button><button className="is-danger" type="button" onClick={() => setDialog("delete")}><span><strong>회원 탈퇴</strong><small>프로토타입에서는 실제 서버 데이터 삭제 대신 계정 연결만 해제해요.</small></span><i aria-hidden="true">›</i></button></section><p className="account-settings-note">TODO · 실제 서비스에서는 인증 세션 종료, 계정 삭제 요청, 법정 보관 기간, 문의 경로를 별도 API와 정책 문서로 연결해야 해요.</p></div>{dialog === "logout" && <div className="auth-dialog-backdrop"><section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="logout-dialog-title"><p>계정 관리</p><h2 id="logout-dialog-title">로그아웃할까요?</h2><span>편지와 간직한 문구는 이 기기에 그대로 남아요.<br />다시 로그인하면 이어서 볼 수 있어요.</span><button className="auth-primary" type="button" onClick={logout}>로그아웃</button><button className="auth-secondary" type="button" onClick={() => setDialog(undefined)}>계속 머물기</button></section></div>}{dialog === "delete" && <div className="auth-dialog-backdrop"><section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title"><p>계정 관리</p><h2 id="delete-dialog-title">탈퇴 처리를 진행할까요?</h2><span>이 화면은 프로토타입 확인용이에요.<br />편지, 답장, 간직한 문구 데이터는 개발 검수를 위해 삭제하지 않아요.</span><button className="auth-primary" type="button" onClick={removeAccount}>탈퇴 처리하기</button><button className="auth-secondary" type="button" onClick={() => setDialog(undefined)}>취소</button></section></div>}</main>;
}

export function getMySpaceSummary(userId = getCurrentUserId()) { const excerpts = getSealedExcerptsByUser(userId); const replies = getReceivedRepliesByUser(userId); const reports = getReportsByUser(userId); return { name: getCurrentAnonymousName(), excerpts, replies, settings: getNotificationSettings(userId), blocks: getBlockedUsers(userId), reports }; }
