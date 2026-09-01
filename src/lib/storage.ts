/**
 * localStorage — 기획.md §12.3. 키에 버전을 박는다. 서버 전송은 0건 — 이 파일이 그 경계다.
 */
import type { Drink, Profile } from "./caffeine";

const DRINKS_KEY = "cl.v1.drinks";
const PROFILE_KEY = "cl.v1.profile";
const NOTIFY_KEY = "cl.v1.notify";

export interface NotifyState {
  agreed: string[];
  /** 첫 기록 직후 알림 유도 카드에 응답했는지 — 기기당 1회만 노출(§1 요소 8). */
  askedAfterFirstLog: boolean;
}

const DEFAULT_PROFILE: Profile = { weightKg: 70, smoker: false, oc: false };
const DEFAULT_NOTIFY: NotifyState = { agreed: [], askedAfterFirstLog: false };
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 시크릿 모드 등 — 조용히 무시한다 */
  }
}

/** 보관 30일 롤링(§12.3). 로드 시 한 번만 잘라낸다. */
export function loadDrinks(nowMs: number): Drink[] {
  const all = load<Drink[]>(DRINKS_KEY, []);
  const fresh = all.filter((d) => d.at >= nowMs - RETENTION_MS);
  if (fresh.length !== all.length) save(DRINKS_KEY, fresh);
  return fresh;
}

export function addDrink(list: Drink[], drink: Drink): Drink[] {
  const next = [drink, ...list];
  save(DRINKS_KEY, next);
  return next;
}

export function removeDrink(list: Drink[], id: string): Drink[] {
  const next = list.filter((d) => d.id !== id);
  save(DRINKS_KEY, next);
  return next;
}

export function loadProfile(): Profile {
  return load(PROFILE_KEY, DEFAULT_PROFILE);
}

export function saveProfile(profile: Profile): void {
  save(PROFILE_KEY, profile);
}

export function loadNotify(): NotifyState {
  return load(NOTIFY_KEY, DEFAULT_NOTIFY);
}

export function saveNotify(state: NotifyState): void {
  save(NOTIFY_KEY, state);
}
