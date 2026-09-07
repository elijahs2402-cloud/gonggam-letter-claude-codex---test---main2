/**
 * 날짜·시간 표기를 앱 전체에서 하나로 맞춘다.
 *
 * 이전에는 화면마다 Intl.DateTimeFormat 을 따로 불러 써서
 * "2026년 9월 1일" · "9월 1일" · "2026. 9. 1." · "오후 2:20" 이
 * 뒤섞여 있었다. 같은 정보가 화면마다 다른 얼굴을 하고 있었다.
 *
 * 표기 규칙
 *   날짜  2026.9.1      — 연도를 늘 붙이되 짧게. 앞자리 0 없음
 *   시각  pm 2:20       — 12시간제, 시는 0 없이, 분은 두 자리
 *   합계  2026.9.1 pm 2:20
 *
 * 사용자의 로컬 시간대로 표시한다(Intl 기본 동작과 같다).
 */

function parse(value: string | number | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** 2026.9.1 */
export function formatDate(value?: string | number | Date) {
  const date = value === undefined ? undefined : parse(value);
  if (!date) return "";
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
}

/** pm 2:20 — 자정은 am 12:00, 정오는 pm 12:00 */
export function formatTime(value?: string | number | Date) {
  const date = value === undefined ? undefined : parse(value);
  if (!date) return "";
  const hours = date.getHours();
  const meridiem = hours < 12 ? "am" : "pm";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${meridiem} ${hour12}:${minutes}`;
}

/** 2026.9.1 pm 2:20 */
export function formatDateTime(value?: string | number | Date) {
  const date = value === undefined ? undefined : parse(value);
  if (!date) return "";
  return `${formatDate(date)} ${formatTime(date)}`;
}
