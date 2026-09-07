export type LetterReturnReason = "no_time" | "difficult_to_reply" | "too_heavy" | "unsafe_or_uncomfortable" | "assigned_by_mistake" | "other";
export type MockLetterReturn = { id: string; letterId: string; readerId: string; reason?: LetterReturnReason; detail?: string; hadReplyDraft: boolean; replyDraftDeleted: boolean; status: "processing" | "completed" | "failed"; createdAt: string; completedAt?: string };
const KEY = "gonggam_mock_letter_returns_v1";
const read = (): MockLetterReturn[] => { try { const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]"); return Array.isArray(value) ? value.filter((item): item is MockLetterReturn => Boolean(item && typeof item === "object" && typeof (item as MockLetterReturn).letterId === "string")) : []; } catch { return []; } };
const write = (items: MockLetterReturn[]) => { try { localStorage.setItem(KEY, JSON.stringify(items)); return true; } catch { return false; } };
export function saveLetterReturn(value: MockLetterReturn) { return write([value, ...read().filter((item) => item.id !== value.id)]); }
export function getLetterReturn(letterId: string, readerId: string) { return read().find((item) => item.letterId === letterId && item.readerId === readerId && item.status === "completed"); }
export const letterReturnStorageKey = KEY;
