/**
 * 입력창 밖의 빈 곳을 탭하면 키보드를 내린다.
 *
 * iOS 는 포커스를 받지 않는 요소(빈 여백, 본문, 제목 등)를 탭해도
 * 입력창의 포커스를 그대로 두기 때문에 키보드가 계속 떠 있다.
 * 안드로이드도 동작이 제각각이라 직접 blur 해 주는 편이 예측 가능하다.
 *
 * 화면마다 붙이지 않고 문서 전체에 한 번만 건다. 입력이 있는 화면이면
 * 자동으로 적용되고, 없는 화면에서는 아무 일도 하지 않는다.
 */

/** 눌렀을 때 키보드를 내리면 안 되는 것들 — 그쪽 동작에 맡긴다. */
const INTERACTIVE_SELECTOR =
  'input, textarea, select, button, a, label, [contenteditable], [role="button"], [role="textbox"]';

function isTextEntry(element: Element | null): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false;
  return element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.isContentEditable;
}

export function installTapToDismissKeyboard() {
  if (typeof document === "undefined") return () => {};

  const handlePointerDown = (event: Event) => {
    const active = document.activeElement;
    if (!isTextEntry(active)) return;

    const target = event.target;
    // 다른 입력창·버튼·링크를 눌렀다면 건드리지 않는다.
    // pointerdown 시점에 blur 하면 레이아웃이 움직여 이어질 click 이
    // 엉뚱한 곳에 떨어질 수 있어서, 조작 요소는 반드시 걸러내야 한다.
    if (target instanceof Element && target.closest(INTERACTIVE_SELECTOR)) return;

    active.blur();
  };

  // 캡처 단계에서 받아 화면별 핸들러가 이벤트를 막아도 동작하게 한다.
  document.addEventListener("pointerdown", handlePointerDown, true);

  return () => {
    document.removeEventListener("pointerdown", handlePointerDown, true);
  };
}
