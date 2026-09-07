import { useRef, useState } from "react";
import { getCurrentAppSearchParams, navigateBack, navigateTo } from "./navigation";
import { buildGuidedLetterDraft, ensureEmotionJourney, getEmotionRecord, hasGuidedAnswer, readEmotionJourney, saveEmotionRecord, updateEmotionJourney, type EmotionJourney, type EmotionType } from "./emotionJourney";

const CATEGORIES = [
  ["family", "가족이나 연인과 있었던 일", ["내 말을 제대로 들어주지 않았어요", "서운한 말이나 행동이 있었어요", "다투거나 오해가 생겼어요", "관계가 멀어진 것 같아요", "함께 좋은 시간을 보냈어요", "고맙거나 따뜻한 일이 있었어요"]],
  ["friend", "친구나 지인과 있었던 일", ["기대했던 반응을 받지 못했어요", "연락이나 관계 때문에 마음이 쓰여요", "서운한 일이 있었어요", "좋은 말이나 도움을 받았어요", "함께 즐거운 일이 있었어요", "오랜만에 반가운 일이 있었어요"]],
  ["work", "직장이나 학교에서 있었던 일", ["내 의견이 제대로 다뤄지지 않았어요", "노력한 만큼 인정받지 못했어요", "실수한 일이 마음에 남아요", "누군가의 말이나 태도가 신경 쓰여요", "좋은 결과나 칭찬을 받았어요", "해낸 일이 있어 뿌듯해요"]],
  ["self", "나 자신에 대한 생각", ["내가 부족하게 느껴졌어요", "내 선택이 맞는지 고민돼요", "자꾸 나를 다른 사람과 비교해요", "스스로 대견하게 느껴졌어요", "새로운 모습을 발견했어요", "용기를 낸 일이 있어요"]],
  ["life", "건강이나 생활에 관한 일", ["몸이 피곤하거나 좋지 않아요", "잠이나 생활 리듬이 흐트러졌어요", "해야 할 일이 많아 지쳤어요", "오랜만에 편안하게 쉬었어요", "생활 속 작은 변화가 기뻤어요", "몸과 마음이 가벼웠어요"]],
  ["good", "좋은 일이 있었어요", ["기대하던 일이 이루어졌어요", "누군가에게 좋은 말을 들었어요", "내가 해낸 일이 있어요", "소중한 사람과 좋은 시간을 보냈어요", "예상하지 못한 좋은 일이 있었어요", "평범하지만 편안한 하루였어요"]],
  ["ordinary", "특별한 일 없이 마음이 그래요", ["이유 없이 마음이 무거워요", "괜히 불안하거나 답답해요", "몸과 마음이 피곤해요", "여러 감정이 섞여 있어요", "평범하지만 편안한 하루예요", "특별한 이유 없이 기분이 좋아요", "아직 잘 모르겠어요"]],
] as const;
const EXTRA: Record<EmotionType, string[]> = { difficult: ["서운했어요", "답답했어요", "억울했어요", "실망했어요", "외로웠어요", "창피했어요", "불안했어요", "화가 났어요", "지쳤어요"], positive: ["기뻤어요", "편안했어요", "고마웠어요", "설렜어요", "뿌듯했어요", "안심됐어요", "사랑받는 느낌이었어요", "든든했어요"], uncertain: ["답답한 것 같아요", "지친 것 같아요", "불안한 것 같아요", "편안한 것 같아요", "기분이 좋은 것 같아요", "여러 감정이 섞인 것 같아요", "아직 잘 모르겠어요"] };
const Q3: Record<EmotionType, { title: string; guide: string; values: string[] }> = { difficult: { title: "무엇이 가장 마음에 걸리나요?", guide: "가장 가까운 문장을 골라보세요.", values: ["내 마음을 알아주지 않은 게 서운해요", "내 노력을 가볍게 본 것 같아요", "거절당하거나 밀려난 느낌이 들었어요", "내가 잘못한 건지 계속 생각나요", "앞으로 비슷한 일이 생길까 걱정돼요", "관계가 멀어질까 불안해요", "하고 싶은 말을 하지 못했어요", "기대했던 것과 달라 실망했어요", "무엇 때문인지 아직 잘 모르겠어요"] }, positive: { title: "무엇이 가장 기억에 남나요?", guide: "그 순간과 가장 가까운 것을 골라보세요.", values: ["누군가가 해준 말이 기억에 남아요", "그 사람의 표정이나 반응이 떠올라요", "내가 해냈다는 사실이 뿌듯해요", "함께한 시간이 좋았어요", "예상하지 못한 일이어서 더 기뻤어요", "평범하지만 편안한 순간이었어요", "내 마음이 달라진 느낌이 기억에 남아요", "특별한 이유 없이 기분이 좋았어요", "아직 잘 모르겠어요"] }, uncertain: { title: "지금 가장 크게 남아 있는 것은 무엇인가요?", guide: "생각, 장면, 몸의 느낌 중 무엇이든 괜찮아요.", values: ["자꾸 떠오르는 생각이 있어요", "마음이 답답한 느낌이에요", "몸이 피곤하거나 긴장돼 있어요", "어떤 장면이나 말이 떠올라요", "여러 마음이 섞여 있는 것 같아요", "특별한 이유는 잘 모르겠어요"] } };
const Q4: Record<EmotionType, { title: string; guide: string; values: string[] }> = { difficult: { title: "지금 어떤 도움이 필요할까요?", guide: "문제를 바로 해결하지 않아도 괜찮아요. 지금 필요한 마음부터 골라보세요.", values: ["그냥 내 이야기를 들어줬으면 해요", "내 마음을 이해받고 싶어요", "내 마음이 이상하지 않다고 확인받고 싶어요", "따뜻한 말을 듣고 싶어요", "생각을 차분히 정리하고 싶어요", "잠시 쉬고 싶어요", "내가 할 수 있는 작은 행동을 찾고 싶어요", "누군가와 나누고 싶어요", "아직 잘 모르겠어요"] }, positive: { title: "이 마음을 어떻게 남기고 싶나요?", guide: "지금의 마음을 간직하거나 누군가와 나눠볼 수 있어요.", values: ["나만의 기록으로 간직하고 싶어요", "누군가와 나누고 싶어요", "고마운 사람에게 전하고 싶어요", "미래의 나에게 남기고 싶어요", "편지로 적어보고 싶어요", "이 기분을 오래 기억하고 싶어요", "아직 잘 모르겠어요"] }, uncertain: { title: "지금은 무엇을 해보고 싶나요?", guide: "고르기만 해도 괜찮아요.", values: ["조금 더 적어보고 싶어요", "내 기록으로 남기고 싶어요", "누군가에게 이야기하고 싶어요", "잠시 쉬고 싶어요", "지금은 여기까지만 하고 싶어요", "아직 잘 모르겠어요"] } };
function Frame({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <main className={`mobile-prototype emotion-journey-screen ${className}`}>{children}</main>; }
function Topbar({ label, fallback }: { label: string; fallback: string }) { return <header className="emotion-journey-topbar"><button type="button" onClick={() => navigateBack(fallback)} aria-label="뒤로가기"><span aria-hidden="true">←</span></button><span>{label}</span><span aria-hidden="true" /></header>; }
function AutoHideScroll({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const [scrolling, setScrolling] = useState(false);
  const timer = useRef<number | null>(null);
  const onScroll = () => {
    setScrolling(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setScrolling(false), 700);
  };
  return <div className={`emotion-journey-scroll auto-hide-scroll ${className}${scrolling ? " is-scrolling" : ""}`} onScroll={onScroll}>{children}</div>;
}
function toggle(values: string[], value: string, limit: number) {
  if (values.includes(value)) return values.filter((item) => item !== value);
  if (limit === 1) return [value];
  return values.length < limit ? [...values, value] : values;
}
function Choices({ values, selected, limit = 1, onChange, onPick }: { values: string[]; selected: string[]; limit?: number; onChange: (next: string[]) => void; onPick?: (row: HTMLButtonElement) => void }) { return <div className="guided-choice-list" role="group">{values.map((value) => { const on = selected.includes(value); return <button key={value} type="button" className={on ? "is-selected" : ""} aria-pressed={on} onClick={(event) => { onChange(toggle(selected, value, limit)); onPick?.(event.currentTarget); }}><span>{value}</span><i className={on ? "" : "is-hidden"} aria-hidden="true">✓</i></button>; })}</div>; }
export function WritingMethodScreen() { const journey = ensureEmotionJourney(); const choose = (mode: "free" | "guided") => { updateEmotionJourney({ writingMode: mode, currentGuidedStep: 1 }); navigateTo(mode === "free" ? "/write-letter-a?journey=emotion" : "/guided-writing?step=1"); }; return <Frame className="writing-method-screen"><header className="emotion-journey-topbar"><button type="button" onClick={() => navigateTo("/emotion-check-in")} aria-label="뒤로가기"><span aria-hidden="true">←</span></button><span>마음 꺼내기</span><span aria-hidden="true" /></header><div className="emotion-journey-scroll"><header className="emotion-heading"><p className="emotion-kicker">지금의 마음 · {journey.emotion ?? ""}</p><h1>어떻게 마음을<br />꺼내볼까요?</h1><p>편한 방법으로 시작해도 괜찮아요.</p></header><section className="writing-method-options"><button type="button" onClick={() => choose("free")}><span className="writing-method-copy"><strong>자유롭게 적어보기</strong><span>지금 떠오르는 마음을 편지처럼 적어요.</span></span></button><button type="button" onClick={() => choose("guided")}><span className="writing-method-copy"><strong>질문을 따라 정리하기</strong><span>고르거나 짧게 답하며 마음을 하나씩 살펴봐요.</span></span></button></section></div></Frame>; }
export function GuidedWritingScreen() {
  const params = getCurrentAppSearchParams();
  const initial = ensureEmotionJourney();
  const step = Math.min(4, Math.max(1, Number(params.get("step")) || initial.currentGuidedStep));
  const [, refresh] = useState(0);
  const current = readEmotionJourney() ?? initial;
  const type = current.emotionType ?? "uncertain";
  const save = (patch: Partial<EmotionJourney>) => { updateEmotionJourney(patch); refresh((x) => x + 1); };
  const go = (next: number) => { updateEmotionJourney({ currentGuidedStep: next, writingMode: "guided" }); navigateTo(`/guided-writing?step=${next}`); };
  const next = () => step === 4 ? navigateTo("/emotion-after") : go(step + 1);
  const skip = () => { save(step === 1 ? { situationAnswerMode: "skipped" } : step === 2 ? { emotionAnswerMode: "skipped" } : step === 3 ? { question3AnswerMode: "skipped" } : { question4AnswerMode: "skipped" }); next(); };
  const bringRowToTop = (row: HTMLButtonElement) => {
    window.setTimeout(() => {
      const scrollRegion = row.closest<HTMLElement>(".guided-writing-scroll");
      if (!scrollRegion) return;
      const rowTop = row.getBoundingClientRect().top;
      const regionTop = scrollRegion.getBoundingClientRect().top;
      scrollRegion.scrollTo({
        top: scrollRegion.scrollTop + rowTop - regionTop - 14,
        behavior: "smooth",
      });
    }, 80);
  };
  const directInputMissing = (step === 1 && current.situationAnswerMode === "custom" && !current.situationCustomText.trim()) || (step === 2 && current.emotionAnswerMode === "custom" && !current.customEmotionText.trim()) || (step === 3 && current.question3AnswerMode === "custom" && !current.question3CustomText.trim()) || (step === 4 && current.question4AnswerMode === "custom" && !current.question4CustomText.trim());
  let content: React.ReactNode;
  if (step === 1) {
    const category = CATEGORIES.find(([id]) => id === current.situationCategoryId);
    content = <>
      <h1>어떤 일이 있었나요?</h1>
      <p>가까운 상황을 고르거나, 기억나는 내용을 짧게 남겨보세요.</p>
      <Choices
        values={[...CATEGORIES.map(([, label]) => label), "직접 적을게요"]}
        selected={[current.situationCategoryText || (current.situationAnswerMode === "custom" ? "직접 적을게요" : "")].filter(Boolean)}
        onChange={([selected]) => {
          if (selected === "직접 적을게요") {
            save({ situationCategoryId: "custom", situationCategoryText: selected, situationAnswerMode: "custom", situationDetailId: "", situationDetailText: "" });
            return;
          }
          const found = CATEGORIES.find(([, label]) => label === selected);
          save({ situationCategoryId: found?.[0] ?? "", situationCategoryText: selected ?? "", situationDetailId: "", situationDetailText: "", situationAnswerMode: "selection" });
        }}
        onPick={bringRowToTop}
      />
      {category && <>
        <p className="guided-inline-guide">가까운 내용을 하나 골라보세요.</p>
        <Choices
          values={[...category[2], "직접 적을게요"]}
          selected={[current.situationDetailText || (current.situationAnswerMode === "custom" ? "직접 적을게요" : "")].filter(Boolean)}
          onChange={([selected]) => selected === "직접 적을게요" ? save({ situationAnswerMode: "custom", situationDetailId: "", situationDetailText: "" }) : save({ situationDetailId: selected ?? "", situationDetailText: selected ?? "", situationAnswerMode: "selection" })}
          onPick={bringRowToTop}
        />
      </>}
      {(current.situationAnswerMode === "custom" || Boolean(current.situationDetailText)) && <>
        <label htmlFor="guided-situation">조금 더 남기고 싶은 말이 있나요?</label>
        <textarea id="guided-situation" value={current.situationCustomText} onChange={(e) => save({ situationCustomText: e.target.value, situationAnswerMode: current.situationDetailText ? "selection-with-text" : "custom" })} placeholder="한 단어나 짧은 문장만 적어도 괜찮아요." rows={current.situationAnswerMode === "custom" ? 5 : 3} />
      </>}
    </>;
  }
  else if (step === 2) { const selectedFeelings = current.additionalEmotionTexts.length ? current.additionalEmotionTexts : current.additionalEmotionIds.includes("enough") ? ["이 마음만으로 충분해요"] : current.additionalEmotionIds.includes("custom") ? ["다른 마음이 있어요"] : []; content = <><h1>그때 어떤 마음이 들었나요?</h1><p>처음에는 ‘{current.emotion}’에 가깝다고 느꼈어요.</p><p className="guided-inline-guide">함께 느껴진 마음이 있나요? 최대 2개까지 고를 수 있어요.</p><Choices values={[...EXTRA[type], "이 마음만으로 충분해요", "다른 마음이 있어요"]} selected={selectedFeelings} limit={2} onChange={(selected) => { if (selected.includes("이 마음만으로 충분해요")) save({ additionalEmotionIds: ["enough"], additionalEmotionTexts: [], customEmotionText: "", emotionAnswerMode: "selection" }); else if (selected.includes("다른 마음이 있어요")) { const emotions = selected.filter((x) => x !== "다른 마음이 있어요"); save({ additionalEmotionIds: [...emotions, "custom"], additionalEmotionTexts: emotions, emotionAnswerMode: "custom" }); } else save({ additionalEmotionIds: selected, additionalEmotionTexts: selected, emotionAnswerMode: selected.length ? "selection" : "skipped" }); }} />{current.emotionAnswerMode === "custom" && <><label htmlFor="guided-emotion-custom">다른 마음을 짧게 적어주세요.</label><input id="guided-emotion-custom" value={current.customEmotionText} onChange={(e) => save({ customEmotionText: e.target.value, emotionAnswerMode: "custom" })} placeholder="한마디만 남겨도 충분해요." /></>}</>; }
  else if (step === 3) { const q = Q3[type]; content = <><h1>{q.title}</h1><p>{q.guide}</p><Choices values={[...q.values, "직접 적을게요"]} selected={[current.question3OptionText || (current.question3AnswerMode === "custom" ? "직접 적을게요" : "")].filter(Boolean)} onChange={([selected]) => selected === "직접 적을게요" ? save({ question3OptionId: "", question3OptionText: "", question3AnswerMode: "custom" }) : save({ question3OptionId: selected ?? "", question3OptionText: selected ?? "", question3AnswerMode: selected ? "selection" : "skipped" })} />{(current.question3AnswerMode === "custom" || current.question3OptionText) && <><label htmlFor="guided-q3">한마디 덧붙이고 싶다면</label><textarea id="guided-q3" value={current.question3CustomText} onChange={(e) => save({ question3CustomText: e.target.value, question3AnswerMode: current.question3OptionText ? "selection-with-text" : "custom" })} placeholder="한 단어나 짧은 문장만 적어도 괜찮아요." rows={current.question3AnswerMode === "custom" ? 5 : 3} /></>}</>; }
  else { const q = Q4[type]; content = <><h1>{q.title}</h1><p>{q.guide}</p><p className="guided-selection-limit">최대 2개까지 고를 수 있어요.</p><Choices values={[...q.values, "직접 적을게요"]} selected={current.question4OptionTexts.length ? current.question4OptionTexts : current.question4AnswerMode === "custom" ? ["직접 적을게요"] : []} limit={2} onChange={(selected) => { const custom = selected.includes("직접 적을게요"); save({ question4OptionIds: selected.filter((x) => x !== "직접 적을게요"), question4OptionTexts: selected.filter((x) => x !== "직접 적을게요"), question4AnswerMode: custom ? "custom" : selected.length ? "selection" : "skipped" }); }} />{current.question4AnswerMode === "custom" && <><label htmlFor="guided-q4">직접 남기고 싶은 말이 있나요?</label><textarea id="guided-q4" value={current.question4CustomText} onChange={(e) => save({ question4CustomText: e.target.value, question4AnswerMode: "custom" })} placeholder="한마디만 남겨도 충분해요." rows={5} /></>}</>; }
  const needsDirectEntrySpace = step === 1 && (current.situationAnswerMode === "custom" || Boolean(current.situationDetailText));
  return <Frame className="guided-writing-screen"><Topbar label="질문을 따라 정리하기" fallback={step === 1 ? "/writing-method" : `/guided-writing?step=${step - 1}`} /><AutoHideScroll className="guided-writing-scroll"><p className="guided-step">{step} / 4</p><section className={`guided-question${needsDirectEntrySpace ? " is-direct-input" : ""}`}>{content}</section></AutoHideScroll><div className="emotion-fixed-action guided-actions"><button type="button" className="guided-skip" onClick={skip}>건너뛸래요</button><button type="button" className="emotion-primary-button" onClick={next} disabled={directInputMissing}>{step === 4 ? "내 마음을 정리해볼게요" : "다음"}</button></div></Frame>; }
function SummaryBody({ journey, readOnly = false }: { journey: EmotionJourney; readOnly?: boolean }) { const type = journey.emotionType ?? "uncertain"; const labels = type === "positive" ? ["있었던 일", "느낀 마음", "가장 기억에 남은 것", "이 마음을 남기고 싶은 방법"] : type === "uncertain" ? ["떠오른 상황", "가까웠던 마음", "가장 크게 남은 것", "지금 해보고 싶은 것"] : ["있었던 일", "느낀 마음", "가장 마음에 걸린 부분", "지금 필요한 것"]; const values = [journey.situationCustomText || journey.situationDetailText, [journey.emotion, ...journey.additionalEmotionTexts, journey.customEmotionText].filter(Boolean).join(", "), journey.question3CustomText || journey.question3OptionText, [...journey.question4OptionTexts, journey.question4CustomText].filter(Boolean).join(", ")]; return <section className="guided-summary-paper"><dl>{values.map((value, i) => value && <div key={labels[i]}><dt>{labels[i]}</dt><dd>{value}</dd></div>)}{journey.changeAfter && <div><dt>마음을 적은 뒤의 변화</dt><dd>{journey.changeAfter}</dd></div>}</dl>{readOnly && <p className="guided-readonly-note">질문을 따라 정리한 마음</p>}</section>; }
export function GuidedSummaryScreen() { const id = getCurrentAppSearchParams().get("record"); const journey = (id ? getEmotionRecord(id) : null) ?? readEmotionJourney(); const [saved, setSaved] = useState(false); if (!journey || journey.writingMode !== "guided" || !journey.emotion || !journey.changeAfter) return <Frame><Topbar label="마음 확인" fallback="/emotion-check-in" /><section className="emotion-missing-state"><h1>정리한 마음을 찾지 못했어요</h1></section></Frame>; const type = journey.emotionType ?? "uncertain"; const title = type === "positive" ? "오늘의 마음을\n소중히 남겼어요" : type === "uncertain" ? "지금의 마음을\n천천히 살펴봤어요" : "오늘의 마음을\n하나씩 정리했어요"; const shareLabel = "이 마음을 편지로 보내기"; const save = () => { if (saveEmotionRecord("private")) setSaved(true); }; const actions = <div className="emotion-summary-actions"><button type="button" className="emotion-primary-button" onClick={save}>나만 간직하기</button><button type="button" className="emotion-secondary-button" onClick={() => { updateEmotionJourney({ content: buildGuidedLetterDraft(journey), title: "", writingMode: "guided" }); navigateTo("/write-letter-a?journey=guided&delivery=1"); }}>{shareLabel}</button><button type="button" className="emotion-text-button" onClick={() => navigateTo(`/guided-writing?step=${journey.currentGuidedStep}`)}>조금 더 정리할래요</button></div>; return <Frame className="guided-summary-screen"><Topbar label="마음 확인" fallback="/emotion-after" /><div className="emotion-journey-scroll"><header className="emotion-heading emotion-summary-heading"><p className="emotion-kicker">오늘의 기록</p><h1>{title.split("\n").map((line) => <span key={line}>{line}<br /></span>)}</h1></header><SummaryBody journey={journey} readOnly={Boolean(id)} />{saved && <p className="guided-saved">이 마음을 이 기기에 간직했어요.</p>}</div>{!id && !saved && <div className="emotion-fixed-action emotion-summary-fixed-action">{actions}</div>}{saved && <div className="emotion-fixed-action emotion-summary-fixed-action"><button type="button" className="emotion-primary-button" onClick={() => navigateTo("/mailbox")}>편지함에서 보기</button></div>}</Frame>; }
