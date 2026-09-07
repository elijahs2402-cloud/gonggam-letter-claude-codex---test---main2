/**
 * 모바일 키보드가 올라오면 iOS 는 레이아웃 뷰포트를 그대로 둔 채
 * 비주얼 뷰포트만 줄인다. 그래서 100dvh / 100vh 로는 실제 보이는 높이를
 * 알 수 없고, 키보드를 내린 뒤 헤더가 화면 밖으로 밀리거나 하단 버튼이
 * 어긋나 보인다. 실제로 보이는 높이를 CSS 변수로 내려준다.
 *
 * visualViewport 를 지원하지 않는 환경에서는 변수를 세우지 않으므로
 * CSS 의 100dvh 폴백이 그대로 쓰인다.
 */
export function installViewportHeightSync() {
  const viewport = typeof window !== "undefined" ? window.visualViewport : undefined;
  if (!viewport) return () => {};

  const root = document.documentElement;
  let frame = 0;

  const apply = () => {
    frame = 0;

    // iOS 는 키보드를 띄울 때 레이아웃 뷰포트를 그대로 둔 채 보이는 영역만
    // 위로 밀어 올린다(offsetTop). 그래서 '화면 바닥에서 키보드 윗면까지의
    // 거리'를 따로 계산해야 하단 바를 정확히 키보드 위에 세울 수 있다.
    const layoutHeight = document.documentElement.clientHeight;
    const rawInset = Math.round(layoutHeight - (viewport.height + viewport.offsetTop));
    // 주소창이 접히는 순간 1px 안팎의 오차가 생겨 바가 미세하게 떨린다.
    const inset = rawInset > 2 ? rawInset : 0;

    // 키보드가 열린 동안 셸까지 같이 줄이면, 셸 바닥이 보이는 영역 바닥보다
    // offsetTop 만큼 위에 놓여 그 아래가 빈 여백으로 남는다.
    // 셸은 레이아웃 높이를 그대로 쓰고, 키보드는 하단 바만 피하게 한다.
    const isIosStandalone =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      (("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true) ||
        window.matchMedia("(display-mode: standalone)").matches);
    // iOS 홈 화면 앱은 visual viewport와 clientHeight 모두 홈 인디케이터 높이만큼
    // 짧게 주는 경우가 있다. 이때 screen.height는 실제 독립 앱 창 높이이므로
    // 그것을 기준으로 셸을 채워야 화면 끝에 종이색 띠가 남지 않는다.
    const standaloneHeight = Math.round(window.screen?.height ?? 0);
    const measuredHeight = Math.max(layoutHeight, Math.round(viewport.height));
    const standaloneFill = isIosStandalone ? Math.max(0, standaloneHeight - measuredHeight) : 0;
    const shellHeight = isIosStandalone
      ? Math.max(measuredHeight, standaloneHeight)
      : inset > 0
        ? layoutHeight
        : Math.round(viewport.height);

    root.style.setProperty("--app-viewport-height", `${shellHeight}px`);
    root.style.setProperty("--app-keyboard-inset", `${inset}px`);
    root.style.setProperty("--app-standalone-fill", `${standaloneFill}px`);
    if (isIosStandalone) root.dataset.iosStandalone = "true";
    else delete root.dataset.iosStandalone;

    // 키보드가 올라오면 하단 바가 키보드 위로 올라서가므로,
    // 아래에 비워둔 안전영역(홈 인디케이터 자리)가 필요 없어진다.
    // CSS 는 길이 변수의 0 여부로 규칙을 갈라 쓸 수 없어,
    // 상태를 속성으로 내려 준다. index.css 의 [data-keyboard="open"] 규칙이 받는다.
    if (inset > 0) root.dataset.keyboard = "open";
    else delete root.dataset.keyboard;
  };
  // 키보드 전환 중에는 resize 가 연달아 오므로 프레임당 한 번만 반영한다.
  const schedule = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(apply);
  };

  apply();
  viewport.addEventListener("resize", schedule);
  viewport.addEventListener("scroll", schedule);
  window.addEventListener("orientationchange", schedule);

  return () => {
    if (frame) window.cancelAnimationFrame(frame);
    viewport.removeEventListener("resize", schedule);
    viewport.removeEventListener("scroll", schedule);
    window.removeEventListener("orientationchange", schedule);
    root.style.removeProperty("--app-viewport-height");
    root.style.removeProperty("--app-keyboard-inset");
    root.style.removeProperty("--app-standalone-fill");
    delete root.dataset.keyboard;
    delete root.dataset.iosStandalone;
  };
}
