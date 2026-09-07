import { useState } from "react";
import { navigateBack, navigateTo } from "./navigation";
import {
  EMOTIONS,
  EMOTION_TYPE_BY_EMOTION,
  clearEmotionJourney,
  ensureEmotionJourney,
  hasGuidedAnswer,
  readEmotionJourney,
  saveEmotionRecord,
  updateEmotionJourney,
  type Emotion,
  type EmotionChange,
} from "./emotionJourney";

const EMOTION_CHANGE_ICONS: Partial<Record<EmotionChange, string>> = {
  "조금 가벼워졌어요": "/assets/emotion-after-lighter-icon.png",
  "처음과 비슷해요": "/assets/emotion-after-similar-icon.png",
  "아직 더 복잡해요": "/assets/emotion-after-complex-icon.png",
};

const CHANGES = {
  difficult: ["조금 가벼워졌어요", "처음과 비슷해요", "아직 더 복잡해요"],
  positive: ["이 마음이 더 선명해졌어요", "처음과 비슷해요", "다른 마음도 함께 떠올랐어요"],
  uncertain: ["조금 알 것 같아요", "처음과 비슷해요", "아직 잘 모르겠어요"],
} as const;

function EmotionFrame({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <main className={`mobile-prototype emotion-journey-screen ${className}`}>{children}</main>;
}

function EmotionTopbar({ label, fallback }: { label: string; fallback: string }) {
  return (
    <header className="emotion-journey-topbar">
      <button type="button" onClick={() => navigateBack(fallback)} aria-label="뒤로가기">
        <span aria-hidden="true">←</span>
      </button>
      <span>{label}</span>
      <span aria-hidden="true" />
    </header>
  );
}

function MissingJourney() {
  return (
    <section className="emotion-missing-state">
      <p className="emotion-kicker">마음 기록</p>
      <h1>먼저 지금의 마음을 골라주세요</h1>
      <p>마음의 이름과 느껴진 정도를 고르면 편지를 이어서 쓸 수 있어요.</p>
      <button type="button" className="emotion-primary-button" onClick={() => navigateTo("/emotion-check-in")}>마음 상태 고르기</button>
    </section>
  );
}

export function EmotionCheckInScreen() {
  const [emotion, setEmotion] = useState<Emotion | null>(() => ensureEmotionJourney().emotion);
  const [weight, setWeight] = useState<number | null>(() => ensureEmotionJourney().emotionIntensity ?? ensureEmotionJourney().weightBefore);

  const selectEmotion = (value: Emotion) => {
    setEmotion(value);
    updateEmotionJourney({ emotion: value, emotionType: EMOTION_TYPE_BY_EMOTION[value] });
  };

  const selectWeight = (value: number) => {
    setWeight(value);
    updateEmotionJourney({ emotionIntensity: value });
  };

  const continueWriting = () => {
    if (!emotion || !weight) return;
    updateEmotionJourney({ emotion, emotionType: EMOTION_TYPE_BY_EMOTION[emotion], emotionIntensity: weight });
    navigateTo("/writing-method");
  };

  return (
    <EmotionFrame className="emotion-check-in-screen">
      <header className="emotion-journey-topbar">
        <button type="button" onClick={() => navigateTo("/direction-a")} aria-label="뒤로가기">
          <span aria-hidden="true">←</span>
        </button>
        <span>마음 살피기</span>
        <span aria-hidden="true" />
      </header>
      <div className="emotion-journey-scroll">
        <header className="emotion-heading">
          <p className="emotion-kicker">오늘의 마음</p>
          <h1>지금 마음은 어떤가요?</h1>
          <p>가장 가까운 마음 하나를 골라주세요.</p>
        </header>

        <fieldset className="emotion-choice-fieldset">
          <legend className="sr-only">지금 마음 선택</legend>
          <div className="emotion-choice-grid">
            {EMOTIONS.map((item) => (
              <button
                key={item}
                type="button"
                className={emotion === item ? "is-selected" : ""}
                aria-pressed={emotion === item}
                onClick={() => selectEmotion(item)}
              >
                <span>{item}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="emotion-weight-fieldset">
          <legend>지금 이 마음은 얼마나 크게 느껴지나요?</legend>
          <div className="emotion-weight-scale" role="radiogroup" aria-label="감정의 강도">
            <img className="emotion-weight-pen-line" src="/assets/emotion-weight-pen-pressure-line.png" alt="" aria-hidden="true" />
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={weight === value}
                aria-label={`${value}단계`}
                className={weight === value ? "is-selected" : ""}
                onClick={() => selectWeight(value)}
              >
                <small>{value}</small>
              </button>
            ))}
          </div>
          <p className="emotion-weight-caption" aria-live="polite">
            {weight ? (weight === 1 ? "작게 느껴져요" : weight === 5 ? "아주 크게 느껴져요" : `${weight} 정도로 느껴져요`) : "1부터 5까지 골라주세요."}
          </p>
        </fieldset>
      </div>
      <div className="emotion-fixed-action">
        <button type="button" className="emotion-primary-button" onClick={continueWriting} disabled={!emotion || !weight}>
          마음을 적어볼게요
        </button>
      </div>
    </EmotionFrame>
  );
}

export function EmotionAfterScreen() {
  const [journey] = useState(readEmotionJourney);
  const [change, setChange] = useState<EmotionChange | null>(() => journey?.changeAfter ?? null);
  const type = journey?.emotionType ?? (journey?.emotion ? EMOTION_TYPE_BY_EMOTION[journey.emotion] : "uncertain");

  const guidedHasAnswer = hasGuidedAnswer(journey);
  if (!journey?.emotion || !(journey.emotionIntensity ?? journey.weightBefore) || (journey.writingMode === "guided" ? !guidedHasAnswer : !journey.content.trim())) {
    return (
      <EmotionFrame>
        <EmotionTopbar label="마음 돌아보기" fallback={journey?.writingMode === "guided" ? "/guided-writing?step=4" : "/write-letter-a?journey=emotion"} />
        <MissingJourney />
      </EmotionFrame>
    );
  }

  const chooseChange = (value: EmotionChange) => {
    setChange(value);
    updateEmotionJourney({ changeAfter: value });
  };

  return (
    <EmotionFrame className="emotion-after-screen">
      <EmotionTopbar label="마음 돌아보기" fallback={journey.writingMode === "guided" ? "/guided-writing?step=4" : "/write-letter-a?journey=emotion"} />
      <div className="emotion-journey-scroll">
        <header className="emotion-heading emotion-heading--after">
          <p className="emotion-kicker">편지를 쓴 뒤</p>
          <h1>
            마음을 꺼내놓은 지금,
            <br />
            처음보다 조금 달라졌나요?
          </h1>
          <p>맞고 틀린 답은 없어요. 지금과 가까운 느낌을 골라주세요.</p>
        </header>
        <fieldset className="emotion-after-fieldset">
          <legend className="sr-only">편지를 쓴 뒤의 마음 변화</legend>
          {CHANGES[type].map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={change === item}
              className={change === item ? "is-selected" : ""}
              onClick={() => chooseChange(item)}
            >
              <span>{item}</span>
              <img className="emotion-after-change-icon" src={EMOTION_CHANGE_ICONS[item] ?? "/assets/emotion-after-similar-icon.png"} alt="" aria-hidden="true" />
            </button>
          ))}
        </fieldset>
      </div>
      <div className="emotion-fixed-action">
        <button
          type="button"
          className="emotion-primary-button"
          disabled={!change}
          onClick={() => change && navigateTo(journey.writingMode === "guided" ? "/guided-summary" : "/emotion-summary")}
        >
          내 마음 확인하기
        </button>
      </div>
    </EmotionFrame>
  );
}

export function EmotionSummaryScreen() {
  const [journey] = useState(readEmotionJourney);
  const [savedPrivately, setSavedPrivately] = useState(false);
  const type = journey?.emotionType ?? (journey?.emotion ? EMOTION_TYPE_BY_EMOTION[journey.emotion] : "uncertain");

  if (!journey?.emotion || !(journey.emotionIntensity ?? journey.weightBefore) || !journey.changeAfter || !journey.content.trim()) {
    return (
      <EmotionFrame>
        <EmotionTopbar label="마음 확인" fallback="/emotion-after" />
        <MissingJourney />
      </EmotionFrame>
    );
  }

  if (savedPrivately) {
    return (
      <EmotionFrame className="emotion-summary-screen emotion-summary-complete">
        <EmotionTopbar label="보관 완료" fallback="/direction-a" />
        <section className="emotion-complete-state" role="status">
          <p className="emotion-kicker">나만의 기록</p>
          <h1>오늘의 마음을<br />조용히 간직했어요</h1>
          <p>이 마음은 이 기기에만 조용히 남아요.</p>
          <div className="emotion-complete-actions">
            <button type="button" className="emotion-primary-button" onClick={() => navigateTo("/mailbox")}>편지함으로 이동</button>
            <button type="button" className="emotion-text-button" onClick={() => navigateTo("/direction-a")}>마음 선택으로 돌아가기</button>
          </div>
        </section>
      </EmotionFrame>
    );
  }

  const keepPrivately = () => {
    if (!saveEmotionRecord("private")) return;
    clearEmotionJourney();
    setSavedPrivately(true);
  };

  return (
    <EmotionFrame className="emotion-summary-screen">
      <EmotionTopbar label="마음 확인" fallback="/emotion-after" />
      <div className="emotion-journey-scroll">
        <header className="emotion-heading emotion-summary-heading">
          <p className="emotion-kicker">오늘의 기록</p>
          <h1>{type === "positive" ? "오늘의 마음을 소중히 남겼어요" : type === "uncertain" ? "지금의 마음을 천천히 살펴봤어요" : "오늘의 마음을 하나씩 정리했어요"}</h1>
        </header>

        <section className="emotion-summary-paper" aria-label="오늘의 마음 기록">
          <dl>
            <div><dt>처음의 마음</dt><dd>{journey.emotion}</dd></div>
            <div><dt>이 마음이 느껴진 정도</dt><dd>{journey.emotionIntensity ?? journey.weightBefore} / 5</dd></div>
            <div><dt>편지를 쓴 뒤</dt><dd>{journey.changeAfter}</dd></div>
          </dl>
          <blockquote>{journey.content}</blockquote>
        </section>

        <p className="emotion-summary-message">
          마음을 말로 꺼내놓은 것만으로도
          <br />
          지금의 나를 이해하는 첫걸음이 될 수 있어요.
        </p>

      </div>
      <div className="emotion-fixed-action emotion-summary-fixed-action">
        <div className="emotion-summary-actions">
          <button type="button" className="emotion-primary-button" onClick={keepPrivately}>나만 간직하기</button>
          <button type="button" className="emotion-secondary-button" onClick={() => navigateTo("/write-letter-a?journey=emotion&delivery=1")}>{type === "positive" ? "이 마음을 편지로 남기기" : type === "uncertain" ? "이 마음을 편지로 적어보기" : "익명 편지로 다듬기"}</button>
          <button type="button" className="emotion-text-button" onClick={() => navigateTo("/write-letter-a?journey=emotion")}>조금 더 적어볼래요</button>
        </div>
      </div>
    </EmotionFrame>
  );
}
