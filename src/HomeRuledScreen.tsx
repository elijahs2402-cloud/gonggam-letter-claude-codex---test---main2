import { useState } from "react"
import { AppBottomNavigation } from "./AppBottomNavigation"
import { getCurrentAnonymousName } from "./mockAuth"
import { getCurrentUserId } from "./letters"
import { unreadNotificationCount } from "./notifications"
import { navigateTo } from "./navigation"
import { getReadCardPath } from "./waitingLetters";
import styles from "./HomeRuledScreen.module.css";

// 피그마 168-316 시안(괘선 2단 + 어두운 골동품 가구)에 '옅은 면'을 더한 홈.
// 기존 /home 은 건드리지 않고 이 라우트에서만 비교한다.
//
// home-screen 클래스를 함께 붙이는 이유: 브랜드·인사말·알림 벨·스크롤 여백이
// 시안과 이미 같은 값이라(실측: 브랜드 x24/y22, 인사말 28px 세리프 x24/y96)
// 그 규칙들을 그대로 물려받고, 달라지는 부분만 home-ruled-screen 으로 덮는다.
//
// 시안과 다른 점이 하나 있다: 시안은 두 칸에 면이 없어 칸의 좌우 경계가
// 형태로 드러나지 않는다. 여기서는 칸 안쪽을 흰쪽으로 아주 조금 들어 올려
// '이 칸 전체가 하나'라는 것이 보이게 했다. 더 올리면 종이결이 죽는다
// (측정: 결 진폭 2.68 → 강하게 올리면 0.86 으로 3분의 1이 된다).

const CHOICES = [
  {
    key: "write",
    icon: "/assets/home-card-write.png",
    title: ["내 마음을", "털어놓고 싶어요"],
    helper: ["익명의 편지", "남기기"],
    path: "/write-letter",
    label: "익명의 편지 남기기",
  },
  {
    key: "read",
    icon: "/assets/home-card-read.png",
    title: ["누군가의 마음을", "들어주고 싶어요"],
    helper: ["천천히 읽고", "답하기"],
    path: "/listen-entry-a",
    label: "누군가의 편지를 천천히 읽고 답하기",
  },
] as const

export function HomeRuledScreen() {
  const [isScrolled, setIsScrolled] = useState(false)
  const userId = getCurrentUserId()
  const name = getCurrentAnonymousName()
  // 벨의 점은 벨을 눌렀을 때 열리는 알림 목록만 본다.
  // 예전에는 편지함 소식(getMailboxAttention)으로 켰는데, 알림 화면은
  // 그것과 아무 상관 없는 별도 저장소를 읽는다. 그래서 점을 보고 눌러도
  // '아직 새로운 알림이 없어요'만 나왔다.
  const hasUnreadNotifications = unreadNotificationCount(userId) > 0

  return (
    <main className={`mobile-prototype home-screen home-ruled-screen ${styles.screen}`}>
      <div className={`home-heading-top ${styles.headingTop}${isScrolled ? ` ${styles.scrolled}` : ""}`}>
        <p className="home-brand">공감편지</p>
        <button
          className="home-notification-button"
          type="button"
          onClick={() => navigateTo("/notifications")}
          aria-label={hasUnreadNotifications ? "알림, 확인이 필요한 새 소식 있음" : "알림"}
        >
          {hasUnreadNotifications && <i aria-hidden="true" />}
        </button>
      </div>

      <div
        className={`home-scroll-region ${styles.scroll}`}
        onScroll={(event) => setIsScrolled(event.currentTarget.scrollTop > 4)}
      >
        <header className="home-heading">
          <h1>
            <em>{name}</em>님,
            <br />
            오늘은 어떤 마음인가요?
          </h1>
          <p className="home-heading-helper">지금 마음이 향하는 쪽을 골라주세요.</p>
        </header>

        <section className={styles.choices} aria-label="오늘의 선택">
          {CHOICES.map((choice) => (
            <button
              key={choice.key}
              className={styles.choice}
              type="button"
              aria-label={choice.label}
              onClick={() => navigateTo(choice.key === "read" ? getReadCardPath(userId) : choice.path)}
            >
              <img className={styles.icon} src={choice.icon} alt="" />
              <strong>
                {choice.title[0]}
                <br />
                {choice.title[1]}
              </strong>
              <span>
                {choice.helper[0]}
                <br />
                {choice.helper[1]}
              </span>
              <i className={styles.arrow} aria-hidden="true" />
            </button>
          ))}
        </section>

        <p className={`${styles.footer} ${styles.scrollFooter}`}>
          <img src="/assets/decor-left.png" alt="" />
          <span>마음을 쓰고, 마음을 읽는 시간</span>
          <img src="/assets/decor-right.png" alt="" />
        </p>
      </div>

      <p className={`${styles.footer} ${styles.fixedFooter}`}>
        <img src="/assets/decor-left.png" alt="" />
        <span>마음을 쓰고, 마음을 읽는 시간</span>
        <img src="/assets/decor-right.png" alt="" />
      </p>

      <AppBottomNavigation active="home" />
    </main>
  )
}
