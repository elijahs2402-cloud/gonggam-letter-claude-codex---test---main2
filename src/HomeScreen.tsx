import { useEffect, useMemo, useRef, useState } from "react"
import { AppBottomNavigation } from "./AppBottomNavigation"
import { NotificationsScreen } from "./NotificationScreens"
import { isPrototypeQaMode } from "./prototypeQa"
import { getCurrentUserId, getReplyDeadline } from "./letters"
import { getCurrentAppPath, navigateTo, registerShellRouter } from "./navigation"
import { getLetterDraft } from "./letterDraft"
import { getMockAuthSnapshot } from "./mockAuth"
import { seedNotificationTestState } from "./notifications"
import { getMailboxAttention } from "./mailboxAttention"
import { unreadNotificationCount } from "./notifications"
import {
  dismissNotice,
  isNoticeDismissed,
  markNoticeSeen,
  wasNoticeSeenThisSession,
} from "./dismissedNotices"
import { getReadCardPath } from "./waitingLetters";

type HomeTestState = "normal" | "loading" | "error" | "partial-error"
type FloatingNotice = {
  id: string
  title: string
  description: string
  action: string
  onAction: () => void
  /** 있으면 제목 아래에 남은 시간을 1초 단위로 함께 보여준다. */
  deadline?: number
  isUrgent?: boolean
  /**
   * 언제 다시 안 보이게 할지.
   *  - "session": 한 번의 접속에서 한 번만 보인다. 접속을 새로 하면 다시 뜬다.
   *               (맡은 편지 — 계속 상기시켜야 한다. 닫아도 끝나지 않고,
   *                답장을 보내거나 편지를 반려해야 비로소 사라진다.
   *                그 두 경우는 편지가 assignedLetters 에서 빠지므로
   *                여기서 따로 지울 필요가 없다 — 실제로 두 상태를 만들어
   *                카드가 사라지는 것을 확인했다.)
   *  - "forever":  한 번 닫거나 버튼을 누르면 다시 뜨지 않는다.
   *               (답장 도착 — 확인했다면 더 알릴 이유가 없다)
   */
  hideAfter: "session" | "forever"
}
// 편지든 답장이든 같은 일이 일어났으므로 같은 말을 쓴다. 예전에는 편지가
// "임시 저장 됩니다"(평서·미래), 답장이 "임시로 보관되었어요"(완료)로 갈려
// 시제도 어휘도 달랐다. 이미 끝난 뒤에 뜨는 알림이라 완료형이 맞다.
// 단어는 '저장' 대신 '보관'을 쓴다. 마침표는 옆의 소식 카드들
// ('답장이 도착했어요.' 등)과 같은 관행이다.
const DRAFT_SAVED_MESSAGE = "작성 중인 글이 임시 보관되었어요."
const DRAFT_SAVED_TOAST_KEY = "gonggam-letter:draft-saved-toast"
const DRAFT_SAVED_TOAST_FALLBACK_KEY =
  "gonggam-letter:draft-saved-toast-pending"

function consumeDraftSavedToastRequest() {
  const currentUrl = new URL(window.location.href)
  const fallback = window.localStorage.getItem(DRAFT_SAVED_TOAST_FALLBACK_KEY)
  const requested =
    window.sessionStorage.getItem(DRAFT_SAVED_TOAST_KEY) ??
    currentUrl.searchParams.get("toast") ??
    fallback
  if (!requested) return null

  window.sessionStorage.removeItem(DRAFT_SAVED_TOAST_KEY)
  window.localStorage.removeItem(DRAFT_SAVED_TOAST_FALLBACK_KEY)
  if (currentUrl.searchParams.has("toast")) {
    currentUrl.searchParams.delete("toast")
    window.history.replaceState(
      {},
      "",
      `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`,
    )
  }

  return requested
}

/** 남은 시간을 "N일 HH:MM:SS" 로 적는다. 1초 미만은 버린다. */
function formatRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(total / 86400)
  const hh = String(Math.floor((total % 86400) / 3600)).padStart(2, "0")
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, "0")
  const ss = String(total % 60).padStart(2, "0")
  return days > 0 ? `${days}일 ${hh}:${mm}:${ss}` : `${hh}:${mm}:${ss}`
}

/**
 * 맡은 편지가 사라지기까지 남은 시간. 1초마다 다시 그린다.
 *
 * 숫자를 고정폭(tabular-nums)으로 두는 이유는 CSS 쪽에 적어두었다 — 요약하면,
 * 기본 숫자는 글자마다 폭이 달라 1초마다 글줄이 좌우로 흔들린다.
 *
 * aria-live 는 일부러 쓰지 않는다. 1초마다 읽어주면 화면 읽기 프로그램
 * 사용자에게는 소음이 된다. 대신 남은 시간을 문장으로 담은 aria-label 을
 * 한 번만 준다.
 */
function ReplyCountdown({ deadline, isUrgent = false }: { deadline: number; isUrgent?: boolean }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (deadline - Date.now() <= 0) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [deadline])

  const remaining = deadline - now
  if (remaining <= 0)
    return <span className="home-notice-countdown is-over">곧 사라져요</span>

  const text = formatRemaining(remaining)
  return (
    <span
      className={`home-notice-countdown${isUrgent ? " is-over" : ""}`}
      aria-label={`답장할 수 있는 시간이 ${text} 남았어요`}
    >
      <span aria-hidden="true">{isUrgent ? `곧 사라져요 · ${text} 남음` : `${text} 남음`}</span>
    </span>
  )
}

// 홈은 알림 화면을 '한 화면 안에서' state 로 갈아끼운다. 나의 공간이 목록↔상세를
// 다루는 방식과 같다 — 페이지를 새로 불러오지 않으므로 나가는 화면과 들어오는
// 화면 사이에 빈 구간이 생기지 않고, React 가 노드를 통째로 교체해 주어
// 어느 방향으로 가든 진입 애니메이션이 매번 재생된다.
//
// URL 은 pushState 로만 맞춰 둔다. /notifications 로 새로고침하거나 링크로 바로
// 들어오면 App.tsx 의 라우터가 알림 화면을 단독으로 그리고(기존 동작 그대로),
// 그때는 페이지 단위 진입 모션이 쓰인다.
export function HomeScreen() {
  const [view, setView] = useState<"home" | "notifications">("home")
  const [direction, setDirection] = useState<"forward" | "back">("forward")
  // 셸 안에서 한 번이라도 이동했는지. 처음 홈에 들어왔을 때는 단계 클래스를
  // 붙이지 않아야 홈 고유의 순차 등장 모션이 그대로 살아난다.
  const [moved, setMoved] = useState(false)

  const viewRef = useRef<"home" | "notifications">("home")
  viewRef.current = view

  const goToView = (next: "home" | "notifications") => {
    setDirection(next === "notifications" ? "forward" : "back")
    setMoved(true)
    setView(next)
  }

  // navigateTo / navigateBack 을 가로채 셸 안에서 처리한다.
  // 처리하지 못하는 곳(편지함, 알림이 가리키는 편지 등)은 false 를 돌려
  // 평소대로 페이지를 이동시킨다.
  useEffect(() => {
    return registerShellRouter({
      go: (path) => {
        if (path === "/notifications" && viewRef.current === "home") {
          goToView("notifications")
          window.history.pushState({}, "", path)
          return true
        }
        // 알림 빈 화면의 '홈으로' 버튼은 navigateTo("/home") 을 부른다.
        // 새 기록을 쌓지 않고 헤더 ← 와 똑같이 되돌아가야 뒤로가기가 꼬이지 않는다.
        if (path === "/home" && viewRef.current === "notifications") {
          window.history.back()
          return true
        }
        return false
      },
      back: (fallbackPath) => {
        if (fallbackPath !== "/home" || viewRef.current !== "notifications")
          return false
        // pushState 로 쌓아둔 만큼 물러난다 — 브라우저 뒤로가기와 같은 결과.
        window.history.back()
        return true
      },
    })
  }, [])

  // 브라우저 뒤로/앞으로에도 같은 전환으로 반응한다.
  useEffect(() => {
    const onPopState = () => {
      goToView(getCurrentAppPath() === "/notifications" ? "notifications" : "home")
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  const stage = moved ? `app-shell-stage app-shell-stage--${direction}` : ""

  if (view === "notifications")
    return <NotificationsScreen stageClassName={stage} />

  return <HomeContent stageClassName={stage} suppressStagger={moved} />
}

function HomeContent({
  stageClassName = "",
  suppressStagger = false,
}: {
  stageClassName?: string
  suppressStagger?: boolean
}) {
  const [testState, setTestState] = useState<HomeTestState>("normal")
  const [noticeVersion, setNoticeVersion] = useState(0)
  const [draftSavedToastRequest] = useState(consumeDraftSavedToastRequest)
  const [showDraftSavedToast, setShowDraftSavedToast] = useState(() =>
    Boolean(draftSavedToastRequest),
  )
  const [isDraftSavedToastLeaving, setIsDraftSavedToastLeaving] =
    useState(false)
  useEffect(() => {
    if (!showDraftSavedToast) return
    const leaveTimer = window.setTimeout(
      () => setIsDraftSavedToastLeaving(true),
      3000,
    )
    const hideTimer = window.setTimeout(
      () => setShowDraftSavedToast(false),
      3400,
    )
    return () => {
      window.clearTimeout(leaveTimer)
      window.clearTimeout(hideTimer)
    }
  }, [showDraftSavedToast])
  const userId = getCurrentUserId()
  const account = getMockAuthSnapshot().account
  const letterDraft = getLetterDraft(userId)
  const attention = useMemo(
    () => getMailboxAttention(userId, Boolean(letterDraft?.content.trim())),
    [userId, noticeVersion, letterDraft?.content],
  )
  const unreadReplies = attention.unreadReplies
  const assignedLetter = attention.assignedLetters.find(
    (letter) => !attention.replyDraftLetterIds.includes(letter.id),
  )

  /*
   * 홈 소식 카드는 두 가지만 띄운다.
   *
   * 예전에는 아홉 가지가 우선순위 사슬로 얽혀 있었다(안전 검토·전송 실패·
   * 지연 1통/여러 통·답장 초안·편지 초안 …). 한 번에 하나만 보이는 자리에
   * 아홉 갈래를 두면, 정작 사용자가 봐야 할 소식이 뒤로 밀린다.
   * 남긴 둘은 '지금 행동이 필요한 것' 뿐이다 —
   *   · 답장이 왔다        (읽으러 가야 한다)
   *   · 맡은 편지가 있다   (3일 안에 답하지 않으면 사라진다)
   * 나머지 일곱은 편지함과 각 화면에서 이미 볼 수 있으므로 홈에서는 뺐다.
   *
   * 답장은 통수를 세지 않는다. 한 통이든 여러 통이든 할 일은 '편지함에 가서
   * 확인한다' 하나라, 숫자를 세어 문구를 갈라도 행동이 달라지지 않는다.
   */
  /* 우선순위. 둘이 동시에 걸리면 '맡은 편지'가 먼저다 —
     맡은 편지는 3일이 지나면 사라지지만, 도착한 답장은 언제 봐도 그대로 있다.
     놓쳤을 때 되돌릴 수 없는 쪽이 먼저 보여야 한다.
     앞의 것을 닫으면 그 다음 것이 이어서 뜬다(아래 dismissedNow 참고). */
  const candidates: FloatingNotice[] = []
  if (assignedLetter)
    candidates.push({
      id: `assigned-${assignedLetter.id}`,
      title: "맡은 편지에 답장을 전해주세요.",
      description: "당신의 한마디를 기다리고 있어요.",
      // 3일 안에 답장하지 않으면 편지는 사라진다. 남은 시간을 함께
      // 보여준다 — '언제까지'가 빠지면 재촉으로만 읽히고, 정작 편지가
      // 사라진 뒤에야 그 규칙을 알게 된다.
      deadline: getReplyDeadline(assignedLetter),
      action: "답장 쓰기",
      onAction: () =>
        navigateTo(`/write-reply/${encodeURIComponent(assignedLetter.id)}`),
      hideAfter: "session",
    })
  if (unreadReplies.length)
    candidates.push({
      id: "replies",
      title: "답장이 도착했어요.",
      description: "편지함에서 확인할 수 있어요.",
      action: "편지함 가기",
      onAction: () => navigateTo("/mailbox"),
      hideAfter: "forever",
    })

  // 하단 소식 토스트를 데이터 준비 없이 검토할 수 있는 임시 상태.
  // 실제 소식 로직에는 영향을 주지 않고, preview 쿼리가 있을 때만 우선한다.
  const noticePreview = new URLSearchParams(window.location.search).get("preview")
  const previewNotice: FloatingNotice | undefined =
    noticePreview === "notice-assigned"
      ? {
          id: "preview-assigned",
          title: "맡은 편지에 답장을 전해주세요.",
          description: "당신의 한마디를 기다리고 있어요.",
          deadline: Date.now() + 2 * 24 * 60 * 60 * 1000,
          action: "답장 쓰기",
          onAction: () => navigateTo("/write-reply/sample-waiting-letter-one"),
          hideAfter: "session",
        }
      : noticePreview === "notice-expiring"
        ? {
            id: "preview-expiring",
            title: "맡은 편지에 답장을 전해주세요.",
            description: "답장할 수 있는 시간이 얼마 남지 않았어요.",
            deadline: Date.now() + 15 * 60 * 1000,
            isUrgent: true,
            action: "답장 쓰기",
            onAction: () => navigateTo("/write-reply/sample-waiting-letter-one"),
            hideAfter: "session",
          }
        : noticePreview === "notice-reply-arrived"
          ? {
              id: "preview-reply-arrived",
              title: "답장이 도착했어요.",
              description: "편지함에서 확인할 수 있어요.",
              action: "편지함 가기",
              onAction: () => navigateTo("/mailbox"),
              hideAfter: "forever",
            }
          : undefined

  // 이 화면에서 방금 닫은 것들. 하나를 닫으면 다음 순위가 이어서 뜬다.
  const [dismissedNow, setDismissedNow] = useState<string[]>([])
  const notice = previewNotice ?? candidates.find(
    (item) =>
      !dismissedNow.includes(item.id) &&
      (item.hideAfter === "forever"
        ? !isNoticeDismissed(userId, item.id)
        : !wasNoticeSeenThisSession(item.id)),
  )

  // 한 번 보여준 세션 소식은 '봤다'고 적어 둔다. 판단 기준은 페이지가 뜨기 전
  // 상태로 고정돼 있어(dismissedNotices.ts 참고) 지금 화면에서 사라지지는 않고,
  // 다음 접속·다음 페이지부터 뜨지 않는다.
  useEffect(() => {
    if (notice?.hideAfter === "session") markNoticeSeen(notice.id)
  }, [notice?.id, notice?.hideAfter])

  /** 소식을 닫는다. 남기는 방식은 소식마다 다르다(hideAfter). */
  const closeNotice = (item: FloatingNotice) => {
    if (item.hideAfter === "forever") dismissNotice(userId, item.id)
    else markNoticeSeen(item.id)
    setDismissedNow((ids) => [...ids, item.id])
  }

  const name = account?.anonymousName ?? "당신"
  // 벨의 점은 벨을 눌렀을 때 열리는 알림 목록만 본다.
  // 예전에는 편지함 소식(getMailboxAttention)으로 켰는데, 알림 화면은
  // 그것과 아무 상관 없는 별도 저장소를 읽는다. 그래서 점을 보고 눌러도
  // '아직 새로운 알림이 없어요'만 나왔다.
  const hasUnreadNotifications = unreadNotificationCount(userId) > 0
  const qaMode = isPrototypeQaMode()
  return (
    <main
      className={`mobile-prototype home-screen${
        suppressStagger ? " home-screen--shell-return" : ""
      }${stageClassName ? ` ${stageClassName}` : ""}`}
      data-notice-version={noticeVersion}
    >
      {showDraftSavedToast && (
        <p
          className={`home-draft-saved-toast${
            isDraftSavedToastLeaving ? " is-leaving" : ""
          }`}
          role="status"
          aria-live="polite"
          onAnimationEnd={(event) => {
            if (event.animationName === "home-draft-saved-toast-out")
              setShowDraftSavedToast(false)
          }}
        >
          {DRAFT_SAVED_MESSAGE}
        </p>
      )}
      {/* home-cards 와 같은 헤더 영역. 스크롤 영역 밖에 두어야
          화면 기준으로 고정된다. */}
      <div className="home-heading-top">
        <p className="home-brand">공감편지</p>
        <button
          className="home-notification-button"
          type="button"
          onClick={() => navigateTo("/notifications")}
          aria-label={
            hasUnreadNotifications ? "알림, 확인이 필요한 새 소식 있음" : "알림"
          }
        >
          <img src="/assets/notification-bell.png" alt="" aria-hidden="true" />
          {hasUnreadNotifications && <i aria-hidden="true" />}
          {hasUnreadNotifications && (
            <span className="sr-only">확인이 필요한 편지함 소식이 있어요.</span>
          )}
        </button>
      </div>
      <div className="home-scroll-region">
        <header className="home-heading home-heading--status">
          <h1>
            <em>{name.length > 10 ? `${name.slice(0, 10)}…` : name}</em>님,
            <br />
            오늘은 어떤 마음인가요?
          </h1>
          <p className="home-heading-helper">
            지금 마음이 향하는 쪽을 골라주세요.
          </p>
        </header>
        {notice && (
          <aside className="home-notice-card" role="status">
            <button
              type="button"
              className="home-notice-dismiss"
              aria-label="소식 닫기"
              onClick={() => closeNotice(notice)}
            >
              ×
            </button>
            <span className="home-notice-copy">
              <strong>{notice.title}</strong>
              {notice.deadline !== undefined && (
                <ReplyCountdown deadline={notice.deadline} isUrgent={notice.isUrgent} />
              )}
              {notice.deadline === undefined && <span className="home-notice-countdown home-notice-countdown--placeholder" aria-hidden="true">시간 여백</span>}
            </span>
            <button
              type="button"
              className="home-notice-action"
              onClick={() => {
                // '답장 도착'처럼 한 번 확인하면 끝인 소식은 버튼을 누른 것도
                // 닫은 것으로 친다. 편지함에 다녀온 뒤 같은 알림이 다시 뜨면
                // 확인하지 않은 것처럼 보인다.
                // 맡은 편지(session)는 답장을 보낼 때까지 계속 상기시켜야 하므로
                // 여기서 지우지 않는다 — 다음 접속에 다시 뜬다.
                if (notice.hideAfter === "forever")
                  dismissNotice(userId, notice.id)
                notice.onAction()
              }}
            >
              {notice.action}
            </button>
          </aside>
        )}
        {testState === "loading" ? (
          <section
            className="home-skeleton"
            aria-label="홈의 소식을 불러오는 중"
          >
            <i />
            <i />
            <i />
          </section>
        ) : testState === "error" ? (
          <section className="home-load-error">
            <h2>마음의 소식을 불러오지 못했어요</h2>
            <p>잠시 후 다시 확인해주세요.</p>
            <button
              className="flow-primary-button"
              type="button"
              onClick={() => setTestState("normal")}
            >
              다시 불러오기
            </button>
          </section>
        ) : (
          <>
            <section className="home-choices" aria-label="시작 선택">
              <button
                className="home-choice home-choice--primary"
                type="button"
                onClick={() => navigateTo("/write-letter")}
              >
                <span className="home-choice-index">01</span>
                <span className="home-choice-copy">
                  <strong>
                    내 마음을
                    <br />
                    털어놓고 싶어요
                  </strong>
                  <span>
                    익명의 편지
                    <br />
                    남기기
                  </span>
                </span>
                <img
                  src="/assets/direction-a-write-isolated-tight.png"
                  alt=""
                  aria-hidden="true"
                />
              </button>
              <button
                className="home-choice home-choice--secondary"
                type="button"
                onClick={() => navigateTo(getReadCardPath(userId))}
              >
                <span className="home-choice-index">02</span>
                <span className="home-choice-copy">
                  <strong>
                    누군가의 마음을
                    <br />
                    들어주고 싶어요
                  </strong>
                  <span>
                    천천히 읽고
                    <br />
                    답하기
                  </span>
                </span>
                <img
                  src="/assets/direction-a-listen-isolated-tight.png"
                  alt=""
                  aria-hidden="true"
                />
              </button>
            </section>
            <div className="home-choice-footer">
              {/* 시안 비교(현재 · 01 · 02) 끝에 고른 01. 셋은 가로선·색·굵기·불투명도가
                  모두 같고 가운데 별 문양만 다르다 — 01 은 갈래가 더 많고 가늘게 뻗는다.
                  표시 폭이 21px 남짓이라 실제 화면에서 차이는 아주 미세하다.
                  네 화면(홈 · /home-cards · /home-scene · 편지 읽기)가 같은 파일을 공유한다. */}
              <img src="/assets/home-cards-ornaments-01.svg" alt="" aria-hidden="true" />
              <p>마음을 쓰고, 마음을 읽는 시간</p>
            </div>
            {testState === "partial-error" && (
              <p className="home-partial-error">
                일부 소식을 불러오지 못했어요. 잠시 후 다시 확인해주세요.
              </p>
            )}
          </>
        )}
        {qaMode && (
          <details className="prototype-test-panel home-test-panel">
            <summary>프로토타입 테스트</summary>
            <p>홈 데이터와 소식 상태를 확인할 수 있어요.</p>
            <div>
              <button type="button" onClick={() => setTestState("loading")}>
                홈 로딩
              </button>
              <button type="button" onClick={() => setTestState("error")}>
                전체 오류
              </button>
              <button
                type="button"
                onClick={() => setTestState("partial-error")}
              >
                일부 오류
              </button>
              <button type="button" onClick={() => setTestState("normal")}>
                정상
              </button>
            </div>
            <div>
              <button
                type="button"
                onClick={() => {
                  seedNotificationTestState("reply")
                  setNoticeVersion((value) => value + 1)
                }}
              >
                답장 도착
              </button>
              <button
                type="button"
                onClick={() => {
                  seedNotificationTestState("empty")
                  setNoticeVersion((value) => value + 1)
                }}
              >
                소식 없음
              </button>
            </div>
          </details>
        )}
      </div>
      <AppBottomNavigation active="home" />
    </main>
  )
}
