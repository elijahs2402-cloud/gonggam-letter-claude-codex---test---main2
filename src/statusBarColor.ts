// 상단 status bar(시계·배터리가 있는 띠)의 배경을 현재 화면 배경에 맞춘다.
//
// 왜 필요한가: 이 띠는 페이지가 아니라 브라우저·OS 가 칠한다. index.html 에
// theme-color 메타가 없어서 브라우저 기본 회색이 그대로 보이고 있었다.
// theme-color 를 넣으면 그 색으로 칠해지고, 값을 바꾸면 따라 바뀐다.
//
// 한계: theme-color 는 '색 하나'만 받는다. 종이결 texture 는 넣을 수 없다.
// texture 까지 이으려면 페이지가 status bar 아래까지 그려져야 하는데,
// 그건 viewport-fit=cover + 홈 화면에 추가(standalone) 조합에서만 된다.

const META_NAME = "theme-color";

function getMeta(): HTMLMetaElement {
  const found = document.querySelector<HTMLMetaElement>(`meta[name="${META_NAME}"]`);
  if (found) return found;
  const created = document.createElement("meta");
  created.name = META_NAME;
  document.head.appendChild(created);
  return created;
}

// paper-pattern.jpg 의 평균색.
//
// 화면들은 이 종이결을 배경 이미지로 깔고 그 위에 반투명 단색을 덧씌운다.
// 그래서 눈에 보이는 색은 background-color 가 아니라 '덧씌운 색 + 종이결'의
// 합성 결과다. 종이결(250,247,235)이 매트색(216,208,195)보다 훨씬 밝아서,
// 덧씌운 색이 옅을수록(편지 읽기 화면은 40%) 둘의 차이가 크게 벌어진다.
//
// 이 값은 에셋을 캔버스에 그려 픽셀 평균을 낸 결과다. paper-pattern.jpg 를
// 바꾸면 여기도 다시 재야 한다.
const PAPER_AVERAGE = [250, 247, 235];

// "rgba(216, 208, 195, 0.4)" / "rgb(216, 208, 195)" 를 [r,g,b,a] 로 읽는다.
function parseColor(value: string) {
  const found = value.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.]+)\s*)?\)/);
  if (!found) return undefined;
  return [Number(found[1]), Number(found[2]), Number(found[3]), found[4] === undefined ? 1 : Number(found[4])];
}

// 종이결이 깔린 화면이면 실제로 보이는 합성색을 돌려준다.
// 종이결 jpg 는 불투명하므로 그 아래의 background-color 는 보이지 않는다 —
// 덧씌운 단색과 종이결, 이 둘만 섞으면 된다.
function compositeColor(style: CSSStyleDeclaration) {
  if (!style.backgroundImage.includes("paper-pattern")) return undefined;
  const overlay = parseColor(style.backgroundImage);
  if (!overlay) return `rgb(${PAPER_AVERAGE.join(", ")})`;
  const alpha = overlay[3];
  const mixed = PAPER_AVERAGE.map((paper, index) => Math.round(overlay[index] * alpha + paper * (1 - alpha)));
  return `rgb(${mixed.join(", ")})`;
}

// 화면 맨 위를 실제로 덮는 요소에서 색을 읽는다.
// .mobile-prototype 이 화면마다 자기 배경을 갖고, 없으면 #root 가 받는다.
function readScreenColor(): string | undefined {
  const target =
    document.querySelector<HTMLElement>(".mobile-prototype") ??
    document.getElementById("root");
  if (!target) return undefined;
  const style = window.getComputedStyle(target);
  const composited = compositeColor(style);
  if (composited) return composited;
  const color = style.backgroundColor;
  // 투명하면 이 요소가 아니라 조상이 칠하고 있다는 뜻이라 건너뛴다.
  if (!color || color === "transparent" || color.startsWith("rgba(0, 0, 0, 0)")) {
    const root = document.getElementById("root");
    return root ? window.getComputedStyle(root).backgroundColor : undefined;
  }
  return color;
}

function sync() {
  const color = readScreenColor();
  if (!color) return;
  const meta = getMeta();
  if (meta.content !== color) meta.content = color;

  // status bar 띠는 브라우저 기본색이 아니라 body 의 배경색으로 칠해진다.
  // body 는 넓은 화면에서 칼럼 바깥을 칠하는 '책상 매트'(--bg-app, #d8d0c3)를
  // 쓰고 있어서, 폰에서는 본문과 다른 회색 띠로만 보였다.
  // 칼럼이 화면을 꽉 채우는 폭에서만 화면 배경을 따라가게 한다.
  const fillsScreen = window.matchMedia("(max-width: 479px)").matches;
  document.body.style.backgroundColor = fillsScreen ? color : "";
}

export function installStatusBarColorSync() {
  // 첫 페인트 뒤에 한 번. 화면 전환은 대부분 페이지를 새로 불러오므로
  // 이 한 번으로 화면마다 다시 계산된다.
  requestAnimationFrame(sync);
  // 셸(나의 공간·홈)은 새로고침 없이 pushState 로만 화면을 갈아끼우므로
  // 그때도 다시 맞춘다.
  window.addEventListener("popstate", () => requestAnimationFrame(sync));
  window.addEventListener("resize", () => requestAnimationFrame(sync));
  // 모달·시트가 배경을 덮는 경우까지 따라가도록 클래스 변화도 지켜본다.
  const observer = new MutationObserver(() => requestAnimationFrame(sync));
  const root = document.getElementById("root");
  if (root) observer.observe(root, { childList: true, subtree: false, attributes: true, attributeFilter: ["class"] });
}
