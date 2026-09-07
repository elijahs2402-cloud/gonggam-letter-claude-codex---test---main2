import { AppBottomNavigation } from "./AppBottomNavigation";
import { unreadNotificationCount } from "./notifications";
import { navigateTo } from "./navigation";
import { getMockAuthSnapshot } from "./mockAuth";
import { getCurrentUserId } from "./letters";
import { getReadCardPath } from "./waitingLetters";

/**
 * 홈 시안 — 방 일러스트를 배경으로 깔고, 그 위에 반투명 카드 두 장을 띄운다.
 *
 * /home 은 두 개의 액자 카드, /home-scene 은 배경 장면만 있고 버튼이 없었다.
 * 이 시안은 둘을 합친다. 장면은 화면 전체 배경으로 내려가고, 선택지는
 * 위에서 아래로 옅어지는 카드로 그 위에 얹힌다. 카드 아래쪽이 투명해지면서
 * 방이 비쳐 보여, 카드가 장면 위에 놓인 종이처럼 읽힌다.
 *
 * 기존 /home 과 /home-scene 은 그대로 두고 이 경로에서만 시험한다.
 */
export function HomeCardsScreen() {
  const account = getMockAuthSnapshot().account;
  const userId = getCurrentUserId();
  // 벨의 점은 벨을 눌렀을 때 열리는 알림 목록만 본다.
  // 예전에는 편지함 소식(getMailboxAttention)으로 켰는데, 알림 화면은
  // 그것과 아무 상관 없는 별도 저장소를 읽는다. 그래서 점을 보고 눌러도
  // '아직 새로운 알림이 없어요'만 나왔다.
  const hasUnreadNotifications = unreadNotificationCount(userId) > 0;
  const name = account?.anonymousName ?? "당신";
  const displayName = name.length > 10 ? `${name.slice(0, 10)}…` : name;

  return (
    <main className="mobile-prototype home-screen home-cards-screen">
      {/* 방 일러스트는 장식이라 대체텍스트를 비운다. 내용은 아래 카드가 전달한다. */}
      <img className="home-cards-room" src="/assets/home-cards-room.jpg" alt="" aria-hidden="true" />

      {/* 스크롤 영역 밖에 두어야 화면 기준으로 고정된다.
          안에 있으면 .home-cards-scroll(position: relative)이 기준이 되어
          내용과 함께 밀려 올라간다. */}
      <div className="home-heading-top">
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

      <div className="home-scroll-region home-cards-scroll">
        <header className="home-heading home-cards-heading">
          <h1>
            <em>{displayName}</em>님,
            <br />
            오늘은 어떤 마음인가요?
          </h1>
          <p className="home-heading-helper">지금 마음이 향하는 쪽을 골라주세요.</p>
        </header>

        <section className="home-cards" aria-label="시작 선택">
          <button type="button" className="home-cards-card" onClick={() => navigateTo("/write-letter")}>
            <img className="home-cards-art" src="/assets/home-card-write.png" alt="" aria-hidden="true" />
            <span className="home-cards-title">
              내 마음을
              <br />
              털어놓고 싶어요
            </span>
            <span className="home-cards-desc">
              익명의 편지
              <br />
              남기기
            </span>
            <span className="home-cards-cta">편지 쓰기</span>
          </button>

          <button type="button" className="home-cards-card" onClick={() => navigateTo(getReadCardPath(getCurrentUserId()))}>
            <img className="home-cards-art" src="/assets/home-card-read.png" alt="" aria-hidden="true" />
            <span className="home-cards-title">
              누군가의 마음을
              <br />
              들어주고 싶어요
            </span>
            <span className="home-cards-desc">
              천천히 읽고
              <br />
              답하기
            </span>
            <span className="home-cards-cta">편지 읽기</span>
          </button>
        </section>

      </div>

      {/* 헤더와 마찬가지로 스크롤 영역 밖에 둔다.
          안에 있으면 .home-cards-scroll 기준이 되어 함께 밀린다. */}
      <p className="home-cards-tagline">
        <img src="/assets/home-cards-ornaments-01.svg" alt="" aria-hidden="true" />
        <span>마음을 쓰고, 마음을 읽는 시간</span>
      </p>

      <AppBottomNavigation active="home" />
    </main>
  );
}
