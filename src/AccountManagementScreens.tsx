import { useState } from "react";
import { getMockAuthSnapshot, logoutMockAccount, deleteMockAccount } from "./mockAuth";
import { navigateBack, navigateTo } from "./navigation";

function providerName(provider?: string) { return provider === "apple" ? "Apple" : provider === "google" ? "Google" : provider === "kakao" ? "카카오" : "연결된"; }
function Header({ title, fallback = "/my-space", onBack }: { title: string; fallback?: string; onBack?: () => void }) { return <header className="flow-header"><button type="button" onClick={onBack ?? (() => navigateBack(fallback))} aria-label="이전으로 돌아가기">←</button><strong>{title}</strong><span /></header>; }
function Dialog({ title, description, primary, onPrimary, secondary, onSecondary }: { title: string; description: string; primary: string; onPrimary: () => void; secondary: string; onSecondary: () => void }) { return <div className="auth-dialog-backdrop"><section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="account-dialog-title"><p>계정 관리</p><h2 id="account-dialog-title">{title}</h2><span>{description}</span><button className="auth-primary" type="button" onClick={onPrimary}>{primary}</button><button className="auth-secondary" type="button" onClick={onSecondary}>{secondary}</button></section></div>; }

export function AccountSettingsScreen() {
  const account = getMockAuthSnapshot().account;
  const [confirmLogout, setConfirmLogout] = useState(false);
  const logout = () => { logoutMockAccount(); navigateTo("/login?notice=logged-out"); };
  const emailAddress = account?.authProvider === "apple" ? "vk7yws7m28@privaterelay.appleid.com" : "이메일 정보는 저장하지 않아요";
  const connectedAccountName = account?.authProvider === "apple" ? "애플" : providerName(account?.authProvider);

  return <main className="mobile-prototype account-settings-screen account-settings-screen--figma">
    <Header title="계정 관리" />
    <div className="my-detail-scroll account-settings-scroll--figma">
      <section className="account-settings-list--figma" aria-label="계정 관리 메뉴">
        <div className="account-settings-row account-settings-row--email">
          <span><small>이메일</small><strong>{emailAddress}</strong></span>
        </div>
        <div className="account-settings-row account-settings-row--provider">
          <span><small>연결된 계정</small><strong>{connectedAccountName}</strong></span>
          {account?.authProvider === "apple" ? <img className="account-provider-icon" src="/assets/account-provider-apple.svg" alt="Apple" /> : <i className={`account-provider-mark account-provider-mark--${account?.authProvider ?? "unknown"}`} aria-label={`${providerName(account?.authProvider)} 계정`}>{account?.authProvider === "google" ? "G" : account?.authProvider === "kakao" ? "K" : ""}</i>}
        </div>
        <button className="account-settings-row" type="button" onClick={() => setConfirmLogout(true)}>
          <span><strong>로그아웃</strong></span>
        </button>
        <button className="account-settings-row account-settings-row--delete" type="button" onClick={() => navigateTo("/account-withdrawal")}>
          <span><strong>계정 삭제</strong></span><i aria-hidden="true">›</i>
        </button>
      </section>
    </div>
    {confirmLogout && <Dialog title="로그아웃할까요?" description="다음에 로그인하면 이 기기의 편지와 간직한 문구를 계속 확인할 수 있어요." primary="로그아웃" onPrimary={logout} secondary="계속 이용하기" onSecondary={() => setConfirmLogout(false)} />}
  </main>;
}

export function LoginInformationScreen() { const account = getMockAuthSnapshot().account; const isError = new URLSearchParams(window.location.search).get("state") === "error"; return <main className="mobile-prototype account-settings-screen"><Header title="로그인 정보" fallback="/account-settings" /><div className="my-detail-scroll"><section className="subpage-heading"><h1>로그인 정보</h1><p>다른 사용자에게 공개되지 않는 로그인 방식이에요.</p></section>{isError ? <section className="account-empty-state" role="alert"><h2>로그인 정보를 불러오지 못했어요.</h2><p>잠시 후 다시 확인해주세요.</p><button className="flow-primary-button" onClick={() => navigateTo("/login-information")}>다시 시도</button></section> : <section className="account-state-card"><p>로그인 방식</p><strong>{providerName(account?.authProvider)}로 로그인했어요.</strong><span>프로토타입에서는 실제 이메일, 이름, 토큰을 조회하거나 저장하지 않아요.</span></section>}<p className="account-settings-note">로그인 방식 변경, 추가 연결, 비밀번호·이메일 수정은 지원하지 않아요.</p></div></main>; }
export function DataAndPrivacyScreen() { const items = ["편지와 답장은 계정에 연결되어 보관돼요.", "작성 중인 초안은 이 기기에 잠시 남을 수 있어요.", "신고·차단 기록은 안전한 이용을 위해 보관될 수 있어요.", "탈퇴 뒤 일반 이용 데이터는 삭제 또는 비식별화 대상이에요.", "신고·분쟁·법적 의무와 관련한 일부 기록은 별도로 보관될 수 있어요."]; return <main className="mobile-prototype account-settings-screen"><Header title="데이터 보관 안내" fallback="/account-settings" /><div className="my-detail-scroll"><section className="subpage-heading"><h1>내 데이터 보관 안내</h1><p>공감편지의 기록이 어떻게 다뤄지는지 쉽게 설명해요.</p></section><section className="account-copy-list">{items.map((item) => <p key={item}>{item}</p>)}</section><p className="account-settings-note">보관 기준에 대한 자세한 내용은 개인정보 처리방침에서 확인할 수 있어요.</p></div></main>; }

const withdrawalReasons = ["더 이상 이용하지 않아요", "잠시 쉬고 싶어요", "원하는 사용 방식과 달라요", "직접입력"];

export function AccountWithdrawalScreen() {
  const [step, setStep] = useState<"reason" | "confirm" | "processing">("reason");
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [transitionDirection, setTransitionDirection] = useState<"forward" | "back">("forward");
  const finish = () => { setStep("processing"); window.setTimeout(() => { deleteMockAccount(); navigateTo("/withdrawal-complete"); }, 900); };
  const showConfirmation = () => { setTransitionDirection("forward"); setStep("confirm"); };
  const showReasons = () => { setTransitionDirection("back"); setStep("reason"); };

  if (step === "processing") return <main className="mobile-prototype account-settings-screen"><Header title="계정 삭제" fallback="/account-settings" /><section className="account-processing" role="status"><h1>계정을 삭제하고 있어요.</h1><p>이 화면을 잠시 유지해주세요.</p></section></main>;

  if (step === "reason") return <main key="withdrawal-reason" className={`mobile-prototype account-settings-screen account-withdrawal-stage account-withdrawal-stage--${transitionDirection}`}>
    <Header title="계정 삭제" fallback="/account-settings" />
    <div className="my-detail-scroll">
      <section className="subpage-heading">
        <h1>이유를 알려주실래요?</h1>
        <p>선택하지 않아도 계정을 삭제할 수 있어요.</p>
      </section>
      <section className="withdrawal-reasons" aria-label="계정 삭제 이유">
        {withdrawalReasons.map((item) => <button key={item} type="button" className={reason === item ? "is-selected" : ""} onClick={() => setReason(item)}>{item}</button>)}
      </section>
      {reason === "직접입력" && <label className="account-textarea account-withdrawal-textarea">
        <span>삭제 이유를 입력해주세요</span>
        <textarea value={detail} onChange={(event) => setDetail(event.target.value)} maxLength={200} />
        <small>{detail.length} / 200</small>
      </label>}
      <button className="flow-primary-button" onClick={showConfirmation}>다음</button>
      <button className="flow-text-button" onClick={showConfirmation}>건너뛰기</button>
    </div>
  </main>;

  return <main key="withdrawal-confirm" className={`mobile-prototype account-settings-screen account-withdrawal-screen account-withdrawal-stage account-withdrawal-stage--${transitionDirection}`}>
    <Header title="계정 삭제" fallback="/account-settings" onBack={showReasons} />
    <div className="my-detail-scroll account-withdrawal-scroll">
      <section className="subpage-heading account-withdrawal-copy">
        <h1>계정을 삭제할까요?</h1>
        <p>계정이 삭제되면 기록된 모든 데이터가 완전히 삭제되며, 이후에는 복구할 수 없어요.</p>
      </section>
    </div>
    <div className="flow-fixed-action flow-fixed-action--single account-withdrawal-fixed-action">
      <button className="flow-primary-button is-danger-action" onClick={finish}>삭제하기</button>
    </div>
  </main>;
}
export function WithdrawalCompleteScreen() { return <main className="mobile-prototype account-settings-screen"><section className="account-processing"><h1>계정 삭제가<br />완료되었어요.</h1><p>함께한 편지들은 탈퇴와 함께 모두 사라져요.</p><button className="flow-primary-button" onClick={() => navigateTo("/intro")}>인트로로 이동하기</button></section></main>; }
export function AccountRestrictedScreen() { return <main className="mobile-prototype account-settings-screen"><Header title="계정 이용 제한" fallback="/intro" /><section className="account-processing"><h1>현재 계정의 이용이 제한되었어요.</h1><p>안전한 이용을 위해 계정 이용이 일시적으로 제한되었어요. 자세한 내용은 이용 안내에서 확인할 수 있어요.</p><button className="flow-primary-button" onClick={() => navigateTo("/intro")}>처음으로</button></section></main>; }
