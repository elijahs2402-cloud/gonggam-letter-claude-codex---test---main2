# Design QA — reply writing layout

- Reference visual: `http://localhost:8443/write-letter`
- Implemented route: `http://localhost:8443/write-reply/sample-waiting-letter-one`
- Reference capture: `design-qa-write-letter-reference.png`
- Implementation capture: `design-qa-write-reply-updated.png`
- Side-by-side comparison: `design-qa-write-reply-comparison.png`

## Verified changes

- The guidance block now appears directly below the reply introduction, with the same spacing, left rule, and content width as `/write-letter`.
- The paper header now contains `답장 내용` and the live writing state (`작성 전`, `작성 중`, save, or error state).
- The fixed header keeps `편지 다시 읽기`; the return-letter action is intentionally removed.
- The reply field expands with its content and relies on page scrolling rather than an internal textarea scrollbar. The character count remains in the same document flow with bottom scroll clearance for the fixed actions.
- `npm run build` passes and the page has no browser console warnings or errors.

## Result

passed
