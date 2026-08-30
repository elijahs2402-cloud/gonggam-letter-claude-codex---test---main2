import { navigateTo } from "./navigation";
import { getCurrentUserId } from "./letters";
import { getLetterDraft } from "./letterDraft";
import { hasMailboxAttention } from "./mailboxAttention";

type AppSection = "home" | "mailbox" | "my-space";

const items: ReadonlyArray<{ id: AppSection; label: string; path: string; asset: string }> = [
  { id: "home", label: "홈", path: "/home", asset: "/assets/home_icon.png" },
  { id: "mailbox", label: "편지함", path: "/mailbox", asset: "/assets/letter_icon.png" },
  { id: "my-space", label: "나의 공간", path: "/my-space", asset: "/assets/notebook_icon.png" },
];

export function AppBottomNavigation({ active, showAttention = true }: { active: AppSection; showAttention?: boolean }) {
  const userId = getCurrentUserId();
  const hasAttention = hasMailboxAttention(userId, Boolean(getLetterDraft(userId)?.content.trim()));
  return (
    <nav className="app-bottom-navigation" aria-label="주요 메뉴">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={item.id === active ? "is-active" : ""}
          aria-current={item.id === active ? "page" : undefined}
          onClick={() => navigateTo(item.path)}
        >
          <img className={`app-nav-mark app-nav-mark--${item.id}`} src={item.asset} alt="" aria-hidden="true" />
          {item.id === "mailbox" && showAttention && hasAttention && <><i className="app-nav-notice-dot" aria-hidden="true" /><span className="sr-only">확인이 필요한 편지함 소식이 있어요.</span></>}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
