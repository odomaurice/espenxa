/*
 * Display formatting. Money arrives from the API in integer minor units and
 * is only converted to a decimal here, for display. Never do financial
 * arithmetic in the UI.
 */
import { COUNTRIES } from "./countries";
import type { Money } from "./api/types";

const minorByCurrency = new Map(COUNTRIES.map((c) => [c.currency, c.minor]));

export function minorDigits(currency: string): number {
  const known = minorByCurrency.get(currency);
  if (known !== undefined) return known;
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

/** "₦18,000", "KSh 1,250.50". Whole amounts drop the decimals. */
export function money(m: Money | null | undefined, locale = "en"): string {
  if (!m) return "-";
  const digits = minorDigits(m.currency);
  const whole = m.amountMinor % 10 ** digits === 0;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: m.currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: whole ? 0 : digits,
      maximumFractionDigits: digits,
    }).format(m.amountMinor / 10 ** digits);
  } catch {
    return `${m.currency} ${(m.amountMinor / 10 ** digits).toFixed(digits)}`;
  }
}

/** Parse a user-typed major-unit amount ("18,000" or "12.5") into minor units, without floats. */
export function toMinor(input: string, currency: string): number | null {
  const digits = minorDigits(currency);
  const clean = input.replace(/[\s,]/g, "");
  const m = /^(\d{1,12})(?:\.(\d+))?$/.exec(clean);
  if (!m) return null;
  const frac = (m[2] ?? "").padEnd(digits, "0");
  if (frac.length > digits) return null;
  return Number(m[1]) * 10 ** digits + (digits ? Number(frac) : 0);
}

/** Major-unit string for an input field. */
export function toMajorInput(m: Money | null): string {
  if (!m) return "";
  const digits = minorDigits(m.currency);
  const whole = Math.trunc(m.amountMinor / 10 ** digits);
  const frac = m.amountMinor % 10 ** digits;
  return digits && frac ? `${whole}.${String(frac).padStart(digits, "0")}` : String(whole);
}

export function currencySymbol(currency: string): string {
  try {
    return (
      new Intl.NumberFormat("en", { style: "currency", currency, currencyDisplay: "narrowSymbol" })
        .formatToParts(0)
        .find((p) => p.type === "currency")?.value ?? currency
    );
  } catch {
    return currency;
  }
}

/** Always approximate: "about 2 km", "under 1 km". */
export function distance(km: number | null | undefined): string | null {
  if (km === null || km === undefined) return null;
  if (km < 1) return "under 1 km away";
  if (km < 10) return `about ${Math.round(km)} km away`;
  return `about ${Math.round(km / 5) * 5} km away`;
}

export function hoursLabel(h: number): string {
  if (h === 24) return "1 day";
  if (h === 48) return "2 days";
  return h === 1 ? "1 hour" : `${h} hours`;
}

export function dateTime(iso: string, timezone?: string, locale = "en-GB"): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(iso));
}

export function dateOnly(iso: string, timezone?: string, locale = "en-GB"): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: timezone }).format(new Date(iso));
}

export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} d ago`;
  return dateOnly(iso);
}

export function pct(x: number, digits = 0): string {
  return `${(x * 100).toFixed(digits)}%`;
}

export function ageFrom(dob: string, now = new Date()): number {
  const d = new Date(dob + "T00:00:00Z");
  let a = now.getUTCFullYear() - d.getUTCFullYear();
  const m = now.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) a--;
  return a;
}

/** Short money for chart axes and tiles: "₦1.2M", "R18K". */
export function moneyCompact(m: Money | null | undefined): string {
  if (!m) return "-";
  const digits = minorDigits(m.currency);
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: m.currency, currencyDisplay: "narrowSymbol", notation: "compact", maximumFractionDigits: 1 }).format(m.amountMinor / 10 ** digits);
  } catch {
    return money(m);
  }
}

/** The signed-in person is always "You"; everyone else by name. */
export function nameOf(p: { id: string; displayName: string } | null | undefined, meId: string | undefined): string {
  if (!p) return "Someone";
  return p.id === meId ? "You" : p.displayName;
}

/**
 * Booking timeline labels come from the backend in neutral terms
 * ("Accepted by provider"). Show them with real names, and "You" for the
 * signed-in person.
 */
export function bookingEventText(label: string, b: { customer: { id: string; displayName: string }; provider: { id: string; displayName: string } }, meId: string | undefined): string {
  const c = nameOf(b.customer, meId);
  const p = nameOf(b.provider, meId);
  return label
    .replace(/\bby (the )?provider\b/gi, `by ${p}`)
    .replace(/\bby (the )?customer\b/gi, `by ${c}`)
    .replace(/^Provider checked in/i, `${p} checked in`)
    .replace(/^Customer checked in/i, `${c} checked in`)
    .replace(/provider compensation/gi, `${p === "You" ? "your" : `${p}'s`} compensation`)
    .replace(/\bthe provider\b/gi, p)
    .replace(/\bthe customer\b/gi, c)
    .replace(/\bYou (checked|marked|accepted|proposed|cancelled|opened)/g, "You $1");
}
