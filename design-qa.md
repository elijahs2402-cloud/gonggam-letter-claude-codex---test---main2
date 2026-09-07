**Comparison target**

- Source visual truth: `C:\Users\elija\AppData\Local\Temp\codex-clipboard-1dc80b97-255a-44b2-ae3e-7e5273ac6ebb.png` (853 × 1848 px).
- Implementation: `D:\TEST_AI\gonggam-letter-claude-codex\safety-management-render.png`, captured from `http://127.0.0.1:8443/safety-management` at a 1280 × 720 browser viewport; the 390 × 720 mobile-prototype region was used for comparison.
- Comparison evidence: `D:\TEST_AI\gonggam-letter-claude-codex\safety-management-comparison.png`. The source was normalized from 853 px to 390 px wide (about 2.19× density); the rendered phone region was compared at 390 CSS px, device scale factor 1.
- State: an authenticated local user with no stored blocks or reports. This intentionally exercises the empty-state path; the reference simultaneously illustrates populated lists and empty states, which cannot both represent one live data state.

**Findings**

- [P2, resolved] Hero sat too low and the content column was narrower than the reference.
  Location: `.safety-management-screen .letter-flow-scroll`, `.management-screen` in `src/index.css`.
  Evidence: first rendered capture had inherited flow padding plus page padding, placing the hero noticeably below the reference.
  Fix: removed the inherited scroll padding for this page and reduced the page top inset to 20 px while retaining the 28 px mobile column inset.
  Post-fix evidence: the normalized side-by-side comparison aligns the header, hero, divider, and first section at the same visual rhythm.

**Required fidelity surfaces**

- Fonts and typography: Korean display headings use `Noto Serif KR` with a 33 px hero and 24 px section hierarchy; compact metadata uses the existing Pretendard UI face. Wrapping stays inside the 390 px content column.
- Spacing and layout rhythm: the mobile header, hero, gold dividers, two data sections, and support area follow the reference order and use responsive single-column spacing.
- Colors and visual tokens: paper texture and ivory surface reuse app tokens; plum distinguishes section labels/actions and terracotta is reserved for active review and emergency support.
- Image quality and asset fidelity: no substitute avatars, decorative SVGs, CSS illustrations, or placeholder imagery were introduced. The supplied reference's botanical avatar and empty-state illustrations are illustrative rather than live account data; the implementation instead uses the appropriate populated or empty state from the app's stored safety data.
- Copy and content: the safety purpose, block constraints, report handling, dates, statuses, and emergency phone numbers are included in Korean. Dynamic names and dates remain sourced from existing records.

**Open Questions**

- None. The reference uses sample records alongside empty states; live data determines which of those two states the user sees.

**Implementation Checklist**

- [x] Match the warm paper header, title hierarchy, dividers, and section order.
- [x] Preserve unblock confirmation and refresh behavior.
- [x] Map report statuses to review/completed language and retain original report reasons.
- [x] Add the prominent emergency contact area.
- [x] Verify production build with `npm run build`.

**Follow-up Polish**

- [P3] If a future product decision calls for non-live sample content, provide approved botanical avatar and empty-state artwork assets instead of creating stand-in illustrations in CSS.

final result: passed
