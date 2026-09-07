import { AppBottomNavigation } from "./AppBottomNavigation";
import { unreadNotificationCount } from "./notifications";
import { navigateTo } from "./navigation";
import { getMockAuthSnapshot } from "./mockAuth";
import { getCurrentUserId } from "./letters";
import { getReadCardPath } from "./waitingLetters";

/**
 * 홈 시안 — 두 장의 액자 카드 대신 하나의 이어진 방으로 보여준다.
 *
 * 안정식당처럼 "장면 안 오브젝트를 찾아 누르는" 방식까지는 가지 않는다.
 * 이 앱은 진입점이 둘뿐이고, 털어놓을 것이 있어 여는 사람이 많아
 * 무엇을 눌러야 하는지 찾게 만들면 마찰이 된다.
 * 그래서 배경만 하나로 잇고, 누르는 곳은 라벨이 보이는 영역으로 남긴다.
 *
 * 기존 /home 은 그대로 두고 이 경로에서만 시험한다.
 */
export function HomeSceneScreen() {
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
    <main className="mobile-prototype home-screen home-scene-screen">
      <div className="home-scroll-region home-scene-scroll">
        <header className="home-heading home-scene-heading">
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
          <h1>
            <em>{displayName}</em>님,
            <br />
            오늘은 어떤 마음인가요?
          </h1>
          <p className="home-heading-helper">지금 마음이 향하는 쪽을 골라주세요.</p>
        </header>

        {/* 하나의 방. 왼쪽은 쓰는 자리, 오른쪽은 읽는 자리. */}
        <section className="home-scene" aria-label="시작 선택">
          <div className="home-scene-room" aria-hidden="true">
            {/* 왼쪽은 쓰는 책상, 오른쪽은 읽는 의자. 장식이므로 대체텍스트를 비운다. */}
            <img src="/assets/home-scene-room.jpg" alt="" />
          </div>

          <div className="home-scene-actions">
            <button type="button" className="home-scene-action" onClick={() => navigateTo("/write-letter")}>
              <span className="home-scene-index">01</span>
              <strong>
                내 마음을
                <br />
                털어놓고 싶어요
              </strong>
            </button>
            <button type="button" className="home-scene-action" onClick={() => navigateTo(getReadCardPath(getCurrentUserId()))}>
              <span className="home-scene-index">02</span>
              <strong>
                누군가의 마음을
                <br />
                들어주고 싶어요
              </strong>
            </button>
          </div>
        </section>

        <div className="home-choice-footer">
          {/* 홈(/home)의 같은 자리와 같은 장식을 쓴다 — 두 시안을 나란히 볼 때
              장식이 달라 판단이 흐려지지 않도록. */}
          <img src="/assets/home-cards-ornaments-01.svg" alt="" aria-hidden="true" />
          <p>마음을 쓰고, 마음을 읽는 시간</p>
        </div>
      </div>
      <AppBottomNavigation active="home" />
    </main>
  );
}
