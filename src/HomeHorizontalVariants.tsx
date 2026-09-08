import { AppBottomNavigation } from "./AppBottomNavigation";
import { getMockAuthSnapshot } from "./mockAuth";
import { navigateTo } from "./navigation";
import { getCurrentUserId } from "./letters";
import { getReadCardPath } from "./waitingLetters";
import { unreadNotificationCount } from "./notifications";
import styles from "./HomeHorizontalVariants.module.css";

type Variant = "band" | "frame";

const choices = [
  {
    key: "write",
    index: "01",
    title: "내 마음을\n털어놓고 싶어요",
    description: "말하지 못한 이야기를\n익명의 편지에 담아보세요.",
    artwork: "/assets/direction-a-write-isolated-tight.png",
    path: "/write-letter",
  },
  {
    key: "read",
    index: "02",
    title: "누군가의 마음을\n들어주고 싶어요",
    description: "누군가의 이야기를\n천천히 읽어보세요.",
    artwork: "/assets/direction-a-listen-isolated-tight.png",
  },
] as const;

function HomeHorizontalVariant({ variant }: { variant: Variant }) {
  const account = getMockAuthSnapshot().account;
  const rawName = account?.anonymousName ?? "당신";
  const name = rawName.length > 10 ? `${rawName.slice(0, 10)}…` : rawName;
  const userId = getCurrentUserId();
  const hasUnreadNotifications = unreadNotificationCount(userId) > 0;

  return (
    <main className={`mobile-prototype home-screen ${styles.screen} ${styles[variant]}`}>
      <div className={`home-heading-top ${styles.topbar}`}>
        <p className="home-brand">공감편지</p>
        <button
          className="home-notification-button"
          type="button"
          aria-label={hasUnreadNotifications ? "알림, 확인이 필요한 새 소식 있음" : "알림"}
          onClick={() => navigateTo("/notifications")}
        >
          <img src="/assets/notification-bell.png" alt="" aria-hidden="true" />
          {hasUnreadNotifications && <i aria-hidden="true" />}
          {hasUnreadNotifications && <span className="sr-only">확인이 필요한 편지함 소식이 있어요.</span>}
        </button>
      </div>

      <div className={`home-scroll-region ${styles.scroll}`}>
        <header className={`home-heading home-heading--status ${styles.heading}`}>
          <h1><em>{name}</em>님,<br />오늘은 어떤 마음인가요?</h1>
          <p className="home-heading-helper">지금 마음이 향하는 쪽을 골라주세요.</p>
        </header>

        <section className={styles.choices} aria-label="시작 선택">
          {choices.map((choice) => (
            <button
              type="button"
              className={`${styles.card} ${styles[choice.key]}`}
              key={choice.key}
              onClick={() => navigateTo(choice.key === "write" ? choice.path : getReadCardPath(userId))}
            >
              <span className={styles.copy}>
                {variant === "band" && <small>{choice.index}</small>}
                <strong>{choice.title.split("\n").map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</strong>
                <span>{choice.description.split("\n").map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</span>
                <i aria-hidden="true">→</i>
              </span>
              <img src={choice.artwork} alt="" aria-hidden="true" />
            </button>
          ))}
        </section>

        <div className={`home-choice-footer ${styles.tagline}`}>
          <img src="/assets/home-cards-ornaments-01.svg" alt="" aria-hidden="true" />
          <p>마음을 쓰고, 마음을 읽는 시간</p>
        </div>
      </div>
      <AppBottomNavigation active="home" />
    </main>
  );
}

export function HomeHorizontalBandScreen() {
  return <HomeHorizontalVariant variant="band" />;
}

export function HomeHorizontalFrameScreen() {
  return <HomeHorizontalVariant variant="frame" />;
}
