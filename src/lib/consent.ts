/*
 * The visitor's answers to the age question and the cookie question.
 *
 * Stored as first-party cookies (not localStorage) so the server can read
 * them too once the backend exists. Both are strictly necessary to run an
 * adults-only service, so they are set without asking first.
 *
 *   meet_age      "adult" (1 year) or "minor" (1 day)
 *   meet_consent  {"v":1,"analytics":bool,"personalisation":bool,"at":ISO} (6 months)
 */
import { useSyncExternalStore } from "react";

const AGE = "meet_age";
const CONSENT = "meet_consent";

export type AgeAnswer = "adult" | "minor";
export type CookieChoice = { v: 1; analytics: boolean; personalisation: boolean; at: string };

const listeners = new Set<() => void>();
let settingsOpen = false;

const emit = () => listeners.forEach((l) => l());
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};

function read(name: string): string | null {
  if (typeof document === "undefined") return null;
  const hit = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
}

function write(name: string, value: string, days: number) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${Math.round(days * 86_400)}; Path=/; SameSite=Lax${secure}`;
  emit();
}

/** "unknown" on the server and before the browser has answered. */
export function useAge(): AgeAnswer | "unset" | "unknown" {
  return useSyncExternalStore(
    subscribe,
    () => (read(AGE) as AgeAnswer | null) ?? "unset",
    () => "unknown",
  );
}

export function answerAge(a: AgeAnswer) {
  write(AGE, a, a === "adult" ? 365 : 1);
}

/** The raw cookie string keeps the snapshot stable; parse it where used. */
export function useCookieChoice(): { choice: CookieChoice | null; ready: boolean } {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(CONSENT) ?? "",
    () => "\u0000",
  );
  if (raw === "\u0000") return { choice: null, ready: false };
  try {
    return { choice: raw ? (JSON.parse(raw) as CookieChoice) : null, ready: true };
  } catch {
    return { choice: null, ready: true };
  }
}

export function saveCookieChoice(c: { analytics: boolean; personalisation: boolean }) {
  settingsOpen = false;
  write(CONSENT, JSON.stringify({ v: 1, ...c, at: new Date().toISOString() } satisfies CookieChoice), 182);
}

/** Reopens the cookie panel (footer and Settings links). */
export function openCookieSettings() {
  settingsOpen = true;
  emit();
}

export function closeCookieSettings() {
  settingsOpen = false;
  emit();
}

export function useCookieSettingsOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => settingsOpen,
    () => false,
  );
}

/** For analytics code later: only run when this is true. */
export function analyticsAllowed(): boolean {
  try {
    return !!(JSON.parse(read(CONSENT) ?? "null") as CookieChoice | null)?.analytics;
  } catch {
    return false;
  }
}
