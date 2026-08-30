import { navigateBack, navigateTo } from "./navigation";

const TERMS_SECTIONS = [
  {
    title: "1. 이용약관 동의",
    body: "공감편지를 이용함으로써 본 이용약관에 동의하게 됩니다.\n서비스를 이용하기 전 아래 내용을 확인해주세요.",
  },
  {
    title: "2. 서비스 이용 방식",
    body: "공감편지는 익명으로 자신의 이야기를 편지로 작성하고, 다른 이용자의 편지를 읽고 답장을 전할 수 있는 서비스입니다.\n\n내가 작성한 편지는 다른 익명의 이용자에게 전달되어 읽힐 수 있습니다.\n편지를 받은 이용자에게 답장 의무는 없으며, 답장의 도착 여부나 시점은 보장되지 않습니다.",
  },
  {
    title: "3. 사용자 행동 규칙",
    body: "안전한 공감 공간을 위해 다음 행위는 금지됩니다.",
    list: [
      "혐오 발언, 괴롭힘, 위협",
      "성적으로 노골적이거나 부적절한 콘텐츠",
      "스팸 또는 의미 없는 반복 콘텐츠",
      "전화번호, 주소, SNS ID 등 개인 연락처 공유",
      "다른 이용자에게 개인정보 또는 연락처를 요구하는 행위",
      "불법적인 활동을 조장하는 내용",
    ],
    footer: "위반 시 콘텐츠가 제한 또는 삭제되거나 서비스 이용이 제한될 수 있습니다.",
  },
  {
    title: "4. 콘텐츠 안전검토 및 신고",
    body: "편지와 답장은 안전한 서비스 제공을 위해 자동화된 시스템을 통해 검토될 수 있습니다.\n\n신고된 콘텐츠는 운영자가 확인할 수 있으며, 이용약관이나 운영정책을 위반한 경우 필요한 조치가 이루어질 수 있습니다.",
  },
  {
    title: "5. 계정 및 콘텐츠 이용 제한",
    body: "이용약관을 위반한 경우 해당 콘텐츠를 삭제하거나 이용을 제한하고, 반복 또는 중대한 위반 시 계정을 정지하거나 삭제할 수 있습니다.",
  },
  {
    title: "6. 서비스의 범위",
    body: "공감편지는 이용자 간의 공감과 편지 교환을 돕는 서비스이며, 의료·심리치료 또는 전문 상담 서비스를 제공하지 않습니다.",
  },
  {
    title: "7. 이용 연령",
    body: "공감편지는 만 14세 이상의 이용자만 이용할 수 있습니다.",
  },
];

export function TermsMockupScreen() {
  return (
    <main className="mobile-prototype auth-screen terms-screen">

      <header className="auth-header">
        <button type="button" onClick={() => navigateBack("/my-space")} aria-label="이전 화면으로 돌아가기">←</button>
        <span>서비스 이용약관</span>
        <i aria-hidden="true" />
      </header>

      <div className="auth-scroll terms-policy-scroll">
        <section className="terms-policy-document" aria-label="서비스 이용약관 본문">
          {TERMS_SECTIONS.map((section) => (
            <article key={section.title}>
              <h2>{section.title}</h2>

              {section.body && (
                <p>{section.body}</p>
              )}

              {section.list && (
                <ul>
                  {section.list.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}

              {section.footer && (
                <aside>{section.footer}</aside>
              )}
            </article>
          ))}
        </section>
      </div>

      <footer className="auth-actions">
        <button
          type="button"
          className="auth-primary"
          onClick={() => navigateTo("/nickname-entry")}
        >
          동의하고 계속하기
        </button>
      </footer>
    </main>
  );
}
