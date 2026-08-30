import { useState } from "react";
import { getLetterById } from "./letters";
import { getNotificationSettings, getNotifications, markAllNotificationsRead, markNotificationRead, seedNotificationTestState, updateNotificationSettings, type MockNotification } from "./notifications";
import { navigateBack, navigateTo } from "./navigation";
import { isPrototypeQaMode } from "./prototypeQa";

function Header({ title, fallback }: { title: string; fallback: string }) { return <header className="flow-header"><button type="button" onClick={() => navigateBack(fallback)} aria-label="이전으로 돌아가기">←</button><strong>{title}</strong><span aria-hidden="true" /></header>; }
function timeText(value: string) { const diff = Math.max(0, Date.now() - new Date(value).getTime()); const minutes = Math.floor(diff / 60_000); if (minutes < 1) return "방금"; if (minutes < 60) return `${minutes}분 전`; if (minutes < 1440) return `${Math.floor(minutes / 60)}시간 전`; return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(new Date(value)); }
function targetUnavailable(notice: MockNotification) {
  if (!notice.targetRoute) return false;
  const routeTarget = notice.targetRoute.match(/^\/(?:reply-arrived|letter-journey|letter-delay|write-reply|mailbox\/my)\/([^/?]+)/)?.[1];
  const targetId = notice.targetId ?? routeTarget;
  return Boolean(targetId && !getLetterById(targetId));
}

export function NotificationsScreen() {
  const [version, setVersion] = useState(0);
  const [noticeDetail, setNoticeDetail] = useState<MockNotification | undefined>();
  const notices = getNotifications();
  const unread = notices.filter((item) => !item.isRead).length;
  const refresh = () => setVersion((value) => value + 1);
  const qaMode = isPrototypeQaMode();
  const open = (notice: MockNotification) => {
    markNotificationRead(notice.id); refresh();
    if (!notice.targetRoute || notice.type === "service_notice") { setNoticeDetail(notice); return; }
    if (targetUnavailable(notice)) { setNoticeDetail({ ...notice, title: "연결된 내용을 찾을 수 없어요.", message: "이 알림과 연결된 내용을 더 이상 볼 수 없어요." }); return; }
    navigateTo(notice.targetRoute);
  };
  return <main className="mobile-prototype notification-screen" data-version={version}>
    <Header title="알림" fallback="/home" />
    <div className="notification-scroll">
      {unread > 0 && <button className="notification-read-all" type="button" onClick={() => { markAllNotificationsRead(); refresh(); }}>모두 읽음</button>}
      {notices.length ? <section className="notification-list" aria-label="알림 목록">{notices.map((notice) => <button key={notice.id} className={`notification-row${notice.isRead ? "" : " is-unread"}`} type="button" onClick={() => open(notice)}><span className="notification-row-dot" aria-hidden="true" /><span className="notification-row-copy"><strong>{notice.title}</strong><span>{notice.message}</span><time>{timeText(notice.createdAt)}</time></span><i aria-hidden="true">›</i></button>)}</section> : <section className="notification-empty"><h1>아직 새로운 알림이 없어요.</h1><p>편지의 소식이 도착하면 이곳에서 알려드릴게요.</p><button className="flow-secondary-button" type="button" onClick={() => navigateTo("/home")}>홈으로 돌아가기</button></section>}
      {qaMode && <details className="prototype-test-panel notification-test"><summary>프로토타입 테스트</summary><p>알림 목록 상태를 바꿔 확인할 수 있어요.</p><div>{(["empty", "one", "many", "all-read", "reply", "progress", "report", "missing"] as const).map((kind) => <button key={kind} type="button" onClick={() => { seedNotificationTestState(kind); refresh(); }}>{({ empty: "알림 없음", one: "읽지 않음 1개", many: "여러 알림", "all-read": "모두 읽음", reply: "답장 도착", progress: "편지 진행", report: "신고 결과", missing: "연결 없음" } as const)[kind]}</button>)}</div></details>}
    </div>
    {noticeDetail && <div className="auth-dialog-backdrop"><section className="auth-dialog notification-detail" role="dialog" aria-modal="true"><p>알림</p><h2>{noticeDetail.title}</h2><span>{noticeDetail.message}</span><button className="auth-primary" type="button" onClick={() => setNoticeDetail(undefined)}>닫기</button></section></div>}
  </main>;
}

const settingRows = [
  ["replyArrived", "답장 도착", "답장이 도착했을 때 알려드려요."],
  ["replyReminders", "맡은 편지 답장 안내", "아직 전하지 못한 답장이 있을 때 알려드려요."],
] as const;

export function NotificationSettingsScreen() {
  const [settings, setSettings] = useState(getNotificationSettings);
  const [toast, setToast] = useState("");
  const change = (changes: Parameters<typeof updateNotificationSettings>[0]) => { const next = updateNotificationSettings(changes); setSettings(next); setToast("알림 설정을 바꿨어요."); window.setTimeout(() => setToast(""), 1800); };
  return <main className="mobile-prototype notification-settings-screen">
    <Header title="알림 설정" fallback="/my-space" />
    <div className="notification-scroll">
      <section className="notification-settings-list" aria-label="알림 종류 설정">{settingRows.map(([key, title, description]) => <label key={key}><span><strong>{title}</strong><small>{description}</small></span><input type="checkbox" checked={settings[key]} onChange={() => change({ [key]: !settings[key] })} /><i aria-hidden="true" /></label>)}<label className="is-required"><span><strong>서비스 중요 안내</strong><small>서비스 이용에 꼭 필요한 안내예요.</small></span><input type="checkbox" checked readOnly /><i aria-hidden="true" /></label></section>
      {toast && <p className="notification-toast" role="status">{toast}</p>}
    </div>
  </main>;
}
