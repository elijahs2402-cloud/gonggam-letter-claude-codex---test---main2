import { useState } from "react"
import { AppBottomNavigation } from "./AppBottomNavigation"
import { getCurrentAnonymousName } from "./mockAuth"
import { getCurrentUserId } from "./letters"
import { unreadNotificationCount } from "./notifications"
import { navigateTo } from "./navigation"
import { getReadCardPath } from "./waitingLetters"
import styles from "./HomeRuledFocusScreen.module.css"

const choices = [
  {
    key: "write",
    title: ["내 마음을", "털어놓고 싶어요"],
    helper: ["말하지 못한 이야기를", "익명의 편지에 담아보세요."],
    icon: "/assets/home-card-write.png",
    path: "/write-letter",
    label: "익명의 편지 남기기",
  },
  {
    key: "read",
    title: ["누군가의 마음을", "들어주고 싶어요"],
    helper: ["누군가가 조심스럽게 꺼낸 이야기를", "천천히 읽어보세요."],
    icon: "/assets/home-card-read.png",
    path: "/listen-entry-a",
    label: "누군가의 편지를 천천히 읽고 답하기",
  },
] as const

// /home-ruled의 비교 시안. 배경 가구를 걷어내고 선택 카드를 화면의 주인공으로 둔다.
export function HomeRuledFocusScreen() {
  const [isScrolled, setIsScrolled] = useState(false)
  const userId = getCurrentUserId()
  const name = getCurrentAnonymousName()
  const hasUnreadNotifications = unreadNotificationCount(userId) > 0

  return (
    <main className={`mobile-prototype home-screen home-ruled-focus-screen ${styles.screen}`}>
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

      <div className={`home-scroll-region ${styles.scroll}`} onScroll={(event) => setIsScrolled(event.currentTarget.scrollTop > 4)}>
        <header className="home-heading">
          <h1>
            <em>{name}</em>님,
            <br />
            오늘은 어떤 마음인가요?
          </h1>
          <p className="home-heading-helper">지금 마음이 향하는 쪽을 골라주세요.</p>
        </header>

        <section className={styles.choices} aria-label="오늘의 선택">
          {choices.map((choice) => (
            <button
              key={choice.key}
              className={`${styles.choice} ${styles[choice.key]}`}
              type="button"
              aria-label={choice.label}
              onClick={() => navigateTo(choice.key === "read" ? getReadCardPath(userId) : choice.path)}
            >
              <span className={styles.copy}>
                <strong>{choice.title[0]}<br />{choice.title[1]}</strong>
                <small>{choice.helper[0]}<br />{choice.helper[1]}</small>
                <i aria-hidden="true" />
              </span>
              <img src={choice.icon} alt="" />
            </button>
          ))}
        </section>

        <p className={styles.footer}>
          <img src="/assets/home-footer-star-divider1.svg" alt="" />
          <span>마음을 쓰고, 마음을 읽는 시간</span>
          <img src="/assets/home-footer-star-divider2.svg" alt="" />
        </p>
      </div>

      <AppBottomNavigation active="home" />
    </main>
  )
}
