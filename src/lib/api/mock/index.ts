/*
 * DEVELOPMENT ONLY. An in-browser implementation of the Meet API, stored in
 * localStorage, so every screen can be built and reviewed before the
 * backend exists.
 *
 * It mirrors the rules the backend must enforce (age gate, market switches,
 * booking state machine, price snapshots, cancellation allocation) only so
 * the UI behaves realistically. None of it is authoritative: no payment,
 * refund, payout, email, SMS or identity check really happens here, and the
 * UI says so wherever it matters.
 */
import { COUNTRIES } from "../../countries";
import { ageFrom } from "../../format";
import { BOOKING_STATUS, REPORT_CATEGORIES, staffCan, type StaffPermission } from "../../labels";
import type { BookingAction, MeetApi, RegisterInput } from "../contract";
import {
  ApiError,
  DURATIONS,
  type Account,
  type AppNotification,
  type Booking,
  type CancellationQuote,
  type CancellationTier,
  type Connection,
  type DiscoveryFilters,
  type DiscoveryMode,
  type Earnings,
  type ID,
  type Market,
  type Money,
  type PersonRef,
  type Profile,
  type ProfileDraft,
  type ProviderPerformance,
  type ProviderSettings,
  type Rank,
  type RankThreshold,
  type Rate,
  type OnboardingStatus,
  type BookingStatus,
  type MessageStatus,
  type BookingRules,
  type MoneyRules,
  type PaymentGateway,
  type PayoutAccount,
  type PayoutInstitution,
  type AdminAnalytics,
  type CompanionAnalytics,
  type HierarchyNode,
  type KycFile,
  type AdminStats,
  type AdminBooking,
  type AdminReport,
  type ActivityEvent,
  type LedgerEntry,
  type OnboardingStepId,
} from "../types";
import { BANKS, NETWORKS, PAN_AFRICAN } from "./banks";
import { buildSeed, CATEGORIES, CITY_GEO, DEFAULT_POLICY, DEFAULT_RULES, MOBILE_MONEY, PAYSTACK, DEFAULT_PREFERENCES, MARKETS, MOCK_VERSION, type MockBooking, type MockDB, type MockUser } from "./seed";

const KEY = "meet.mock.db";
const SESSION = "meet.mock.session";

export const RANK_THRESHOLDS: RankThreshold[] = [
  { rank: "bronze", minScore: 0, minCompleted: 0, minRating: 0, maxCancellationRate: 1 },
  { rank: "silver", minScore: 300, minCompleted: 10, minRating: 4.2, maxCancellationRate: 0.1 },
  { rank: "gold", minScore: 600, minCompleted: 30, minRating: 4.5, maxCancellationRate: 0.06 },
  { rank: "platinum", minScore: 800, minCompleted: 50, minRating: 4.7, maxCancellationRate: 0.04 },
  { rank: "diamond", minScore: 920, minCompleted: 100, minRating: 4.8, maxCancellationRate: 0.02 },
];

/* ---- storage ------------------------------------------------------------- */

let mem: MockDB | null = null;

function load(): MockDB {
  if (mem) return mem;
  let db: MockDB | null = null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) db = JSON.parse(raw) as MockDB;
  } catch {}
  if (!db || db.v !== MOCK_VERSION) db = buildSeed();
  mem = db;
  persist();
  return db;
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(mem));
  } catch {
    // Quota exceeded (large photos) or storage blocked: keep working in memory.
  }
}

export function resetMockData() {
  mem = buildSeed();
  persist();
  kycMem = {};
  try {
    localStorage.removeItem(KYC_KEY);
  } catch {}
}

const wait = (ms = 220 + Math.random() * 180) => new Promise((r) => setTimeout(r, ms));

async function run<T>(fn: (db: MockDB) => T, ms?: number): Promise<T> {
  await wait(ms);
  const db = load();
  const out = fn(db);
  persist();
  return structuredClone(out);
}

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;
const now = () => new Date().toISOString();
const ref = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

function sessionId(): string | null {
  try {
    return localStorage.getItem(SESSION);
  } catch {
    return null;
  }
}

function me(db: MockDB): MockUser {
  const id = sessionId();
  const u = id ? db.users[id] : undefined;
  if (!u) throw new ApiError("unauthenticated", "Please sign in to continue.");
  if (u.account.verification === "suspended") throw new ApiError("forbidden", "This account is suspended.");
  return u;
}

function user(db: MockDB, id: ID): MockUser {
  const u = db.users[id];
  if (!u) throw new ApiError("not_found", "This person is not available.");
  return u;
}

const market = (code: string): Market | undefined => (mem?.markets ?? MARKETS).find((m) => m.country === code);

const blockedBetween = (db: MockDB, a: ID, b: ID) => db.blocks.some((x) => (x.from === a && x.to === b) || (x.from === b && x.to === a));

const activeConnection = (db: MockDB, a: ID, b: ID) =>
  db.connections.find((c) => !c.endedAt && ((c.a === a && c.b === b) || (c.a === b && c.b === a)));

function notify(db: MockDB, userId: ID, n: Omit<AppNotification, "id" | "at" | "read">) {
  db.notifications.unshift({ ...n, id: uid("n"), at: now(), read: false, userId });
}

function personRef(u: MockUser): PersonRef {
  return { id: u.account.id, displayName: u.profile.displayName, photo: u.profile.photos[0] ?? "", verified: u.account.verification === "verified" };
}

/* ---- profiles -------------------------------------------------------------- */

function km(a: [number, number] | null, b: [number, number] | null): number | null {
  if (!a || !b) return null;
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toProfile(db: MockDB, viewer: MockUser, u: MockUser): Profile {
  const v = viewer.account.id;
  const id = u.account.id;
  const connection = activeConnection(db, v, id);
  const pv = u.profile.privacy;
  const show = (f: keyof typeof pv.fields) => pv.fields[f] === "public" || (pv.fields[f] === "connections" && !!connection);
  const d = pv.location === "approximate" ? km(viewer.geo, u.geo) : null;
  const pending = db.requests.find((r) => r.status === "pending" && ((r.from === v && r.to === id) || (r.from === id && r.to === v)));
  const pr = u.provider && u.provider.status === "active" ? u.provider : null;
  return {
    id,
    displayName: u.profile.displayName,
    age: pv.showAge ? ageFrom(u.account.dateOfBirth) : null,
    gender: u.account.gender,
    country: u.account.country,
    city: pv.location === "hidden" ? "" : u.account.city,
    distanceKm: d === null ? null : Math.max(1, Math.round(d)),
    photos: u.profile.photos,
    bio: show("bio") ? u.profile.bio : "",
    interests: show("interests") ? u.profile.interests : [],
    hobbies: show("interests") ? u.profile.hobbies : [],
    languages: show("languages") ? u.profile.languages : [],
    intentions: show("intentions") ? u.profile.intentions : [],
    verified: u.account.verification === "verified",
    activeRecently: Date.now() - new Date(u.lastActive).getTime() < 60 * 60_000,
    provider: pr
      ? {
          rank: pr.rank,
          rating: { average: pr.ratingCount ? Math.round((pr.ratingSum / pr.ratingCount) * 10) / 10 : 0, count: pr.ratingCount },
          arrangement: pr.arrangement,
          categories: pr.categories,
          rates: pr.arrangement === "free" ? DURATIONS.map((hours) => ({ hours, enabled: false, price: null })) : pr.rates,
          negotiable: pr.negotiable,
          expensesNote: pr.expensesNote,
          completedBookings: pr.completed,
          responseMinutes: pr.responseMinutes,
          availabilitySummary: summarise(pr.availability),
        }
      : null,
    viewer: {
      liked: db.likes.some((l) => l.from === v && l.to === id && l.kind === "like"),
      saved: db.saves.some((s) => s.from === v && s.to === id),
      connectionId: connection?.id ?? null,
      requestPending: pending ? (pending.from === v ? "sent" : "received") : null,
    },
  };
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function summarise(av: ProviderSettings["availability"]): string {
  if (!av.length) return "Availability on request";
  return av
    .slice()
    .sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7))
    .map((w) => `${DAYS[w.weekday]} ${w.start} to ${w.end}`)
    .join(", ");
}

const RANK_ORDER: Rank[] = ["bronze", "silver", "gold", "platinum", "diamond"];

function matches(p: Profile, f: DiscoveryFilters): boolean {
  if (f.genders?.length && !f.genders.includes(p.gender)) return false;
  if (f.ageMin && (p.age ?? 0) < f.ageMin) return false;
  if (f.ageMax && (p.age ?? 999) > f.ageMax) return false;
  if (f.country && p.country !== f.country) return false;
  if (f.city && !p.city.toLowerCase().includes(f.city.toLowerCase())) return false;
  if (f.maxKm && (p.distanceKm === null || p.distanceKm > f.maxKm)) return false;
  if (f.interests?.length && !f.interests.some((i) => p.interests.includes(i) || p.hobbies.includes(i))) return false;
  if (f.intentions?.length && !f.intentions.some((i) => p.intentions.includes(i))) return false;
  if (f.languages?.length && !f.languages.some((l) => p.languages.includes(l))) return false;
  if (f.verifiedOnly && !p.verified) return false;
  const needsProvider = f.providersOnly || f.categories?.length || f.arrangement || f.durations?.length || f.budget || f.minRank;
  if (needsProvider) {
    const pr = p.provider;
    if (!pr) return false;
    if (f.categories?.length && !f.categories.some((c) => pr.categories.includes(c))) return false;
    if (f.arrangement && pr.arrangement !== f.arrangement && pr.arrangement !== "flexible") return false;
    if (f.minRank && RANK_ORDER.indexOf(pr.rank) < RANK_ORDER.indexOf(f.minRank)) return false;
    const enabled = pr.rates.filter((r) => r.enabled && r.price && (!f.durations?.length || f.durations.includes(r.hours)));
    if (f.durations?.length && pr.arrangement !== "free" && !enabled.length) return false;
    if (f.budget) {
      if (pr.arrangement === "free") return true;
      if (!enabled.some((r) => r.price!.currency === f.budget!.currency && r.price!.amountMinor <= f.budget!.amountMinor)) return false;
    }
  }
  if (f.query) {
    const q = f.query.toLowerCase();
    const hay = [p.displayName, p.city, p.bio, ...p.interests, ...p.hobbies].join(" ").toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function discoverable(db: MockDB, viewer: MockUser, u: MockUser): boolean {
  if (u.account.id === viewer.account.id) return false;
  if (!u.account.onboarded || !u.profile.photos.length) return false;
  if (u.account.verification === "suspended") return false;
  if (blockedBetween(db, viewer.account.id, u.account.id)) return false;
  if (!market(u.account.country)?.features.discovery) return false;
  if (u.profile.privacy.privateDiscovery) {
    const likedViewer = db.likes.some((l) => l.from === u.account.id && l.to === viewer.account.id && l.kind === "like");
    if (!likedViewer && !activeConnection(db, viewer.account.id, u.account.id)) return false;
  }
  return true;
}

/* ---- money (simulation of backend rules) --------------------------------- */

const currentRules = (): MoneyRules => mem?.moneyRules ?? DEFAULT_RULES;

/** The rules a booking was made under (older seeded bookings fall back to today's). */
const rulesOf = (b: MockBooking): BookingRules => b.rules ?? { commissionPct: currentRules().commissionPct, tiers: currentRules().tiers, latePenalty: currentRules().latePenalty };

const gatewayFor = (country: string): PaymentGateway => (PAYSTACK.has(country) ? "paystack" : "flutterwave");

/** Meet's share is floored, so the companion never gets less than their percentage. */
const share = (amountMinor: number, pct: number) => Math.floor((amountMinor * pct) / 100);

/**
 * The member pays the companion's price (plus tax once set). Meet's share
 * comes out of what the companion earns; it is never added on top.
 */
function breakdown(priceMinor: number, currency: string, country: string, commissionPct = currentRules().commissionPct) {
  const m = market(country);
  const price: Money = { amountMinor: priceMinor, currency };
  const commission = { amountMinor: share(priceMinor, commissionPct), currency };
  const tax = m?.taxBps != null ? { amountMinor: Math.floor((priceMinor * m.taxBps) / 10_000), currency } : null;
  const total = priceMinor + (tax?.amountMinor ?? 0);
  return { price, commission, processing: null, tax, total: { amountMinor: total, currency } };
}

function tierFor(noticeHours: number, tiers: CancellationTier[]): CancellationTier {
  return tiers.find((t) => noticeHours >= t.minHours && (t.maxHours === null || noticeHours < t.maxHours)) ?? tiers[tiers.length - 1];
}

/**
 * A member cancellation, three ways. The companion's part is floored, Meet
 * takes its share of that part, and the refund gets the remainder, so the
 * three always add up to the price.
 */
export function allocate(priceMinor: number, tier: CancellationTier, commissionPct: number) {
  const gross = share(priceMinor, tier.compensationPct);
  const platform = share(gross, commissionPct);
  return { refund: priceMinor - gross, compensation: gross - platform, platform };
}

function paymentOf(db: MockDB, b: MockBooking) {
  return db.payments.find((p) => p.bookingId === b.id && (p.status === "succeeded" || p.status === "refunded" || p.status === "partially_refunded")) ?? null;
}

function quote(db: MockDB, b: MockBooking, by: "member" | "companion", at = Date.now()): CancellationQuote {
  const rules = rulesOf(b);
  const noticeHours = Math.max(0, (new Date(b.startAt).getTime() - at) / 3_600_000);
  const tier = tierFor(noticeHours, rules.tiers);
  const m = (n: number): Money => ({ amountMinor: n, currency: b.currency });
  const pay = paymentOf(db, b);
  const refundTo = pay ? pay.method.replace(" (simulated)", "") : null;
  if (by === "companion") {
    const late = noticeHours < rules.latePenalty.withinHours && rules.latePenalty.pct > 0;
    return {
      by,
      noticeHours: Math.round(noticeHours * 10) / 10,
      tier,
      refund: m(b.priceMinor),
      compensation: m(0),
      platform: m(0),
      penalty: late ? m(share(b.priceMinor, rules.latePenalty.pct)) : null,
      refundTo,
      feesNote: "The member gets everything back, including any fees.",
    };
  }
  const a = allocate(b.priceMinor, tier, rules.commissionPct);
  return {
    by,
    noticeHours: Math.round(noticeHours * 10) / 10,
    tier,
    refund: m(a.refund),
    compensation: m(a.compensation),
    platform: m(a.platform),
    penalty: null,
    refundTo,
    feesNote: `Meet keeps ${rules.commissionPct}% of what the companion receives, nothing more. Payment processing costs are covered by Meet.`,
  };
}

function settlementOf(db: MockDB, b: MockBooking): Booking["settlement"] {
  if (!paymentOf(db, b)) return null;
  const m = (n: number): Money => ({ amountMinor: n, currency: b.currency });
  const rules = rulesOf(b);
  if (b.status === "customer_cancelled") return { refund: m(b.refundMinor), companion: m(b.compensationMinor), platform: m(b.platformMinor ?? 0), penalty: null };
  if (b.status === "provider_cancelled" || b.status === "platform_cancelled") return { refund: m(b.refundMinor || b.priceMinor), companion: m(0), platform: m(0), penalty: b.penaltyMinor ? m(b.penaltyMinor) : null };
  if (b.status === "completed") {
    const kept = b.priceMinor - (b.refundMinor ?? 0);
    const platform = share(kept, rules.commissionPct);
    return { refund: m(b.refundMinor ?? 0), companion: m(kept - platform), platform: m(platform), penalty: null };
  }
  return null;
}

function toBooking(db: MockDB, b: MockBooking, viewerId: ID): Booking {
  const customer = user(db, b.customerId);
  const provider = user(db, b.providerId);
  return {
    id: b.id,
    reference: b.reference,
    role: b.customerId === viewerId ? "customer" : "provider",
    customer: personRef(customer),
    provider: personRef(provider),
    categoryId: b.categoryId,
    hours: b.hours,
    startAt: b.startAt,
    timezone: b.timezone,
    meetingArea: b.meetingArea,
    notes: b.notes,
    status: b.status,
    breakdown: breakdown(b.priceMinor, b.currency, provider.account.country, rulesOf(b).commissionPct),
    policy: { ...DEFAULT_POLICY, tiers: rulesOf(b).tiers },
    rules: rulesOf(b),
    companionShare: { amountMinor: b.priceMinor - share(b.priceMinor, rulesOf(b).commissionPct), currency: b.currency },
    payment: (() => {
      const p = paymentOf(db, b);
      return p ? { method: p.method, gateway: p.gateway ?? gatewayFor(provider.account.country) } : null;
    })(),
    settlement: settlementOf(db, b),
    proposal: b.proposal,
    events: b.events,
    checkIns: b.checkIns,
    canReview: b.customerId === viewerId && b.status === "completed" && !b.reviewed,
    disputeId: b.disputeId,
  };
}

function rateFor(p: ProviderSettings, hours: number): Rate | undefined {
  return p.rates.find((r) => r.hours === hours);
}

function rankFor(score: number): { rank: Rank; next: Rank | null; progress: number } {
  let i = 0;
  RANK_THRESHOLDS.forEach((t, idx) => {
    if (score >= t.minScore) i = idx;
  });
  const cur = RANK_THRESHOLDS[i];
  const nxt = RANK_THRESHOLDS[i + 1];
  return {
    rank: cur.rank,
    next: nxt?.rank ?? null,
    progress: nxt ? Math.min(1, (score - cur.minScore) / (nxt.minScore - cur.minScore)) : 1,
  };
}

/* ---- the adapter ----------------------------------------------------------- */

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

function validateRegister(db: MockDB, i: RegisterInput) {
  const fields: Record<string, string> = {};
  if (i.fullName.trim().length < 2) fields.fullName = "Enter your full name.";
  if (!/^\S+@\S+\.\S+$/.test(i.email)) fields.email = "Enter a valid email address.";
  else if (Object.values(db.users).some((u) => u.account.email.toLowerCase() === i.email.toLowerCase())) fields.email = "An account with this email already exists.";
  if (!/^\+?\d{7,15}$/.test(i.phone.replace(/[\s-]/g, ""))) fields.phone = "Enter a valid phone number.";
  if (!PASSWORD_RULE.test(i.password)) fields.password = "Use at least 8 characters with letters and numbers.";
  if (!i.dateOfBirth || ageFrom(i.dateOfBirth) < 18) fields.dateOfBirth = "You must be 18 or older to join Meet.";
  if (!market(i.country)?.features.registration) fields.country = "Meet is not open for registration in this country yet.";
  if (!USERNAME_RULE.test(i.username.trim().toLowerCase())) fields.username = "3 to 20 characters: letters, numbers, dots or underscores.";
  else if (Object.values(db.users).some((u) => u.account.username === i.username.trim().toLowerCase())) fields.username = "That username is taken.";
  if (i.role !== "member" && i.role !== "companion") fields.role = "Choose how you will use Meet.";
  if (i.otpChannel !== "email" && i.otpChannel !== "sms") fields.otpChannel = "Choose where to send your code.";
  else if (Object.values(db.users).some((u) => u.account.phone === i.phone.replace(/[s-]/g, ""))) fields.phone = "An account with this phone number already exists.";
  if (!i.acceptedTerms) fields.acceptedTerms = "You need to accept the terms to continue.";
  if (Object.keys(fields).length) throw new ApiError("validation", "Please check the highlighted fields.", fields);
}

function emptyProvider(u: MockUser): ProviderSettings & NonNullable<MockUser["provider"]> {
  const c = COUNTRIES.find((x) => x.code === u.account.country)!;
  return {
    status: "draft",
    headline: "",
    arrangement: "paid",
    categories: [],
    currency: c.currency,
    rates: DURATIONS.map((hours) => ({ hours, enabled: false, price: null })),
    negotiable: false,
    expensesNote: "",
    availability: [],
    timezone: c.timezone,
    priceLimits: null,
    rank: "bronze",
    ratingSum: 0,
    ratingCount: 0,
    completed: 0,
    responseMinutes: null,
    score: 0,
    cancellationRate: 0,
    acceptanceRate: 0,
    events: [],
  };
}

/* ---- identity files (development only) --------------------------------------
 * Real deployments never store ID images here: they go to the KYC provider and
 * staff view them through short-lived signed links. The mock keeps them in
 * this browser so the review screens can be built and tested.
 */
const KYC_KEY = "meet.mock.kyc";
let kycMem: Record<ID, KycFile[]> | null = null;

function kycStore(): Record<ID, KycFile[]> {
  if (kycMem) return kycMem;
  try {
    kycMem = JSON.parse(localStorage.getItem(KYC_KEY) ?? "{}") as Record<ID, KycFile[]>;
  } catch {
    kycMem = {};
  }
  return kycMem;
}

function storeKyc(userId: ID, files: KycFile[]) {
  const st = kycStore();
  const kinds = files.map((x) => x.kind);
  st[userId] = [...(st[userId] ?? []).filter((x) => !kinds.includes(x.kind) && !(kinds.includes("id_front") && x.kind === "id_back")), ...files];
  try {
    localStorage.setItem(KYC_KEY, JSON.stringify(st));
  } catch {
    // Storage full: the files stay available for this session only.
  }
}

/** Images are downscaled to keep the dev store small; PDFs are kept as-is. */
function blobToDataUrl(file: Blob, max = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.type === "application/pdf") {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new ApiError("validation", "That file could not be read."));
      r.readAsDataURL(file);
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new ApiError("validation", "That file could not be read as an image."));
    img.src = url;
  });
}

const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** Clearly labelled sample documents for seeded accounts that never uploaded real files. */
function sampleFiles(u: MockUser): KycFile[] {
  const k = u.private.kyc;
  const at = k.document?.submittedAt ?? u.account.createdAt;
  const name = u.account.fullName.toUpperCase();
  const country = COUNTRIES.find((c) => c.code === (k.document?.country ?? u.account.country))?.name.toUpperCase() ?? "";
  const card = (side: "FRONT" | "BACK") =>
    svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="856" height="540" viewBox="0 0 856 540"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#2d4a3e"/><stop offset="1" stop-color="#1b2c26"/></linearGradient></defs><rect width="856" height="540" rx="32" fill="url(#g)"/><text x="48" y="78" font-family="Arial" font-size="30" font-weight="700" fill="#e9f1ec">${country}</text><text x="48" y="114" font-family="Arial" font-size="20" fill="#a9c2b6">${(k.document?.type ?? "national_id").replace("_", " ").toUpperCase()} · ${side}</text>${side === "FRONT" ? `<rect x="48" y="150" width="220" height="280" rx="16" fill="#3e5f51"/><circle cx="158" cy="250" r="56" fill="#6f8f80"/><rect x="88" y="320" width="140" height="90" rx="45" fill="#6f8f80"/><text x="310" y="190" font-family="Arial" font-size="18" fill="#a9c2b6">NAME</text><text x="310" y="222" font-family="Arial" font-size="28" font-weight="700" fill="#fff">${name}</text><text x="310" y="272" font-family="Arial" font-size="18" fill="#a9c2b6">DATE OF BIRTH</text><text x="310" y="304" font-family="Arial" font-size="26" fill="#fff">${u.account.dateOfBirth}</text><text x="310" y="354" font-family="Arial" font-size="18" fill="#a9c2b6">DOCUMENT NO.</text><text x="310" y="386" font-family="Arial" font-size="26" fill="#fff">A0${u.account.id.length}7731${u.account.id.slice(-2).toUpperCase()}</text>` : `<rect x="48" y="170" width="760" height="80" fill="#0f1a15"/><text x="48" y="320" font-family="Courier New" font-size="26" fill="#cfe0d7">IDNGA${u.account.id.toUpperCase()}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</text><text x="48" y="360" font-family="Courier New" font-size="26" fill="#cfe0d7">${u.account.dateOfBirth.replaceAll("-", "")}&lt;&lt;${name.replaceAll(" ", "&lt;")}</text>`}<text x="428" y="300" text-anchor="middle" transform="rotate(-18 428 300)" font-family="Arial" font-size="96" font-weight="900" fill="#ffffff" fill-opacity="0.16">SAMPLE</text></svg>`);
  const selfie = svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800"><rect width="600" height="800" fill="#2a2a2e"/><circle cx="300" cy="320" r="130" fill="#55555c"/><rect x="130" y="480" width="340" height="320" rx="170" fill="#55555c"/><text x="300" y="130" text-anchor="middle" font-family="Arial" font-size="28" fill="#a1a1a8">SAMPLE SELFIE</text><text x="300" y="170" text-anchor="middle" font-family="Arial" font-size="20" fill="#6b6b73">Development data</text></svg>`,
  );
  const files: KycFile[] = [];
  if (k.document) {
    files.push({ id: `smp_${u.account.id}_f`, kind: "id_front", mimeType: "image/svg+xml", url: card("FRONT"), uploadedAt: at, sample: true });
    if (k.document.hasBack) files.push({ id: `smp_${u.account.id}_b`, kind: "id_back", mimeType: "image/svg+xml", url: card("BACK"), uploadedAt: at, sample: true });
  }
  if (k.selfieSubmittedAt) files.push({ id: `smp_${u.account.id}_s`, kind: "selfie", mimeType: "image/svg+xml", url: selfie, uploadedAt: k.selfieSubmittedAt, sample: true });
  return files;
}

function filesFor(u: MockUser): KycFile[] {
  const real = kycStore()[u.account.id];
  return real?.length ? real : sampleFiles(u);
}

function resizeImage(file: File, max = 1080): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return reject(new ApiError("validation", "Use a JPG, PNG or WebP photo."));
    if (file.size > 12 * 1024 * 1024) return reject(new ApiError("validation", "Photos must be under 12 MB."));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      // Re-encoding drops EXIF, including GPS. The backend must do the same.
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => reject(new ApiError("validation", "That file could not be read as an image."));
    img.src = url;
  });
}

function draftOf(u: MockUser): ProfileDraft {
  const p = u.profile;
  return { displayName: p.displayName, bio: p.bio, interests: p.interests, hobbies: p.hobbies, languages: p.languages, intentions: p.intentions, photos: p.photos, privacy: p.privacy };
}

function validateDraft(d: ProfileDraft) {
  const fields: Record<string, string> = {};
  if (d.displayName.trim().length < 2) fields.displayName = "Choose a display name.";
  if (!d.photos.length) fields.photos = "Add at least one photo of yourself.";
  if (d.photos.length > 6) fields.photos = "You can add up to 6 photos.";
  if (d.bio.length > 500) fields.bio = "Keep your bio under 500 characters.";
  if (!d.intentions.length) fields.intentions = "Choose at least one reason you are here.";
  if (Object.keys(fields).length) throw new ApiError("validation", "Please check the highlighted fields.", fields);
}

/* ---- onboarding (simulation of backend rules) ---------------------------- */

export const STEPS: Record<"member" | "companion", OnboardingStepId[]> = {
  member: ["photos", "about", "looking_for", "preferences", "location", "id_document", "selfie"],
  companion: ["photos", "about", "experiences", "rates", "availability", "location", "id_document", "selfie"],
};

const USERNAME_RULE = /^[a-z0-9](?:[a-z0-9._]{1,18})[a-z0-9]$/;

function stepDone(u: MockUser, s: OnboardingStepId): boolean {
  const p = u.private;
  const pr = u.provider;
  switch (s) {
    case "photos":
      return u.profile.photos.length > 0;
    case "about":
      return p.saved.includes("about") && u.profile.bio.length >= 20;
    case "looking_for":
      return u.profile.intentions.length > 0;
    case "preferences":
      return p.saved.includes("preferences");
    case "experiences":
      return !!pr && pr.categories.length > 0;
    case "rates":
      return !!pr && p.saved.includes("rates") && (pr.arrangement === "free" || pr.rates.some((r) => r.enabled && r.price));
    case "availability":
      return !!pr && pr.availability.length > 0;
    case "location":
      return !!p.location;
    case "id_document":
      return !!p.kyc.document;
    case "selfie":
      return !!p.kyc.selfieSubmittedAt;
  }
}

function statusOf(u: MockUser): OnboardingStatus {
  const steps = STEPS[u.account.role].map((id) => {
    const done = stepDone(u, id);
    return { id, done, skipped: !done && u.private.skipped.includes(id) };
  });
  const complete = steps.every((s) => s.done);
  return { role: u.account.role, steps, complete, verification: u.account.verification, canUsePlatform: complete && u.account.verification === "verified" };
}

/** After any onboarding change: mark complete, and queue for review once ID and selfie are in. */
function settle(db: MockDB, u: MockUser): OnboardingStatus {
  const s = statusOf(u);
  u.account.onboarded = s.complete;
  const kycIn = !!u.private.kyc.document && !!u.private.kyc.selfieSubmittedAt;
  if (kycIn && ["unverified", "rejected", "needs_info"].includes(u.account.verification)) {
    u.account.verification = "pending";
    notify(db, u.account.id, { kind: "verification", title: "Verification submitted", body: "We are checking your ID and selfie. This usually takes less than a day.", href: "/home" });
  }
  return statusOf(u);
}

function sendOtp(db: MockDB, u: MockUser): string {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  u.private.otp = { code, exp: Date.now() + 10 * 60_000, sentAt: Date.now() };
  const to = u.account.otpChannel === "sms" ? u.account.phone : u.account.email;
  db.outbox.unshift({ to, subject: u.account.otpChannel === "sms" ? "SMS" : "Your Meet code", body: `Your Meet code is ${code}. It expires in 10 minutes.`, at: now() });
  return to;
}

/** Social, discovery and booking actions need a complete, approved account. */
function active(db: MockDB): MockUser {
  const u = me(db);
  if (!u.account.contactVerified) throw new ApiError("forbidden", "Confirm your email or phone first.");
  if (!u.account.onboarded) throw new ApiError("forbidden", "Finish setting up your account to use Meet.");
  if (u.account.verification !== "verified") throw new ApiError("forbidden", "Your account is waiting for verification approval.");
  return u;
}

/* ---- staff (simulation of backend rules) ---------------------------------- */

function staff(db: MockDB, perm: StaffPermission): MockUser {
  const u = me(db);
  if (!u.account.roles.length) throw new ApiError("forbidden", "Staff only.");
  if (!staffCan(u.account.roles, perm)) throw new ApiError("forbidden", "Your role cannot do this.");
  return u;
}

function audit(db: MockDB, actor: MockUser, action: string, target: string, reason: string) {
  db.audit.unshift({ id: uid("au"), at: now(), actor: actor.account.fullName, role: actor.account.roles[0], action, target, reason });
}

const countryName = (code: string) => COUNTRIES.find((c) => c.code === code)?.name ?? code;

/* ---- simulated analytics (design data, labelled in the UI) ---------------- */

function prng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const dayKey = (offset: number) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
};

/** Keeps the largest children and folds the rest into "Other". */
function topWithOther(id: string, label: string, kids: HierarchyNode[], keep: number): HierarchyNode {
  const sorted = [...kids].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const head = sorted.slice(0, keep);
  const tail = sorted.slice(keep);
  const other = tail.reduce((n, k) => n + (k.value ?? 0), 0);
  return { id, label, children: other ? [...head, { id: `${id}_other`, label: "Other", value: other }] : head };
}

const DURATION_LABELS = ["1 hour", "2 hours", "4 hours", "8 hours", "1 day", "2 days"];
const DURATION_WEIGHTS = [0.22, 0.31, 0.24, 0.13, 0.07, 0.03];

const SIM_MEMBERS: Record<string, number> = { NG: 4200, GH: 1320, KE: 1650, ZA: 1910, RW: 380, MA: 520, EG: 610, CI: 290, SN: 240, TZ: 330, UG: 300 };

function adminAnalytics(db: MockDB): AdminAnalytics {
  const rnd = prng(20261116);
  const days = Array.from({ length: 30 }, (_, i) => {
    const t = (29 - i) / 29;
    const wave = 1 + 0.18 * Math.sin(i / 2.2);
    return {
      date: dayKey(29 - i),
      signups: Math.round((48 + 46 * (1 - t) + rnd() * 16) * wave),
      completed: Math.round((18 + 22 * (1 - t) + rnd() * 8) * wave),
      active: Math.round(9 + 7 * (1 - t) + rnd() * 6),
      cancelled: Math.round(2 + rnd() * 5),
    };
  });

  // Members: simulated base plus the real accounts, grouped by AU region, then country.
  const real: Record<string, number> = {};
  for (const u of Object.values(db.users)) if (!u.account.roles.length) real[u.account.country] = (real[u.account.country] ?? 0) + 1;
  const byRegion: Record<string, HierarchyNode[]> = {};
  for (const c of COUNTRIES) {
    const n = (SIM_MEMBERS[c.code] ?? 0) + (real[c.code] ?? 0);
    if (!n) continue;
    (byRegion[c.region] ??= []).push({ id: c.code, label: c.name, value: n });
  }
  const membersByRegion: HierarchyNode = {
    id: "members",
    label: "Members",
    children: Object.entries(byRegion).map(([region, kids]) => topWithOther(region, `${region} Africa`, kids, 4)),
  };

  // Bookings: experience, then duration.
  const cats = CATEGORIES.map((c, i) => {
    const base = Math.round(900 * Math.pow(0.72, i) + rnd() * 60) + db.bookings.filter((b) => b.categoryId === c.id).length;
    return {
      id: c.id,
      label: c.name.replace(" and restaurants", "").replace(" and entertainment", "").replace(" and parties", ""),
      value: base,
    };
  });
  const top = [...cats].sort((a, b) => b.value - a.value);
  const head = top.slice(0, 5).map((c) => ({
    id: c.id,
    label: c.label,
    children: DURATION_LABELS.map((d, j) => ({ id: `${c.id}_${j}`, label: d, value: Math.max(1, Math.round(c.value * DURATION_WEIGHTS[j] * (0.8 + rnd() * 0.4))) })),
  }));
  const rest = top.slice(5).reduce((n, c) => n + c.value, 0);
  const bookingsByExperience: HierarchyNode = { id: "bookings", label: "Bookings", children: [...head, { id: "cat_rest", label: "Other", value: rest }] };

  const members = Object.values(byRegion).flat().reduce((n, k) => n + (k.value ?? 0), 0);
  const funnel = [
    { stage: "Registered", value: members },
    { stage: "Verified", value: Math.round(members * 0.71) },
    { stage: "Connected", value: Math.round(members * 0.46) },
    { stage: "Booked", value: Math.round(members * 0.17) },
    { stage: "Completed", value: Math.round(members * 0.14) },
  ];
  const companions = Object.values(db.users).filter((u) => u.provider);
  const ranks = (["bronze", "silver", "gold", "platinum", "diamond"] as Rank[]).map((r, i) => ({ rank: r, count: [820, 410, 190, 74, 21][i] + companions.filter((h) => h.provider!.rank === r).length }));
  return { simulated: true, days, membersByRegion, bookingsByExperience, funnel, ranks };
}

function hostAnalytics(db: MockDB, u: MockUser): CompanionAnalytics {
  const pr = u.provider!;
  const rnd = prng(u.account.id.split("").reduce((n, ch) => n + ch.charCodeAt(0), 7));
  const cur = pr.currency;
  const enabled = pr.rates.filter((r) => r.enabled && r.price);
  const avg = enabled.length ? enabled.reduce((n, r) => n + r.price!.amountMinor, 0) / enabled.length : 0;
  const pace = Math.max(1, pr.completed / 20);
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - (11 - i) * 7);
    const bookings = Math.max(0, Math.round(pace * (0.6 + i / 14) + rnd() * 2 - 0.6));
    return { week: d.toISOString().slice(0, 10), bookings, earnings: { amountMinor: Math.round((bookings * avg) / 100) * 100, currency: cur } };
  });
  // The real completed bookings land in the current week.
  const real = db.bookings.filter((b) => b.providerId === u.account.id && b.status === "completed" && Date.now() - new Date(b.startAt).getTime() < 7 * 86_400_000);
  weeks[11].bookings += real.length;
  weeks[11].earnings.amountMinor += real.reduce((n, b) => n + b.priceMinor - (b.refundMinor ?? 0), 0);
  const byExperience: HierarchyNode = {
    id: "mine",
    label: "Your bookings",
    children: pr.categories.slice(0, 5).map((cid, i) => {
      const c = CATEGORIES.find((x) => x.id === cid)!;
      const total = Math.round((pr.completed + 6) * Math.pow(0.62, i) * (0.8 + rnd() * 0.4));
      const durs = (enabled.length ? enabled.map((r) => r.hours) : [1, 2]).map((h) => ({ id: `${cid}_${h}`, label: h === 24 ? "1 day" : h === 48 ? "2 days" : h === 1 ? "1 hour" : `${h} hours`, value: Math.max(1, Math.round(total * (0.15 + rnd() * 0.5))) }));
      return { id: cid, label: c.name, children: durs };
    }),
  };
  const n = Math.max(pr.ratingCount, 1);
  const avgR = pr.ratingCount ? pr.ratingSum / pr.ratingCount : 0;
  const five = Math.round(n * Math.min(0.95, Math.max(0.2, (avgR - 3.6) / 1.5)));
  const four = Math.round((n - five) * 0.7);
  const three = Math.round((n - five - four) * 0.6);
  const two = Math.round((n - five - four - three) * 0.6);
  const ratings = [5, 4, 3, 2, 1].map((stars, i) => ({ stars, count: pr.ratingCount ? [five, four, three, two, Math.max(0, n - five - four - three - two)][i] : 0 }));
  return { simulated: true, currency: cur, weeks, byExperience, ratings };
}

function adminBooking(db: MockDB, b: MockBooking): AdminBooking {
  const paid = db.payments.find((p) => p.bookingId === b.id && p.status === "succeeded");
  const m = (n: number): Money => ({ amountMinor: n, currency: b.currency });
  return {
    id: b.id,
    reference: b.reference,
    customer: personRef(db.users[b.customerId]),
    provider: personRef(db.users[b.providerId]),
    categoryId: b.categoryId,
    hours: b.hours,
    startAt: b.startAt,
    timezone: b.timezone,
    country: db.users[b.providerId].account.country,
    meetingArea: b.meetingArea,
    status: b.status,
    price: m(b.priceMinor),
    paid: paid ? m(paid.amountMinor) : null,
    refunded: b.refundMinor ? m(b.refundMinor) : null,
    compensation: b.compensationMinor ? m(b.compensationMinor) : null,
    payoutHeld: !!b.payoutHeld || b.status === "disputed",
    disputeId: b.disputeId,
    events: b.events,
    createdAt: b.createdAt,
  };
}

const handle = (db: MockDB, id: ID) => (db.users[id] ? `@${db.users[id].account.username}` : "someone");

function activityOf(db: MockDB, only?: ID): ActivityEvent[] {
  const out: ActivityEvent[] = [];
  const mine = (...ids: ID[]) => !only || ids.includes(only);
  for (const u of Object.values(db.users)) {
    if (u.account.roles.length || !mine(u.account.id)) continue;
    out.push({ id: `su_${u.account.id}`, at: u.account.createdAt, kind: "signup", text: `${handle(db, u.account.id)} joined as a ${u.account.role === "companion" ? "companion" : "member"} from ${countryName(u.account.country)}`, href: `/admin/users/${u.account.id}` });
  }
  for (const c of db.connections) {
    if (!mine(c.a, c.b)) continue;
    out.push({ id: `cn_${c.id}`, at: c.since, kind: "match", text: `${handle(db, c.a)} and ${handle(db, c.b)} ${c.source === "match" ? "matched" : "connected"}`, href: null });
  }
  for (const r of db.requests) {
    if (!mine(r.from, r.to)) continue;
    out.push({ id: `rq_${r.id}`, at: r.at, kind: "connection", text: `${handle(db, r.from)} sent ${handle(db, r.to)} a connection request`, href: null });
  }
  for (const b of db.bookings) {
    if (!mine(b.customerId, b.providerId)) continue;
    b.events.forEach((e, i) =>
      out.push({
        id: `be_${b.id}_${i}`,
        at: e.at,
        kind: /payment/i.test(e.label) ? "payment" : /refund|cancel/i.test(e.label) ? "refund" : /dispute/i.test(e.label) ? "dispute" : "booking",
        text: `${b.reference} · ${e.label} (${handle(db, b.customerId)} with ${handle(db, b.providerId)})`,
        href: `/admin/bookings/${b.id}`,
      }),
    );
  }
  for (const r of db.reports) {
    if (!mine(r.from, r.targetId)) continue;
    out.push({ id: `rp_${r.id}`, at: r.at, kind: "report", text: `${handle(db, r.from)} reported ${handle(db, r.targetId)} for ${REPORT_CATEGORIES.find((c) => c.id === r.category)?.label.toLowerCase() ?? r.category}`, href: "/admin/reports" });
  }
  if (!only) for (const a of db.audit) out.push({ id: `st_${a.id}`, at: a.at, kind: a.action.startsWith("Verification") ? "verification" : "staff", text: `${a.actor}: ${a.action} · ${a.target}`, href: "/admin/audit" });
  return out.sort((x, y) => y.at.localeCompare(x.at)).slice(0, 200);
}

/* ---- earnings and payouts (simulation of backend rules) ---------------------- */


/** Simulated list; the backend gets the real one from Paystack or Flutterwave. */
function institutionsFor(country: string): PayoutInstitution[] {
  const slug = (x: string) => x.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const banks = (BANKS[country] ?? PAN_AFRICAN).map((name) => ({ code: `b-${slug(name)}`, name, kind: "bank" as const }));
  const momo = MOBILE_MONEY.has(country) ? (NETWORKS[country] ?? ["MTN Mobile Money", "Orange Money", "Airtel Money"]).map((name) => ({ code: `m-${slug(name)}`, name, kind: "mobile_money" as const })) : [];
  return [...banks, ...momo];
}

function earningsOf(db: MockDB, u: MockUser): Earnings {
  const cur = u.provider?.currency ?? COUNTRIES.find((c) => c.code === u.account.country)!.currency;
  const m = (n: number): Money => ({ amountMinor: n, currency: cur });
  let pending = 0;
  let available = 0;
  let compensation = 0;
  let refunds = 0;
  let deductions = 0;
  const entries: Earnings["entries"] = [];
  for (const b of db.bookings.filter((x) => x.providerId === u.account.id && x.currency === cur)) {
    const pct = rulesOf(b).commissionPct;
    const net = b.priceMinor - share(b.priceMinor, pct);
    if (["confirmed", "in_progress", "provider_completed", "disputed"].includes(b.status)) {
      pending += net;
      entries.push({ at: b.startAt, label: "Booking, paid once it is finished", bookingRef: b.reference, amount: m(net), state: "pending" });
    } else if (b.status === "completed") {
      const kept = b.priceMinor - (b.refundMinor ?? 0);
      const yours = kept - share(kept, pct);
      available += yours;
      entries.push({ at: b.startAt, label: b.refundMinor ? "Finished booking (after a dispute)" : "Finished booking", bookingRef: b.reference, amount: m(yours), state: "available" });
    } else if (b.status === "customer_cancelled" && b.compensationMinor) {
      compensation += b.compensationMinor;
      available += b.compensationMinor;
      entries.push({ at: b.startAt, label: "Paid for a late cancellation by the member", bookingRef: b.reference, amount: m(b.compensationMinor), state: "available" });
    } else if (b.status === "provider_cancelled" && b.refundMinor) {
      refunds += b.refundMinor;
      if (b.penaltyMinor) {
        deductions += b.penaltyMinor;
        available -= b.penaltyMinor;
        entries.push({ at: b.startAt, label: "Penalty: you cancelled late", bookingRef: b.reference, amount: m(-b.penaltyMinor), state: "available" });
      }
    }
  }
  let paidOut = 0;
  for (const p of db.payouts.filter((x) => x.userId === u.account.id && x.currency === cur)) {
    paidOut += p.amountMinor;
    entries.push({ at: p.at, label: `Sent to ${p.method}`, amount: m(-p.amountMinor), state: "paid" });
  }
  available -= paidOut;
  return { currency: cur, total: m(pending + Math.max(0, available)), pending: m(pending), available: m(Math.max(0, available)), paidOut: m(paidOut), compensation: m(compensation), refunds: m(refunds), deductions: m(deductions), entries: entries.sort((a, b) => b.at.localeCompare(a.at)) };
}

/* ---- chats (simulation of backend rules) ------------------------------------ */

const OPEN_BOOKING: BookingStatus[] = ["requested", "adjustment_proposed", "accepted", "confirmed", "in_progress", "provider_completed", "disputed"];

const statusOfMessage = (m: { deliveredAt: string | null; readAt: string | null }): MessageStatus => (m.readAt ? "read" : m.deliveredAt ? "delivered" : "sent");

/** The live conversation between two people, created if needed. */
function chatBetween(db: MockDB, a: ID, b: ID, source: "enquiry" | "booking") {
  const existing = activeConnection(db, a, b);
  if (existing) return existing;
  const c = { id: uid("con"), a, b, source, since: now(), endedAt: null };
  db.connections.push(c);
  return c;
}

/** A note from Meet in the pair's chat, e.g. "Ada requested a booking". */
function chatNote(db: MockDB, b: MockBooking, by: ID, text: string) {
  const c = chatBetween(db, b.customerId, b.providerId, "booking");
  db.messages.push({ id: uid("m"), connectionId: c.id, senderId: by, body: text, at: now(), deliveredAt: now(), readAt: null, kind: "system", bookingId: b.id });
}

function bookingFor(db: MockDB, id: ID, viewer: MockUser): MockBooking {
  const b = db.bookings.find((x) => x.id === id);
  if (!b || (b.customerId !== viewer.account.id && b.providerId !== viewer.account.id)) throw new ApiError("not_found", "Booking not found.");
  return b;
}

function conflict(msg: string): never {
  throw new ApiError("conflict", msg);
}

export const mockApi: MeetApi & { dev: { outbox(): Promise<MockDB["outbox"]>; reset(): Promise<void>; approve(): Promise<void> } } = {
  auth: {
    me: () =>
      run((db) => {
        const id = sessionId();
        return id && db.users[id] ? db.users[id].account : null;
      }, 60),
    login: (email, password) =>
      run((db) => {
        const u = Object.values(db.users).find((x) => x.account.email.toLowerCase() === email.trim().toLowerCase());
        if (!u || u.password !== password) throw new ApiError("unauthenticated", "That email and password do not match.");
        if (u.account.verification === "suspended") throw new ApiError("forbidden", "This account is suspended. Contact support to appeal.");
        localStorage.setItem(SESSION, u.account.id);
        u.lastActive = now();
        return u.account;
      }),
    register: (input) =>
      run((db) => {
        validateRegister(db, input);
        const id = uid("u");
        const c = COUNTRIES.find((x) => x.code === input.country)!;
        const account: Account = {
          id,
          email: input.email.trim(),
          phone: input.phone.replace(/[\s-]/g, ""),
          fullName: input.fullName.trim(),
          username: input.username.trim().toLowerCase(),
          dateOfBirth: input.dateOfBirth,
          gender: "other",
          country: input.country,
          city: "",
          role: input.role,
          otpChannel: input.otpChannel,
          contactVerified: false,
          verification: "unverified",
          roles: [],
          isProvider: input.role === "companion",
          onboarded: false,
          createdAt: now(),
        };
        const u: MockUser = {
          account,
          password: input.password,
          profile: {
            displayName: input.fullName.trim().split(/\s+/)[0],
            bio: "",
            interests: [],
            hobbies: [],
            languages: c.languages.slice(0, 1),
            intentions: [],
            photos: [],
            privacy: { showAge: true, location: "approximate", privateDiscovery: false, fields: { bio: "public", interests: "public", languages: "public", intentions: "public" } },
          },
          geo: null,
          lastActive: now(),
          provider: null,
          private: { heightCm: null, build: null, lookingForNote: "", preferences: DEFAULT_PREFERENCES, location: null, kyc: { document: null, selfieSubmittedAt: null, reviewerNote: null }, skipped: [], saved: [], otp: null },
        };
        if (input.role === "companion") u.provider = emptyProvider(u);
        db.users[id] = u;
        sendOtp(db, u);
        localStorage.setItem(SESSION, id);
        return account;
      }),
    verifyOtp: (code) =>
      run((db) => {
        const u = me(db);
        const o = u.private.otp;
        if (!o || o.exp < Date.now()) throw new ApiError("validation", "This code has expired. Send a new one.");
        if (code.trim() !== o.code) throw new ApiError("validation", "That code is not right. Check it and try again.");
        u.private.otp = null;
        u.account.contactVerified = true;
        notify(db, u.account.id, { kind: "account", title: `Welcome to Meet, ${u.profile.displayName}`, body: "Finish setting up your profile and verify your identity to start meeting people.", href: "/onboarding" });
        return u.account;
      }, 500),
    resendOtp: (channel) =>
      run((db) => {
        const u = me(db);
        const o = u.private.otp;
        if (o && Date.now() - o.sentAt < 30_000) throw new ApiError("rate_limited", "Please wait a few seconds before asking for another code.");
        if (channel) u.account.otpChannel = channel;
        return { retryInSeconds: 30, sentTo: sendOtp(db, u) };
      }),
    usernameAvailable: (name) => run((db) => USERNAME_RULE.test(name) && !Object.values(db.users).some((u) => u.account.username === name.toLowerCase()), 150),
    logout: async () => {
      await wait(80);
      localStorage.removeItem(SESSION);
    },
    requestPasswordReset: (email) =>
      run((db) => {
        const u = Object.values(db.users).find((x) => x.account.email.toLowerCase() === email.trim().toLowerCase());
        // Same response whether or not the account exists.
        if (!u) return;
        const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
        db.resetTokens.push({ token, userId: u.account.id, exp: Date.now() + 30 * 60_000 });
        db.outbox.unshift({ to: u.account.email, subject: "Reset your Meet password", body: `/reset-password?token=${token}`, at: now() });
      }),
    resetPassword: (token, password) =>
      run((db) => {
        const t = db.resetTokens.find((x) => x.token === token && x.exp > Date.now());
        if (!t) throw new ApiError("validation", "This reset link has expired. Request a new one.");
        if (!PASSWORD_RULE.test(password)) throw new ApiError("validation", "Use at least 8 characters with letters and numbers.", { password: "Use at least 8 characters with letters and numbers." });
        db.users[t.userId].password = password;
        db.resetTokens = db.resetTokens.filter((x) => x.userId !== t.userId);
        notify(db, t.userId, { kind: "security", title: "Password changed", body: "If this was not you, contact support right away.", href: null });
      }),
  },

  onboarding: {
    status: () => run((db) => statusOf(me(db)), 120),
    data: () =>
      run((db) => {
        const u = me(db);
        const p = u.private;
        return {
          about: { displayName: u.profile.displayName, bio: u.profile.bio, gender: u.account.gender, heightCm: p.heightCm, build: p.build, languages: u.profile.languages, interests: u.profile.interests },
          lookingFor: { intentions: u.profile.intentions, note: p.lookingForNote },
          preferences: p.preferences,
          location: p.location,
          kyc: p.kyc,
        };
      }, 120),
    save: (input) =>
      run((db) => {
        const u = me(db);
        const p = u.private;
        const fail = (fields: Record<string, string>) => {
          if (Object.keys(fields).length) throw new ApiError("validation", "Please check the highlighted fields.", fields);
        };
        switch (input.step) {
          case "photos":
            fail(input.photos.length ? {} : { photos: "Add at least one clear photo of yourself." });
            if (input.photos.length > 6) fail({ photos: "You can add up to 6 photos." });
            u.profile.photos = input.photos;
            break;
          case "about": {
            const d = input.data;
            fail({
              ...(d.displayName.trim().length < 2 ? { displayName: "Choose a display name." } : {}),
              ...(d.bio.trim().length < 20 ? { bio: "Write at least a couple of sentences (20 characters)." } : {}),
              ...(d.bio.length > 500 ? { bio: "Keep it under 500 characters." } : {}),
              ...(d.heightCm !== null && (d.heightCm < 120 || d.heightCm > 230) ? { heightCm: "Enter a height between 120 and 230 cm." } : {}),
            });
            u.profile = { ...u.profile, displayName: d.displayName.trim(), bio: d.bio.trim(), languages: d.languages, interests: d.interests };
            u.account.gender = d.gender;
            p.heightCm = d.heightCm;
            p.build = d.build;
            break;
          }
          case "looking_for":
            fail(input.data.intentions.length ? {} : { intentions: "Choose at least one." });
            u.profile.intentions = input.data.intentions;
            p.lookingForNote = input.data.note.trim().slice(0, 300);
            break;
          case "preferences": {
            const d = input.data;
            fail(d.ageMin < 18 || d.ageMax < d.ageMin ? { age: "Choose an age range from 18 up." } : {});
            p.preferences = { ...d, notes: d.notes.trim().slice(0, 300) };
            break;
          }
          case "location": {
            const d = input.data;
            fail({
              ...(!d.line1.trim() ? { line1: "Enter your street address." } : {}),
              ...(!d.city.trim() ? { city: "Enter your city." } : {}),
              ...(!COUNTRIES.some((c) => c.code === d.country) ? { country: "Choose your country." } : {}),
            });
            p.location = { ...d, line1: d.line1.trim(), city: d.city.trim() };
            u.account.city = d.city.trim();
            u.geo = CITY_GEO[d.city.trim()] ?? u.geo;
            break;
          }
          case "experiences": {
            const pr = u.provider ?? emptyProvider(u);
            fail(input.data.categories.length ? {} : { categories: "Choose at least one experience." });
            u.provider = { ...pr, ...input.data, headline: input.data.headline.trim().slice(0, 80) };
            break;
          }
          case "rates": {
            const pr = u.provider ?? emptyProvider(u);
            if (pr.arrangement !== "free") {
              const enabled = input.data.rates.filter((r) => r.enabled);
              const fields: Record<string, string> = enabled.length ? {} : { rates: "Turn on at least one duration and set its price." };
              for (const r of enabled) if (!r.price || !Number.isSafeInteger(r.price.amountMinor) || r.price.amountMinor <= 0) fields[`rate_${r.hours}`] = "Enter a price above zero.";
              fail(fields);
            }
            for (const r of input.data.rates) {
              const prev = rateFor(pr, r.hours);
              const before = prev?.enabled ? prev.price : null;
              const after = r.enabled ? r.price : null;
              if ((before?.amountMinor ?? null) !== (after?.amountMinor ?? null)) db.rateHistory.unshift({ userId: u.account.id, at: now(), hours: r.hours, from: before, to: after });
            }
            u.provider = { ...pr, rates: input.data.rates, negotiable: input.data.negotiable };
            break;
          }
          case "availability": {
            const pr = u.provider ?? emptyProvider(u);
            fail(input.data.availability.length ? {} : { availability: "Add at least one time you are usually free." });
            if (input.data.availability.some((w) => w.start >= w.end)) fail({ availability: "Each window must end after it starts." });
            u.provider = { ...pr, availability: input.data.availability };
            break;
          }
        }
        if (!p.saved.includes(input.step)) p.saved.push(input.step);
        p.skipped = p.skipped.filter((s) => s !== input.step);
        // A companion's offer goes live once it has experiences and, if paid, at least one price.
        const pv = u.provider;
        if (pv && pv.status === "draft" && pv.categories.length && (pv.arrangement === "free" || pv.rates.some((r) => r.enabled && r.price))) pv.status = "active";
        return settle(db, u);
      }),
    skip: (step) =>
      run((db) => {
        const u = me(db);
        if (!u.private.skipped.includes(step)) u.private.skipped.push(step);
        return statusOf(u);
      }, 120),
    uploadId: async (input) => {
      for (const f of [input.front, input.back].filter(Boolean) as File[]) {
        if (!/^image\/(jpeg|png|webp)$|^application\/pdf$/.test(f.type)) throw new ApiError("validation", "Upload a JPG, PNG, WebP or PDF of your document.");
        if (f.size > 10 * 1024 * 1024) throw new ApiError("validation", "Each file must be under 10 MB.");
      }
      const front = await blobToDataUrl(input.front);
      const back = input.back ? await blobToDataUrl(input.back) : null;
      return run((db) => {
        const u = me(db);
        // Production: the files go straight to the KYC provider. Dev: kept in this browser for the review screens.
        const at = now();
        storeKyc(u.account.id, [
          { id: uid("kyc"), kind: "id_front", mimeType: input.front.type === "application/pdf" ? "application/pdf" : "image/jpeg", url: front, uploadedAt: at, sample: false },
          ...(back && input.back ? [{ id: uid("kyc"), kind: "id_back" as const, mimeType: input.back.type === "application/pdf" ? "application/pdf" : "image/jpeg", url: back, uploadedAt: at, sample: false }] : []),
        ]);
        u.private.kyc = { ...u.private.kyc, document: { type: input.type, country: input.country, submittedAt: now(), hasBack: !!input.back }, reviewerNote: null };
        if (!u.private.saved.includes("id_document")) u.private.saved.push("id_document");
        u.private.skipped = u.private.skipped.filter((s) => s !== "id_document");
        return settle(db, u);
      }, 900);
    },
    submitSelfie: async (image) => {
      if (!image.size) throw new ApiError("validation", "The photo did not come through. Try again.");
      const selfie = await blobToDataUrl(image, 1200);
      return run((db) => {
        const u = me(db);
        storeKyc(u.account.id, [{ id: uid("kyc"), kind: "selfie", mimeType: "image/jpeg", url: selfie, uploadedAt: now(), sample: false }]);
        u.private.kyc = { ...u.private.kyc, selfieSubmittedAt: now(), reviewerNote: null };
        if (!u.private.saved.includes("selfie")) u.private.saved.push("selfie");
        u.private.skipped = u.private.skipped.filter((s) => s !== "selfie");
        return settle(db, u);
      }, 1100);
    },
  },

  profile: {
    mine: () => run((db) => draftOf(me(db))),
    save: (draft) =>
      run((db) => {
        validateDraft(draft);
        const u = me(db);
        u.profile = { ...u.profile, ...draft, displayName: draft.displayName.trim(), bio: draft.bio.trim() };
        return draftOf(u);
      }),
    uploadPhoto: async (file) => {
      await wait(400);
      return resizeImage(file);
    },
    privacy: () => run((db) => me(db).profile.privacy),
  },

  discovery: {
    list: (mode: DiscoveryMode, f: DiscoveryFilters) =>
      run((db) => {
        const v = active(db);
        const seen = new Set(db.likes.filter((l) => l.from === v.account.id).map((l) => l.to));
        let out = Object.values(db.users)
          .filter((u) => discoverable(db, v, u))
          .filter((u) => mode !== "for_you" || !seen.has(u.account.id))
          .map((u) => toProfile(db, v, u))
          .filter((p) => matches(p, f));
        if (mode === "nearby") {
          out = out.filter((p) => p.distanceKm !== null && p.distanceKm <= (f.maxKm ?? 50) && p.country === v.account.country).sort((a, b) => a.distanceKm! - b.distanceKm!);
        } else if (mode === "for_you") {
          const score = (p: Profile) =>
            p.interests.filter((i) => v.profile.interests.includes(i)).length * 2 +
            p.intentions.filter((i) => v.profile.intentions.includes(i)).length * 3 +
            (p.country === v.account.country ? 2 : 0) +
            (p.activeRecently ? 1 : 0);
          out.sort((a, b) => score(b) - score(a));
        } else {
          out.sort((a, b) => Number(b.activeRecently) - Number(a.activeRecently) || (a.distanceKm ?? 1e6) - (b.distanceKm ?? 1e6));
        }
        return out;
      }),
    get: (id) =>
      run((db) => {
        const v = me(db);
        const u = user(db, id);
        if (id !== v.account.id && !discoverable(db, v, u) && !activeConnection(db, v.account.id, id)) throw new ApiError("not_found", "This profile is not available.");
        return toProfile(db, v, u);
      }),
    like: (id) =>
      run((db) => {
        const v = active(db);
        const vid = v.account.id;
        if (!discoverable(db, v, user(db, id))) throw new ApiError("not_found", "This profile is not available.");
        db.likes = db.likes.filter((l) => !(l.from === vid && l.to === id));
        db.likes.push({ from: vid, to: id, kind: "like" });
        const mutual = db.likes.some((l) => l.from === id && l.to === vid && l.kind === "like");
        if (!mutual) return { matched: false, connectionId: null };
        const existing = activeConnection(db, vid, id);
        if (existing) return { matched: true, connectionId: existing.id };
        const c = { id: uid("con"), a: vid, b: id, source: "match" as const, since: now(), endedAt: null };
        db.connections.push(c);
        notify(db, id, { kind: "connection", title: "It's a match", body: `You and ${v.profile.displayName} like each other.`, href: `/chats/${c.id}` });
        notify(db, vid, { kind: "connection", title: "It's a match", body: `You and ${db.users[id].profile.displayName} like each other.`, href: `/chats/${c.id}` });
        return { matched: true, connectionId: c.id };
      }),
    pass: (id) =>
      run((db) => {
        const vid = me(db).account.id;
        db.likes = db.likes.filter((l) => !(l.from === vid && l.to === id));
        db.likes.push({ from: vid, to: id, kind: "pass" });
      }, 120),
    toggleSave: (id) =>
      run((db) => {
        const vid = me(db).account.id;
        const had = db.saves.some((s) => s.from === vid && s.to === id);
        db.saves = had ? db.saves.filter((s) => !(s.from === vid && s.to === id)) : [...db.saves, { from: vid, to: id }];
        return !had;
      }, 120),
    saved: () =>
      run((db) => {
        const v = me(db);
        return db.saves
          .filter((s) => s.from === v.account.id && db.users[s.to] && !blockedBetween(db, v.account.id, s.to))
          .map((s) => toProfile(db, v, db.users[s.to]));
      }),
    reviews: (id) => run((db) => db.reviews.filter((r) => r.subjectId === id).sort((a, b) => b.at.localeCompare(a.at))),
  },

  social: {
    connections: () =>
      run((db) => {
        const vid = me(db).account.id;
        return db.connections
          .filter((c) => !c.endedAt && (c.a === vid || c.b === vid))
          .map<Connection>((c) => {
            const other = db.users[c.a === vid ? c.b : c.a];
            const msgs = db.messages.filter((m) => m.connectionId === c.id);
            const last = msgs[msgs.length - 1];
            const open = db.bookings
              .filter((b) => ((b.customerId === vid && b.providerId === other.account.id) || (b.providerId === vid && b.customerId === other.account.id)) && OPEN_BOOKING.includes(b.status))
              .sort((x, y) => y.createdAt.localeCompare(x.createdAt))[0];
            return {
              id: c.id,
              person: personRef(other),
              source: c.source,
              since: c.since,
              lastMessage: last ? { body: last.body, at: last.at, fromMe: last.senderId === vid, status: statusOfMessage(last), kind: last.kind } : null,
              unread: msgs.filter((m) => m.senderId !== vid && !m.readAt && m.kind === "text").length,
              companion: !!other.provider && other.provider.status === "active",
              booking: open ? { id: open.id, reference: open.reference, status: open.status, role: open.customerId === vid ? "customer" : "provider" } : null,
              presence: { online: Date.now() - new Date(other.lastActive).getTime() < 15 * 60_000, lastSeen: other.lastActive },
            };
          })
          .filter((c) => !blockedBetween(db, vid, c.person.id))
          .sort((a, b) => (b.lastMessage?.at ?? b.since).localeCompare(a.lastMessage?.at ?? a.since));
      }),
    requests: () =>
      run((db) => {
        const vid = me(db).account.id;
        return db.requests
          .filter((r) => r.status === "pending" && (r.from === vid || r.to === vid))
          .map((r) => ({
            id: r.id,
            person: personRef(db.users[r.from === vid ? r.to : r.from]),
            direction: r.to === vid ? ("incoming" as const) : ("outgoing" as const),
            message: r.message,
            at: r.at,
          }));
      }),
    sendRequest: (id, message) =>
      run((db) => {
        const v = active(db);
        const vid = v.account.id;
        if (!discoverable(db, v, user(db, id))) throw new ApiError("not_found", "This profile is not available.");
        if (activeConnection(db, vid, id)) conflict("You are already connected.");
        if (db.requests.some((r) => r.status === "pending" && ((r.from === vid && r.to === id) || (r.from === id && r.to === vid)))) conflict("A request is already pending.");
        if (message.length > 300) throw new ApiError("validation", "Keep your note under 300 characters.");
        db.requests.push({ id: uid("req"), from: vid, to: id, message: message.trim(), at: now(), status: "pending" });
        notify(db, id, { kind: "connection", title: "New connection request", body: `${v.profile.displayName} wants to connect with you.`, href: "/connections?tab=requests" });
      }),
    respond: (requestId, accept) =>
      run((db) => {
        const v = me(db);
        const r = db.requests.find((x) => x.id === requestId && x.to === v.account.id && x.status === "pending");
        if (!r) throw new ApiError("not_found", "This request is no longer available.");
        r.status = accept ? "accepted" : "declined";
        if (accept) {
          db.connections.push({ id: uid("con"), a: r.from, b: r.to, source: "request", since: now(), endedAt: null });
          notify(db, r.from, { kind: "connection", title: "Request accepted", body: `${v.profile.displayName} accepted your connection request.`, href: "/connections" });
        }
      }),
    unmatch: (connectionId) =>
      run((db) => {
        const vid = me(db).account.id;
        const c = db.connections.find((x) => x.id === connectionId && (x.a === vid || x.b === vid));
        if (!c) throw new ApiError("not_found", "Connection not found.");
        c.endedAt = now();
        db.likes = db.likes.filter((l) => !(l.from === vid && (l.to === c.a || l.to === c.b)));
      }),
    messages: (connectionId) =>
      run((db) => {
        const vid = me(db).account.id;
        const c = db.connections.find((x) => x.id === connectionId && (x.a === vid || x.b === vid));
        if (!c) throw new ApiError("not_found", "Conversation not found.");
        return db.messages.filter((m) => m.connectionId === connectionId).map(({ connectionId: _c, ...m }) => (void _c, m));
      }, 120),
    markRead: (connectionId) =>
      run((db) => {
        const vid = me(db).account.id;
        db.messages.forEach((m) => {
          if (m.connectionId === connectionId && m.senderId !== vid && !m.readAt) {
            m.deliveredAt ??= now();
            m.readAt = now();
          }
        });
      }, 40),
    openChat: (personId) =>
      run((db) => {
        const v = active(db);
        const other = user(db, personId);
        if (personId === v.account.id) conflict("This is you.");
        if (blockedBetween(db, v.account.id, personId)) throw new ApiError("not_found", "This person is not available.");
        const existing = activeConnection(db, v.account.id, personId);
        if (existing) return { connectionId: existing.id };
        // Members can message companions before booking; anyone else needs a match or accepted request.
        if (!other.provider || other.provider.status !== "active") throw new ApiError("forbidden", "Connect first to message this person.");
        return { connectionId: chatBetween(db, v.account.id, personId, "enquiry").id };
      }, 150),
    send: (connectionId, body, clientId) =>
      run((db) => {
        const v = active(db);
        const vid = v.account.id;
        const c = db.connections.find((x) => x.id === connectionId && !x.endedAt && (x.a === vid || x.b === vid));
        if (!c) throw new ApiError("forbidden", "This chat is closed.");
        const other = c.a === vid ? c.b : c.a;
        if (blockedBetween(db, vid, other)) throw new ApiError("forbidden", "You can no longer message this person.");
        const text = body.trim();
        if (!text) throw new ApiError("validation", "Write a message first.");
        if (text.length > 2000) throw new ApiError("validation", "Messages are limited to 2000 characters.");
        const m = { id: uid("m"), connectionId, senderId: vid, body: text, at: now(), deliveredAt: null, readAt: null, kind: "text" as const, clientId };
        db.messages.push(m);
        notify(db, other, { kind: "message", title: `New message from ${v.profile.displayName}`, body: text.slice(0, 80), href: `/chats/${connectionId}` });
        const { connectionId: _c, ...rest } = m;
        void _c;
        return rest;
      }, 120),
  },

  safety: {
    block: (id) =>
      run((db) => {
        const vid = me(db).account.id;
        if (!db.blocks.some((b) => b.from === vid && b.to === id)) db.blocks.push({ from: vid, to: id });
        db.connections.forEach((c) => {
          if (!c.endedAt && ((c.a === vid && c.b === id) || (c.a === id && c.b === vid))) c.endedAt = now();
        });
      }),
    report: (input) =>
      run((db) => {
        const vid = me(db).account.id;
        if (input.details.length > 2000) throw new ApiError("validation", "Keep the details under 2000 characters.");
        db.reports.push({ id: uid("rep"), from: vid, targetId: input.targetId, category: input.category, details: input.details, at: now() });
      }),
    trustedContacts: () => run((db) => db.trusted.filter((t) => t.userId === me(db).account.id).map(({ userId: _u, ...t }) => (void _u, t))),
    saveTrustedContact: (c) =>
      run((db) => {
        const vid = me(db).account.id;
        if (!c.name.trim() || !/^\+?\d{7,15}$/.test(c.phone.replace(/[\s-]/g, ""))) throw new ApiError("validation", "Add a name and a valid phone number.");
        if (c.id) {
          const t = db.trusted.find((x) => x.id === c.id && x.userId === vid);
          if (!t) throw new ApiError("not_found", "Contact not found.");
          Object.assign(t, c);
          return { id: t.id, name: t.name, phone: t.phone, relation: t.relation };
        }
        if (db.trusted.filter((x) => x.userId === vid).length >= 5) throw new ApiError("validation", "You can add up to 5 trusted contacts.");
        const t = { ...c, id: uid("tc"), userId: vid };
        db.trusted.push(t);
        return { id: t.id, name: t.name, phone: t.phone, relation: t.relation };
      }),
    removeTrustedContact: (id) =>
      run((db) => {
        const vid = me(db).account.id;
        db.trusted = db.trusted.filter((x) => !(x.id === id && x.userId === vid));
      }),
  },

  notifications: {
    list: () => run((db) => db.notifications.filter((n) => n.userId === me(db).account.id).map(({ userId: _u, ...n }) => (void _u, n)), 120),
    markAllRead: () =>
      run((db) => {
        const vid = me(db).account.id;
        db.notifications.forEach((n) => {
          if (n.userId === vid) n.read = true;
        });
      }, 80),
  },

  provider: {
    settings: () =>
      run((db) => {
        const u = me(db);
        const p = u.provider ?? emptyProvider(u);
        const { rank: _r, ratingSum: _s, ratingCount: _c, completed: _d, responseMinutes: _m, score: _x, cancellationRate: _y, acceptanceRate: _z, events: _e, ...settings } = p;
        void [_r, _s, _c, _d, _m, _x, _y, _z, _e];
        return settings;
      }),
    activate: () =>
      run((db) => {
        const u = me(db);
        if (u.account.verification !== "verified") throw new ApiError("forbidden", "Verify your identity before offering experiences.");
        if (!market(u.account.country)?.features.booking) throw new ApiError("market_unavailable", "Bookings are not open in your country yet.");
        if (!u.provider) u.provider = emptyProvider(u);
        u.account.isProvider = true;
        return u.account;
      }),
    saveSettings: (s) =>
      run((db) => {
        const u = me(db);
        if (!u.provider) throw new ApiError("forbidden", "Activate provider mode first.");
        const fields: Record<string, string> = {};
        if (!s.categories.length) fields.categories = "Choose at least one experience.";
        if (s.headline.length > 80) fields.headline = "Keep the headline under 80 characters.";
        if (s.arrangement !== "free") {
          const enabled = s.rates.filter((r) => r.enabled);
          if (!enabled.length) fields.rates = "Turn on at least one duration and set its price.";
          for (const r of enabled) {
            if (!r.price || !Number.isSafeInteger(r.price.amountMinor) || r.price.amountMinor <= 0) fields[`rate_${r.hours}`] = "Enter a price above zero.";
            else if (r.price.currency !== s.currency) fields[`rate_${r.hours}`] = "Use your provider currency.";
          }
        }
        if (s.rates.length !== DURATIONS.length || !DURATIONS.every((h) => s.rates.some((r) => r.hours === h))) fields.rates = "All six durations must be present.";
        if (Object.keys(fields).length) throw new ApiError("validation", "Please check the highlighted fields.", fields);
        for (const r of s.rates) {
          const prev = rateFor(u.provider, r.hours);
          const before = prev?.enabled ? prev.price : null;
          const after = r.enabled ? r.price : null;
          if ((before?.amountMinor ?? null) !== (after?.amountMinor ?? null)) db.rateHistory.unshift({ userId: u.account.id, at: now(), hours: r.hours, from: before, to: after });
        }
        const status = u.provider.status === "draft" ? "active" : u.provider.status;
        u.provider = { ...u.provider, ...s, status, timezone: u.provider.timezone, priceLimits: u.provider.priceLimits };
        const { rank: _r, ratingSum: _s, ratingCount: _c, completed: _d, responseMinutes: _m, score: _x, cancellationRate: _y, acceptanceRate: _z, events: _e, ...settings } = u.provider;
        void [_r, _s, _c, _d, _m, _x, _y, _z, _e];
        return settings;
      }),
    performance: () =>
      run<ProviderPerformance>((db) => {
        const p = me(db).provider;
        if (!p) throw new ApiError("forbidden", "Activate provider mode first.");
        const r = rankFor(p.score);
        return {
          rank: p.rank,
          nextRank: r.next,
          score: p.score,
          progressToNext: r.progress,
          completedBookings: p.completed,
          cancellationRate: p.cancellationRate,
          acceptanceRate: p.acceptanceRate,
          rating: { average: p.ratingCount ? Math.round((p.ratingSum / p.ratingCount) * 10) / 10 : 0, count: p.ratingCount },
          responseMinutes: p.responseMinutes,
          events: p.events,
        };
      }),
    rateHistory: () => run((db) => db.rateHistory.filter((r) => r.userId === me(db).account.id).map(({ userId: _u, ...r }) => (void _u, r))),
    earnings: () => run<Earnings>((db) => earningsOf(db, me(db))),
    payouts: () =>
      run((db) => {
        const vid = me(db).account.id;
        return db.payouts.filter((p) => p.userId === vid).map((p) => ({ id: p.id, amount: { amountMinor: p.amountMinor, currency: p.currency }, status: p.status, method: p.method, at: p.at }));
      }),
    payoutOptions: () =>
      run((db) => {
        const u = me(db);
        const c = u.account.country;
        const mk = market(c);
        return { country: c, currency: mk?.currency ?? "USD", gateway: gatewayFor(c), institutions: institutionsFor(c), holdHours: db.moneyRules.payoutHoldHours, enabled: !!mk?.features.payouts };
      }, 120),
    payoutAccount: () => run((db) => db.payoutAccounts[me(db).account.id] ?? null, 100),
    resolveAccount: (code, number) =>
      run((db) => {
        const u = me(db);
        const inst = institutionsFor(u.account.country).find((i) => i.code === code);
        if (!inst) throw new ApiError("validation", "Choose your bank or network.", { code: "Choose your bank or network." });
        const digits = number.replace(/\D/g, "");
        const ok = inst.kind === "bank" ? digits.length >= 8 && digits.length <= 16 : digits.length >= 9 && digits.length <= 12;
        if (!ok) throw new ApiError("validation", inst.kind === "bank" ? "Check the account number." : "Check the phone number.", { number: inst.kind === "bank" ? "Check the account number." : "Check the phone number." });
        // Simulation: numbers ending 0000 belong to someone else, to show the mismatch path.
        const accountName = digits.endsWith("0000") ? "SOMEONE ELSE" : u.account.fullName.toUpperCase();
        return { accountName, matchesVerifiedName: accountName === u.account.fullName.toUpperCase() };
      }, 700),
    requestPayoutCode: () =>
      run((db) => {
        const u = me(db);
        const code = String(Math.floor(100000 + Math.random() * 900000));
        db.payoutCodes[u.account.id] = { code, exp: Date.now() + 10 * 60_000 };
        const to = u.account.otpChannel === "sms" ? u.account.phone : u.account.email;
        db.outbox.unshift({ to, subject: "Confirm your payout details", body: `Your Meet code is ${code}. Someone is changing where your earnings are paid. If this was not you, do not share this code.`, at: now() });
        return { sentTo: to.replace(/^(.{2}).*(.{3})$/, "$1****$2") };
      }),
    setPayoutAccount: (input) =>
      run((db) => {
        const u = me(db);
        if (!u.provider) throw new ApiError("forbidden", "Only companions are paid out.");
        const c = db.payoutCodes[u.account.id];
        if (!c || c.exp < Date.now() || c.code !== input.code6.trim()) throw new ApiError("validation", "That code is wrong or has expired.", { code6: "That code is wrong or has expired." });
        const listed = input.code ? institutionsFor(u.account.country).find((i) => i.code === input.code) : null;
        const manual = input.manual ? { institution: input.manual.institution.trim(), accountName: input.manual.accountName.trim() } : null;
        if (!listed && !manual) throw new ApiError("validation", "Choose your bank or network, or type it in.");
        if (manual && (manual.institution.length < 2 || manual.accountName.length < 3)) throw new ApiError("validation", "Type the bank name and the name on the account.");
        const digits = input.number.replace(/\D/g, "");
        if (digits.length < 6 || digits.length > 20) throw new ApiError("validation", "Check the account number.", { number: "Check the account number." });
        if (!manual && digits.endsWith("0000")) throw new ApiError("validation", "The name on this account does not match your verified name.", { number: "The name on this account does not match your verified name." });
        const inst = listed ?? { name: manual!.institution, kind: input.kind };
        delete db.payoutCodes[u.account.id];
        const existing = db.payoutAccounts[u.account.id];
        const hold = existing ? db.moneyRules.payoutHoldHours : 0;
        const acc: PayoutAccount = {
          kind: inst.kind,
          institution: inst.name,
          last4: digits.slice(-4),
          accountName: manual ? manual.accountName.toUpperCase() : u.account.fullName.toUpperCase(),
          gateway: gatewayFor(u.account.country),
          check: manual ? "pending_review" : "verified",
          activeFrom: new Date(Date.now() + hold * 3_600_000).toISOString(),
          addedAt: now(),
        };
        db.payoutAccounts[u.account.id] = acc;
        const to = u.account.otpChannel === "sms" ? u.account.phone : u.account.email;
        db.outbox.unshift({ to, subject: "Your payout details changed", body: `Earnings will now go to ${inst.name} ending ${acc.last4}${hold ? ` from ${new Date(acc.activeFrom).toUTCString()}` : ""}. If this was not you, contact Meet support now.`, at: now() });
        notify(db, u.account.id, { kind: "payment", title: existing ? "Payout details changed" : "Payout details saved", body: hold ? `For your safety, payouts to ${inst.name} ending ${acc.last4} start in ${hold} hours.` : `Earnings will go to ${inst.name} ending ${acc.last4}.`, href: "/companion/payouts" });
        return acc;
      }, 500),
    withdraw: () =>
      run((db) => {
        const u = me(db);
        const acc = db.payoutAccounts[u.account.id];
        if (!acc) conflict("Add your payout details first.");
        if (acc.check === "pending_review") conflict("Meet is still checking your payout details.");
        if (acc.check === "rejected") conflict("We could not confirm your payout details. Please add them again.");
        if (new Date(acc.activeFrom).getTime() > Date.now()) conflict("Your new payout details are still in their safety wait.");
        if (!market(u.account.country)?.features.payouts) conflict("Payouts are not open in your country yet.");
        const e = earningsOf(db, u);
        if (e.available.amountMinor <= 0) conflict("There is nothing ready to withdraw.");
        const p = { id: uid("po"), userId: u.account.id, amountMinor: e.available.amountMinor, currency: e.currency, status: "paid" as const, method: `${acc.institution} ending ${acc.last4} (simulated)`, at: now() };
        db.payouts.unshift(p);
        notify(db, u.account.id, { kind: "payment", title: "Payout sent (simulated)", body: `${(p.amountMinor / 100).toLocaleString()} ${p.currency} to ${acc.institution} ending ${acc.last4}.`, href: "/companion/payouts" });
        return { id: p.id, amount: { amountMinor: p.amountMinor, currency: p.currency }, status: p.status, method: p.method, at: p.at };
      }, 900),
    analytics: () =>
      run((db) => {
        const u = me(db);
        if (!u.provider) throw new ApiError("forbidden", "Activate provider mode first.");
        return hostAnalytics(db, u);
      }, 200),
  },

  bookings: {
    list: (role) =>
      run((db) => {
        const vid = me(db).account.id;
        return db.bookings
          .filter((b) => (role === "customer" ? b.customerId : b.providerId) === vid)
          .sort((a, b) => b.startAt.localeCompare(a.startAt))
          .map((b) => toBooking(db, b, vid));
      }),
    get: (id) =>
      run((db) => {
        const v = me(db);
        return toBooking(db, bookingFor(db, id, v), v.account.id);
      }),
    request: (input) =>
      run((db) => {
        const v = active(db);
        const p = user(db, input.providerId);
        const pr = p.provider;
        if (input.providerId === v.account.id) conflict("You cannot book yourself.");
        if (!pr || pr.status !== "active") throw new ApiError("not_found", "This person is not taking bookings.");
        if (blockedBetween(db, v.account.id, p.account.id)) throw new ApiError("not_found", "This person is not taking bookings.");
        if (v.account.verification !== "verified") throw new ApiError("forbidden", "Verify your identity before booking.");
        const pm = market(p.account.country);
        if (!pm?.features.booking) throw new ApiError("market_unavailable", "Bookings are not open in this country yet.");
        if (p.account.country !== v.account.country && !pm.crossBorderBooking) throw new ApiError("market_unavailable", "Cross-border bookings are not available between these countries yet.");
        if (!pr.categories.includes(input.categoryId)) throw new ApiError("validation", "Choose one of this provider's experiences.", { categoryId: "Not offered by this provider." });
        const start = new Date(input.startAt).getTime();
        if (!Number.isFinite(start) || start < Date.now() + 2 * 3_600_000) throw new ApiError("validation", "Pick a start time at least 2 hours from now.", { startAt: "At least 2 hours from now." });
        if (!input.meetingArea.trim()) throw new ApiError("validation", "Suggest a public meeting area.", { meetingArea: "Suggest a public meeting area." });
        let priceMinor = 0;
        if (pr.arrangement !== "free") {
          const r = rateFor(pr, input.hours);
          if (!r?.enabled || !r.price) throw new ApiError("validation", "This duration is not offered.", { hours: "Not offered." });
          priceMinor = r.price.amountMinor;
        }
        // Price is snapshotted here: later rate changes never touch this booking.
        const b: MockBooking = {
          id: uid("bk"),
          reference: ref("MT"),
          customerId: v.account.id,
          providerId: p.account.id,
          categoryId: input.categoryId,
          hours: input.hours,
          startAt: new Date(start).toISOString(),
          timezone: pr.timezone,
          meetingArea: input.meetingArea.trim(),
          notes: input.notes.trim(),
          status: "requested",
          priceMinor,
          currency: pr.currency,
          proposal: null,
          events: [{ at: now(), label: "Booking requested", actor: "customer" }],
          checkIns: { customer: null, provider: null },
          reviewed: false,
          disputeId: null,
          refundMinor: 0,
          compensationMinor: 0,
          rules: { commissionPct: db.moneyRules.commissionPct, tiers: structuredClone(db.moneyRules.tiers), latePenalty: { ...db.moneyRules.latePenalty } },
          createdAt: now(),
        };
        db.bookings.push(b);
        const cat = CATEGORIES.find((c) => c.id === input.categoryId)!;
        chatNote(db, b, v.account.id, `${v.profile.displayName} requested a booking: ${cat.name}, ${input.hours === 24 ? "1 day" : input.hours === 48 ? "2 days" : input.hours === 1 ? "1 hour" : `${input.hours} hours`}, at ${b.meetingArea}. Talk through the plan here.`);
        notify(db, p.account.id, { kind: "booking", title: "New booking request", body: `${v.profile.displayName} requested ${input.hours} h of ${cat.name}.`, href: `/bookings/${b.id}` });
        return toBooking(db, b, v.account.id);
      }),
    act: (id, action: BookingAction) =>
      run((db) => {
        const v = me(db);
        const b = bookingFor(db, id, v);
        const isCustomer = b.customerId === v.account.id;
        const role = isCustomer ? "customer" : "provider";
        const other = isCustomer ? b.providerId : b.customerId;
        const name = v.profile.displayName;
        const event = (label: string, actor: Booking["events"][number]["actor"] = role) => b.events.push({ at: now(), label, actor });
        const tell = (title: string, body: string) => notify(db, other, { kind: "booking", title, body, href: `/bookings/${b.id}` });
        const started = Date.now() >= new Date(b.startAt).getTime();
        const pr = db.users[b.providerId].provider!;

        switch (action.type) {
          case "accept":
            if (isCustomer || b.status !== "requested") conflict("This request can no longer be accepted.");
            b.status = "accepted";
            event("Accepted by provider");
            chatNote(db, b, v.account.id, `${name} accepted the booking. Payment is next.`);
            tell("Booking accepted", `${name} accepted. Complete payment to confirm.`);
            break;
          case "decline":
            if (isCustomer || !["requested", "adjustment_proposed"].includes(b.status)) conflict("This request can no longer be declined.");
            b.status = "declined";
            b.proposal = null;
            chatNote(db, b, v.account.id, `${name} declined this booking request.`);
            event(`Declined by provider${action.reason ? `: ${action.reason}` : ""}`);
            tell("Booking declined", `${name} is not available for this booking.`);
            break;
          case "propose": {
            if (!["requested", "adjustment_proposed"].includes(b.status)) conflict("Changes can only be proposed before the booking is agreed.");
            let price: Money | undefined;
            if (action.hours && action.hours !== b.hours && pr.arrangement !== "free") {
              const r = rateFor(pr, action.hours);
              if (!r?.enabled || !r.price) throw new ApiError("validation", "That duration is not offered.");
              price = r.price;
            }
            b.proposal = { by: role, startAt: action.startAt, hours: action.hours, meetingArea: action.meetingArea?.trim() || undefined, price, note: action.note.trim(), at: now() };
            chatNote(db, b, v.account.id, `${name} suggested a change to the booking${action.meetingArea ? `: meet at ${action.meetingArea.trim()}` : ""}.`);
            b.status = "adjustment_proposed";
            event(`Change proposed by ${role}`);
            tell("Change proposed", `${name} proposed a change to your booking.`);
            break;
          }
          case "accept_proposal":
          case "reject_proposal": {
            if (b.status !== "adjustment_proposed" || !b.proposal || b.proposal.by === role) conflict("There is no proposal for you to answer.");
            if (action.type === "accept_proposal") {
              if (b.proposal.startAt) b.startAt = b.proposal.startAt;
              if (b.proposal.hours) b.hours = b.proposal.hours;
              if (b.proposal.meetingArea) b.meetingArea = b.proposal.meetingArea;
              if (b.proposal.price) b.priceMinor = b.proposal.price.amountMinor;
              b.status = "accepted";
              event("Change accepted, terms agreed");
              tell("Change accepted", isCustomer ? `${name} accepted your change.` : `${name} accepted your change. Complete payment to confirm.`);
            } else {
              b.status = "requested";
              event("Change rejected");
              tell("Change rejected", `${name} kept the original request.`);
            }
            b.proposal = null;
            break;
          }
          case "check_in":
            if (!["confirmed", "in_progress"].includes(b.status)) conflict("Check-in opens once the booking is confirmed.");
            if (Date.now() < new Date(b.startAt).getTime() - 2 * 3_600_000) conflict("Check-in opens 2 hours before the start time.");
            b.checkIns[role] = now();
            b.status = "in_progress";
            event(`${isCustomer ? "Customer" : "Provider"} checked in`);
            break;
          case "mark_completed":
            if (isCustomer || !["confirmed", "in_progress"].includes(b.status)) conflict("Only the provider can mark a confirmed booking completed.");
            if (!started) conflict("You can mark it completed after the start time.");
            b.status = "provider_completed";
            event("Marked completed by provider");
            tell("Please confirm your booking", `${name} marked your booking as completed. Confirm or raise a dispute.`);
            break;
          case "confirm_completion":
            if (!isCustomer || b.status !== "provider_completed") conflict("There is nothing to confirm.");
            b.status = "completed";
            event("Completion confirmed by customer");
            pr.completed += 1;
            pr.score = Math.min(1000, pr.score + 8);
            pr.events.unshift({ at: now(), delta: 8, reason: "Booking completed", bookingRef: b.reference });
            tell("Booking completed", `${name} confirmed completion. Earnings move to available once released.`);
            break;
          case "cancel": {
            if (["completed", "customer_cancelled", "provider_cancelled", "platform_cancelled", "declined", "expired", "disputed"].includes(b.status)) conflict("This booking cannot be cancelled.");
            if (started) conflict("The start time has passed. Raise a dispute or report a no-show instead.");
            const paid = ["confirmed", "in_progress"].includes(b.status);
            if (isCustomer) {
              if (paid) {
                const q = quote(db, b, "member");
                b.refundMinor = q.refund.amountMinor;
                b.compensationMinor = q.compensation.amountMinor;
                b.platformMinor = q.platform.amountMinor;
                event(`Cancelled by customer with ${Math.floor(q.noticeHours)} h notice. Refund ${q.tier.refundPct}%, provider compensation ${q.tier.compensationPct}%`);
              } else event("Cancelled by customer before payment");
              b.status = "customer_cancelled";
              tell("Booking cancelled", `${name} cancelled the booking.`);
            } else {
              if (!action.providerReason) throw new ApiError("validation", "Choose a reason for cancelling.");
              b.status = "provider_cancelled";
              if (paid) {
                const q = quote(db, b, "companion");
                b.refundMinor = b.priceMinor;
                b.penaltyMinor = q.penalty?.amountMinor ?? 0;
                if (q.penalty) event(`Late cancellation: ${q.penalty.amountMinor / 100} ${b.currency} penalty to be taken from the provider's next payout`);
                pr.score = Math.max(0, pr.score - 25);
                pr.events.unshift({ at: now(), delta: -25, reason: `Cancelled a confirmed booking (${action.providerReason.replace("_", " ")}). Emergencies can be reviewed by staff.`, bookingRef: b.reference });
              }
              event(`Cancelled by provider (${action.providerReason.replace("_", " ")})${paid ? ". Full refund initiated" : ""}`);
              tell("Booking cancelled", `${name} cancelled.${paid ? " A full refund has been initiated." : ""}`);
            }
            break;
          }
        }
        return toBooking(db, b, v.account.id);
      }),
    cancellationQuote: (id) =>
      run((db) => {
        const v = me(db);
        const b = bookingFor(db, id, v);
        return quote(db, b, b.customerId === v.account.id ? "member" : "companion");
      }, 150),
    checkout: (id) =>
      run((db) => {
        const v = me(db);
        const b = bookingFor(db, id, v);
        if (b.customerId !== v.account.id) throw new ApiError("forbidden", "Only the customer can pay for this booking.");
        if (b.status !== "accepted") conflict("This booking is not awaiting payment.");
        const m = market(db.users[b.providerId].account.country);
        return {
          bookingId: b.id,
          breakdown: breakdown(b.priceMinor, b.currency, db.users[b.providerId].account.country, rulesOf(b).commissionPct),
          gateway: gatewayFor(db.users[b.providerId].account.country),
          methods: [
            { id: "card", label: "Debit or credit card", kind: "card" as const },
            { id: "bank", label: "Bank transfer", kind: "bank_transfer" as const },
            { id: "momo", label: "Mobile money", kind: "mobile_money" as const },
          ],
          available: !!m?.features.payments,
          unavailableReason: m?.features.payments ? undefined : "Payments are not enabled in this market yet.",
          simulated: true,
        };
      }),
    pay: (id, methodId) =>
      run((db) => {
        const v = me(db);
        const b = bookingFor(db, id, v);
        if (b.customerId !== v.account.id) throw new ApiError("forbidden", "Only the customer can pay.");
        // Idempotent: paying twice never creates a second payment.
        if (db.payments.some((p) => p.bookingId === b.id && p.status === "succeeded")) return toBooking(db, b, v.account.id);
        if (b.status !== "accepted") conflict("This booking is not awaiting payment.");
        const label = { card: "Card ending 4242 (simulated)", bank: "Bank account ending 0193 (simulated)", momo: "Mobile money ending 7781 (simulated)" }[methodId] ?? "Simulated";
        const country = db.users[b.providerId].account.country;
        db.payments.push({ id: uid("pay"), reference: ref("PAY"), bookingId: b.id, userId: v.account.id, amountMinor: breakdown(b.priceMinor, b.currency, country, rulesOf(b).commissionPct).total.amountMinor, currency: b.currency, status: "succeeded", method: label, gateway: gatewayFor(country), at: now() });
        b.status = "confirmed";
        b.events.push({ at: now(), label: "Payment verified (simulated), booking confirmed", actor: "system" });
        chatNote(db, b, v.account.id, "Payment received. The booking is confirmed.");
        notify(db, b.providerId, { kind: "booking", title: "Booking confirmed", body: `${v.profile.displayName} paid. The booking is confirmed.`, href: `/bookings/${b.id}` });
        notify(db, v.account.id, { kind: "payment", title: "Payment received (simulated)", body: `Booking ${b.reference} is confirmed.`, href: `/bookings/${b.id}` });
        return toBooking(db, b, v.account.id);
      }, 900),
    payments: () =>
      run((db) => {
        const vid = me(db).account.id;
        return db.payments
          .filter((p) => p.userId === vid)
          .map((p) => {
            const b = db.bookings.find((x) => x.id === p.bookingId);
            return { id: p.id, reference: p.reference, bookingRef: b?.reference ?? "", amount: { amountMinor: p.amountMinor, currency: p.currency }, status: b && (b.status === "customer_cancelled" || b.status === "provider_cancelled" || b.status === "platform_cancelled" || b.status === "completed") && b.refundMinor ? (b.refundMinor === p.amountMinor ? "refunded" : "partially_refunded") : p.status, method: p.method, at: p.at };
          })
          .sort((a, b) => b.at.localeCompare(a.at));
      }),
    review: (id, input) =>
      run((db) => {
        const v = me(db);
        const b = bookingFor(db, id, v);
        if (b.customerId !== v.account.id || b.status !== "completed" || b.reviewed) conflict("You can review a booking once, after it is completed.");
        if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) throw new ApiError("validation", "Choose a rating from 1 to 5.");
        if (input.body.length > 1000) throw new ApiError("validation", "Keep your review under 1000 characters.");
        b.reviewed = true;
        db.reviews.unshift({ id: uid("rv"), bookingRef: b.reference, bookingId: b.id, subjectId: b.providerId, author: personRef(v), rating: input.rating, body: input.body.trim(), tags: input.tags, at: now(), response: null });
        const pr = db.users[b.providerId].provider!;
        pr.ratingSum += input.rating;
        pr.ratingCount += 1;
        notify(db, b.providerId, { kind: "review", title: "New review", body: `${v.profile.displayName} left a ${input.rating} star review.`, href: `/people/${b.providerId}` });
      }),
    openDispute: (id, input) =>
      run((db) => {
        const v = me(db);
        const b = bookingFor(db, id, v);
        if (b.disputeId) conflict("A dispute is already open for this booking.");
        if (!["confirmed", "in_progress", "provider_completed", "completed", "customer_cancelled", "provider_cancelled"].includes(b.status)) conflict("Disputes are for paid bookings.");
        if (input.description.trim().length < 20) throw new ApiError("validation", "Describe what happened in at least 20 characters.");
        const role = b.customerId === v.account.id ? "customer" : "provider";
        const d = { id: uid("dsp"), bookingId: b.id, bookingRef: b.reference, kind: input.kind, status: "open" as const, description: input.description.trim(), openedBy: role as "customer" | "provider", at: now(), resolution: null, userId: v.account.id };
        db.disputes.push(d);
        b.disputeId = d.id;
        b.status = "disputed";
        b.events.push({ at: now(), label: `Dispute opened by ${role}. Payout on hold until reviewed`, actor: role });
        notify(db, role === "customer" ? b.providerId : b.customerId, { kind: "dispute", title: "Dispute opened", body: `A dispute was opened on booking ${b.reference}. Our team will review it.`, href: `/bookings/${b.id}` });
        const { userId: _u, ...rest } = d;
        void _u;
        return rest;
      }),
  },

  admin: {
    analytics: () =>
      run((db) => {
        const u = me(db);
        if (!u.account.roles.length) throw new ApiError("forbidden", "Staff only.");
        return adminAnalytics(db);
      }, 200),
    stats: () =>
      run((db) => {
        const u = me(db);
        if (!u.account.roles.length) throw new ApiError("forbidden", "Staff only.");
        const all = Object.values(db.users).filter((x) => !x.account.roles.length);
        return {
          members: all.length,
          companions: all.filter((x) => x.account.isProvider).length,
          pendingVerification: all.filter((x) => x.account.verification === "pending").length,
          openDisputes: db.disputes.filter((d) => d.status === "open" || d.status === "under_review").length,
          openReports: db.reports.filter((r) => (r.status ?? "open") === "open").length,
          connections: db.connections.filter((c) => !c.endedAt).length,
          messages: db.messages.length,
          byStatus: Object.fromEntries(Object.keys(BOOKING_STATUS).map((k) => [k, db.bookings.filter((b) => b.status === k).length])) as AdminStats["byStatus"],
          bookings: db.bookings.length,
          activeMarkets: db.markets.filter((m) => m.status === "active").length,
        };
      }, 120),
    verificationQueue: () =>
      run((db) => {
        staff(db, "verification");
        return Object.values(db.users)
          .filter((x) => ["pending", "needs_info"].includes(x.account.verification) && !x.account.roles.length)
          .map((x) => ({
            userId: x.account.id,
            name: x.account.fullName,
            username: x.account.username,
            photo: x.profile.photos[0] ?? null,
            role: x.account.role,
            country: x.account.country,
            age: ageFrom(x.account.dateOfBirth),
            documentType: x.private.kyc.document?.type ?? null,
            documentCountry: x.private.kyc.document?.country ?? null,
            hasBack: !!x.private.kyc.document?.hasBack,
            selfie: !!x.private.kyc.selfieSubmittedAt,
            submittedAt: x.private.kyc.selfieSubmittedAt ?? x.private.kyc.document?.submittedAt ?? null,
            status: x.account.verification,
          }))
          .sort((a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""));
      }),
    kycReview: (userId) =>
      run((db) => {
        const actor = staff(db, "verification");
        const u = user(db, userId);
        audit(db, actor, "Viewed identity documents", `@${u.account.username}`, "Verification review");
        const k = u.private.kyc;
        return {
          case: {
            userId: u.account.id,
            name: u.account.fullName,
            username: u.account.username,
            photo: u.profile.photos[0] ?? null,
            role: u.account.role,
            country: u.account.country,
            age: ageFrom(u.account.dateOfBirth),
            documentType: k.document?.type ?? null,
            documentCountry: k.document?.country ?? null,
            hasBack: !!k.document?.hasBack,
            selfie: !!k.selfieSubmittedAt,
            submittedAt: k.selfieSubmittedAt ?? k.document?.submittedAt ?? null,
            status: u.account.verification,
          },
          fullName: u.account.fullName,
          dateOfBirth: u.account.dateOfBirth,
          email: u.account.email,
          phone: u.account.phone,
          files: filesFor(u),
          profilePhotos: u.profile.photos,
          reviewerNote: k.reviewerNote,
          history: db.audit.filter((a) => a.target === `@${u.account.username}`).slice(0, 30),
        };
      }),
    decide: (userId, decision, note) =>
      run((db) => {
        const actor = staff(db, "verification");
        const u = user(db, userId);
        if (decision !== "approve" && note.trim().length < 5) throw new ApiError("validation", "Add a short note the person will see.");
        u.account.verification = decision === "approve" ? "verified" : decision === "reject" ? "rejected" : "needs_info";
        u.private.kyc.reviewerNote = decision === "approve" ? null : note.trim();
        if (decision !== "approve") {
          // They need to resubmit, so the identity steps reopen.
          u.private.kyc = { document: null, selfieSubmittedAt: null, reviewerNote: note.trim() };
          u.account.onboarded = false;
        }
        notify(db, userId, {
          kind: "verification",
          title: decision === "approve" ? "You are verified" : decision === "reject" ? "Verification not approved" : "We need a little more",
          body: decision === "approve" ? "Your account is approved. Welcome to Meet." : note.trim(),
          href: decision === "approve" ? "/home" : "/onboarding?step=id_document",
        });
        audit(db, actor, decision === "approve" ? "Verification approved" : decision === "reject" ? "Verification rejected" : "More information requested", `@${u.account.username}`, note.trim() || "Documents match");
      }),
    user: (id) =>
      run((db) => {
        staff(db, "users");
        const u = user(db, id);
        const row = {
          id: u.account.id,
          name: u.account.fullName,
          username: u.account.username,
          email: u.account.email,
          photo: u.profile.photos[0] ?? null,
          role: u.account.role,
          staff: u.account.roles,
          country: u.account.country,
          verification: u.account.verification,
          onboarded: u.account.onboarded,
          joinedAt: u.account.createdAt,
        };
        return {
          row,
          displayName: u.profile.displayName,
          bio: u.profile.bio,
          photos: u.profile.photos,
          city: u.account.city,
          isProvider: u.account.isProvider,
          rank: u.provider?.rank ?? null,
          connections: db.connections.filter((c) => !c.endedAt && (c.a === id || c.b === id)).length,
          messagesSent: db.messages.filter((m) => m.senderId === id).length,
          bookings: db.bookings.filter((b) => b.customerId === id || b.providerId === id).map((b) => adminBooking(db, b)),
          payoutAccount: db.payoutAccounts[id] ?? null,
          reportsAgainst: db.reports.filter((r) => r.targetId === id).length,
          reportsMade: db.reports.filter((r) => r.from === id).length,
          activity: activityOf(db, id).slice(0, 30),
        };
      }),
    activity: () =>
      run((db) => {
        staff(db, "activity");
        return activityOf(db);
      }),
    bookings: () =>
      run((db) => {
        staff(db, "bookings");
        return db.bookings.map((b) => adminBooking(db, b)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      }),
    booking: (id) =>
      run((db) => {
        staff(db, "bookings");
        const b = db.bookings.find((x) => x.id === id);
        if (!b) throw new ApiError("not_found", "Booking not found.");
        return adminBooking(db, b);
      }),
    bookingAction: (id, action, reason) =>
      run((db) => {
        const actor = staff(db, "bookings");
        const b = db.bookings.find((x) => x.id === id);
        if (!b) throw new ApiError("not_found", "Booking not found.");
        if (reason.trim().length < 5) throw new ApiError("validation", "Record a reason for this action.");
        const tell = (title: string, body: string) => [b.customerId, b.providerId].forEach((uid_) => notify(db, uid_, { kind: "booking", title, body, href: `/bookings/${b.id}` }));
        if (action.type === "platform_cancel") {
          if (["completed", "customer_cancelled", "provider_cancelled", "platform_cancelled", "declined", "expired"].includes(b.status)) conflict("This booking is already closed.");
          const paid = db.payments.some((p) => p.bookingId === b.id && p.status === "succeeded");
          b.status = "platform_cancelled";
          b.refundMinor = paid ? b.priceMinor : 0;
          b.compensationMinor = 0;
          b.payoutHeld = false;
          b.events.push({ at: now(), label: `Cancelled by Meet${paid ? ". Full refund initiated" : ""}. The companion is not penalised`, actor: "staff" });
          tell("Booking cancelled by Meet", `Booking ${b.reference} was cancelled by our team.${paid ? " A full refund has been initiated." : ""}`);
          audit(db, actor, "Booking cancelled", b.reference, reason.trim());
        } else if (action.type === "hold_payout") {
          b.payoutHeld = true;
          b.events.push({ at: now(), label: "Payout put on hold by Meet", actor: "staff" });
          audit(db, actor, "Payout held", b.reference, reason.trim());
        } else {
          if (b.status === "disputed") conflict("Resolve the dispute to release this payout.");
          b.payoutHeld = false;
          b.events.push({ at: now(), label: "Payout hold released by Meet", actor: "staff" });
          audit(db, actor, "Payout released", b.reference, reason.trim());
        }
        return adminBooking(db, b);
      }),
    resolveDispute: (id, r) =>
      run((db) => {
        const actor = staff(db, "disputes");
        const d = db.disputes.find((x) => x.id === id);
        if (!d) throw new ApiError("not_found", "Dispute not found.");
        if (d.status === "resolved" || d.status === "rejected") conflict("This dispute is already closed.");
        if (!Number.isInteger(r.refundPct) || r.refundPct < 0 || r.refundPct > 100) throw new ApiError("validation", "Refund must be between 0 and 100 percent.");
        if (r.note.trim().length < 10) throw new ApiError("validation", "Explain the decision in at least 10 characters. Both people will see it.");
        const b = db.bookings.find((x) => x.id === d.bookingId)!;
        const hostShare = Math.floor((b.priceMinor * (100 - r.refundPct)) / 100);
        b.refundMinor = b.priceMinor - hostShare;
        b.status = r.refundPct === 100 ? "platform_cancelled" : "completed";
        b.payoutHeld = false;
        b.events.push({ at: now(), label: `Dispute resolved by Meet: ${r.refundPct}% refunded to the member, ${100 - r.refundPct}% to the companion`, actor: "staff" });
        d.status = "resolved";
        d.resolution = r.note.trim();
        const pr = db.users[b.providerId].provider;
        if (pr && r.scoreDelta) {
          pr.score = Math.max(0, Math.min(1000, pr.score + r.scoreDelta));
          pr.events.unshift({ at: now(), delta: r.scoreDelta, reason: `Dispute decision on ${b.reference}: ${r.note.trim()}`, bookingRef: b.reference });
        }
        [b.customerId, b.providerId].forEach((u) => notify(db, u, { kind: "dispute", title: "Dispute resolved", body: r.note.trim(), href: `/bookings/${b.id}` }));
        audit(db, actor, "Dispute resolved", b.reference, `${r.refundPct}% refund${r.scoreDelta ? `, companion score ${r.scoreDelta > 0 ? "+" : ""}${r.scoreDelta}` : ""}. ${r.note.trim()}`);
      }),
    finance: () =>
      run((db) => {
        staff(db, "finance");
        const currencies = Array.from(new Set(db.bookings.map((b) => b.currency)));
        const summaries = currencies.map((cur) => {
          const m = (n: number): Money => ({ amountMinor: n, currency: cur });
          const bs = db.bookings.filter((b) => b.currency === cur);
          const pays = db.payments.filter((p) => p.currency === cur && p.status === "succeeded");
          const sum = (xs: number[]) => xs.reduce((a, x) => a + x, 0);
          return {
            currency: cur,
            volume: m(sum(pays.map((p) => p.amountMinor))),
            payments: pays.length,
            refunds: m(sum(bs.map((b) => b.refundMinor ?? 0))),
            compensation: m(sum(bs.map((b) => b.compensationMinor ?? 0))),
            hostPending: m(sum(bs.filter((b) => ["confirmed", "in_progress", "provider_completed", "disputed"].includes(b.status)).map((b) => b.priceMinor - share(b.priceMinor, rulesOf(b).commissionPct)))),
            hostAvailable: m(Math.max(0, sum(bs.map((b) => settlementOf(db, b)?.companion.amountMinor ?? 0)) - sum(bs.map((b) => b.penaltyMinor ?? 0)) - sum(db.payouts.filter((p) => p.currency === cur).map((p) => p.amountMinor)))),
            paidOut: m(sum(db.payouts.filter((p) => p.currency === cur).map((p) => p.amountMinor))),
            platformRevenue: m(sum(bs.map((b) => settlementOf(db, b)?.platform.amountMinor ?? 0)) + sum(bs.map((b) => b.penaltyMinor ?? 0))),
          };
        });
        const ledger: LedgerEntry[] = [];
        for (const p of db.payments) {
          const b = db.bookings.find((x) => x.id === p.bookingId);
          ledger.push({ id: `lp_${p.id}`, at: p.at, kind: "payment", bookingRef: b?.reference ?? "", party: handle(db, p.userId), amount: { amountMinor: p.amountMinor, currency: p.currency }, status: p.status });
        }
        for (const b of db.bookings) {
          const last = b.events[b.events.length - 1]?.at ?? b.createdAt;
          if (b.refundMinor) ledger.push({ id: `lr_${b.id}`, at: last, kind: "refund", bookingRef: b.reference, party: handle(db, b.customerId), amount: { amountMinor: b.refundMinor, currency: b.currency }, status: "initiated (simulated)" });
          if (b.compensationMinor) ledger.push({ id: `lc_${b.id}`, at: last, kind: "compensation", bookingRef: b.reference, party: handle(db, b.providerId), amount: { amountMinor: b.compensationMinor, currency: b.currency }, status: "available" });
          const st = settlementOf(db, b);
          if (b.status === "completed" && st) ledger.push({ id: `le_${b.id}`, at: last, kind: "host_earning", bookingRef: b.reference, party: handle(db, b.providerId), amount: st.companion, status: b.payoutHeld ? "on hold" : "available" });
          if (st?.platform.amountMinor) ledger.push({ id: `lf_${b.id}`, at: last, kind: "platform_fee", bookingRef: b.reference, party: "Meet", amount: st.platform, status: `${rulesOf(b).commissionPct}% share` });
          if (b.penaltyMinor) ledger.push({ id: `ln_${b.id}`, at: last, kind: "penalty", bookingRef: b.reference, party: handle(db, b.providerId), amount: { amountMinor: b.penaltyMinor, currency: b.currency }, status: "from next payout" });
        }
        for (const p of db.payouts) ledger.push({ id: `lo_${p.id}`, at: p.at, kind: "payout", bookingRef: "", party: handle(db, p.userId), amount: { amountMinor: p.amountMinor, currency: p.currency }, status: `${p.status} (simulated)` });
        const payoutReviews = Object.entries(db.payoutAccounts)
          .filter(([, a]) => a.check === "pending_review")
          .map(([userId, a]) => ({ userId, name: db.users[userId]?.account.fullName ?? userId, institution: a.institution, last4: a.last4, addedAt: a.addedAt }));
        return { summaries, ledger: ledger.sort((a, b) => b.at.localeCompare(a.at)), payoutReviews };
      }),
    reports: () =>
      run((db) => {
        staff(db, "reports");
        return db.reports
          .filter((r) => db.users[r.from] && db.users[r.targetId])
          .map((r) => ({
            id: r.id,
            at: r.at,
            category: r.category as AdminReport["category"],
            urgent: !!REPORT_CATEGORIES.find((c) => c.id === r.category)?.urgent,
            details: r.details,
            reporter: personRef(db.users[r.from]),
            target: personRef(db.users[r.targetId]),
            bookingRef: r.bookingId ? (db.bookings.find((b) => b.id === r.bookingId)?.reference ?? null) : null,
            status: r.status ?? "open",
            resolution: r.resolution ?? null,
            priorReports: db.reports.filter((x) => x.targetId === r.targetId && x.id !== r.id).length,
          }))
          .sort((a, b) => Number(b.status === "open") - Number(a.status === "open") || Number(b.urgent) - Number(a.urgent) || b.at.localeCompare(a.at));
      }),
    resolveReport: (id, action, note) =>
      run((db) => {
        const actor = staff(db, "reports");
        const r = db.reports.find((x) => x.id === id);
        if (!r) throw new ApiError("not_found", "Report not found.");
        if ((r.status ?? "open") !== "open") conflict("This report is already closed.");
        if (note.trim().length < 5) throw new ApiError("validation", "Record a short note for this decision.");
        const target = user(db, r.targetId);
        r.status = action === "dismiss" ? "dismissed" : "actioned";
        r.resolution = note.trim();
        if (action === "warn") notify(db, r.targetId, { kind: "security", title: "A warning from Meet", body: note.trim(), href: "/community-rules" });
        if (action === "suspend") {
          if (target.account.roles.length) throw new ApiError("forbidden", "Staff accounts are managed separately.");
          target.account.verification = "suspended";
        }
        notify(db, r.from, { kind: "security", title: "Thanks for your report", body: "Our team has reviewed it and taken action where needed.", href: null });
        audit(db, actor, action === "dismiss" ? "Report dismissed" : action === "warn" ? "Member warned" : "Account suspended after report", `@${target.account.username}`, note.trim());
      }),
    users: (query) =>
      run((db) => {
        staff(db, "users");
        const q = query.trim().toLowerCase();
        return Object.values(db.users)
          .filter((x) => !q || [x.account.fullName, x.account.username, x.account.email].some((v) => v.toLowerCase().includes(q)))
          .map((x) => ({
            id: x.account.id,
            name: x.account.fullName,
            username: x.account.username,
            email: x.account.email,
            photo: x.profile.photos[0] ?? null,
            role: x.account.role,
            staff: x.account.roles,
            country: x.account.country,
            verification: x.account.verification,
            onboarded: x.account.onboarded,
            joinedAt: x.account.createdAt,
          }))
          .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));
      }),
    setSuspended: (userId, suspended, reason) =>
      run((db) => {
        const actor = staff(db, "users");
        const u = user(db, userId);
        if (u.account.roles.length) throw new ApiError("forbidden", "Staff accounts are managed separately.");
        if (reason.trim().length < 5) throw new ApiError("validation", "Record a reason for this decision.");
        u.account.verification = suspended ? "suspended" : u.private.kyc.document && u.private.kyc.selfieSubmittedAt ? "verified" : "unverified";
        audit(db, actor, suspended ? "Account suspended" : "Account reactivated", `@${u.account.username}`, reason.trim());
      }),
    disputes: () =>
      run((db) => {
        staff(db, "disputes");
        return db.disputes.map(({ userId: _u, ...d }) => {
          void _u;
          const b = db.bookings.find((x) => x.id === d.bookingId)!;
          return { ...d, customer: db.users[b.customerId].profile.displayName, provider: db.users[b.providerId].profile.displayName, amount: { amountMinor: b.priceMinor, currency: b.currency } };
        });
      }),
    markets: () =>
      run((db) => {
        staff(db, "markets");
        return db.markets;
      }),
    updateMarket: (country, patch, reason) =>
      run((db) => {
        const actor = staff(db, "markets");
        const m = db.markets.find((x) => x.country === country);
        if (!m) throw new ApiError("not_found", "Unknown market.");
        if (reason.trim().length < 5) throw new ApiError("validation", "Record a reason for this change.");
        const before = JSON.stringify({ status: m.status, features: m.features });
        if (patch.status) m.status = patch.status;
        if (patch.features) m.features = { ...m.features, ...patch.features };
        // Payments and payouts need bookings; bookings need discovery; discovery needs registration.
        if (m.features.payouts) m.features.payments = true;
        if (m.features.payments) m.features.booking = true;
        if (m.features.booking) m.features.discovery = true;
        if (m.features.discovery) m.features.registration = true;
        if (JSON.stringify({ status: m.status, features: m.features }) !== before) audit(db, actor, "Market updated", countryName(country), reason.trim());
        return m;
      }),
    reviewPayoutAccount: (userId, approve, reason) =>
      run((db) => {
        const actor = staff(db, "finance");
        const acc = db.payoutAccounts[userId];
        if (!acc) throw new ApiError("not_found", "No payout details to review.");
        if (reason.trim().length < 5) throw new ApiError("validation", "Record a reason for this decision.");
        acc.check = approve ? "verified" : "rejected";
        audit(db, actor, approve ? "Payout details approved" : "Payout details rejected", `${handle(db, userId)}: ${acc.institution} ending ${acc.last4}`, reason.trim());
        notify(db, userId, { kind: "payment", title: approve ? "Payout details confirmed" : "Payout details not confirmed", body: approve ? `Earnings can now go to ${acc.institution} ending ${acc.last4}.` : "We could not confirm the account is in your name. Please add other details.", href: "/companion/payouts" });
      }),
    moneyRules: () =>
      run((db) => {
        staff(db, "finance");
        return db.moneyRules;
      }, 120),
    updateMoneyRules: (patch, reason) =>
      run((db) => {
        const actor = staff(db, "finance");
        if (!actor.account.roles.some((r) => r === "super_admin" || r === "finance")) throw new ApiError("forbidden", "Only a Super Administrator or Finance team member can change money rules.");
        if (reason.trim().length < 5) throw new ApiError("validation", "Record a reason for this change.");
        const pctOk = (n: number, max = 100) => Number.isInteger(n) && n >= 0 && n <= max;
        if (!pctOk(patch.commissionPct, 50)) throw new ApiError("validation", "Meet's share must be a whole number from 0 to 50.");
        const t = [...patch.tiers].sort((a, b) => b.minHours - a.minHours);
        if (!t.length || t[t.length - 1].minHours !== 0) throw new ApiError("validation", "The last cancellation step must start at 0 hours.");
        if (t.some((x) => !pctOk(x.refundPct) || x.refundPct + x.compensationPct !== 100)) throw new ApiError("validation", "Each step must split 100% between refund and companion.");
        if (new Set(t.map((x) => x.minHours)).size !== t.length) throw new ApiError("validation", "Two steps start at the same hour.");
        const tiers = t.map((x, i) => ({ ...x, maxHours: i === 0 ? null : t[i - 1].minHours }));
        if (!pctOk(patch.latePenalty.pct, 50) || patch.latePenalty.withinHours < 0 || patch.latePenalty.withinHours > 168) throw new ApiError("validation", "Check the late cancellation penalty.");
        if (patch.payoutHoldHours < 0 || patch.payoutHoldHours > 168) throw new ApiError("validation", "The payout safety wait must be 0 to 168 hours.");
        const before = JSON.stringify({ c: db.moneyRules.commissionPct, t: db.moneyRules.tiers, l: db.moneyRules.latePenalty, h: db.moneyRules.payoutHoldHours });
        db.moneyRules = { commissionPct: patch.commissionPct, tiers, latePenalty: { ...patch.latePenalty }, payoutHoldHours: patch.payoutHoldHours, updatedAt: now(), updatedBy: actor.account.fullName };
        db.markets.forEach((m) => (m.commissionBps = patch.commissionPct * 100));
        if (JSON.stringify({ c: db.moneyRules.commissionPct, t: db.moneyRules.tiers, l: db.moneyRules.latePenalty, h: db.moneyRules.payoutHoldHours }) !== before) audit(db, actor, "Money rules updated", `Share ${patch.commissionPct}%, ${tiers.length} cancellation steps, late penalty ${patch.latePenalty.pct}% under ${patch.latePenalty.withinHours} h`, reason.trim());
        return db.moneyRules;
      }),
    audit: () =>
      run((db) => {
        staff(db, "audit");
        return db.audit.slice(0, 200);
      }),
  },

  reference: {
    categories: () => run(() => CATEGORIES, 60),
    markets: () => run((db) => db.markets, 60),
    policy: () => run(() => DEFAULT_POLICY, 60),
  },

  dev: {
    outbox: () => run((db) => db.outbox.slice(0, 20), 60),
    /** Simulates a verification officer approving the signed-in account. */
    approve: () =>
      run((db) => {
        const u = me(db);
        if (!statusOf(u).complete) throw new ApiError("conflict", "Finish every step first.");
        u.account.verification = "verified";
        notify(db, u.account.id, { kind: "verification", title: "You are verified", body: "Your account is approved. Welcome to Meet.", href: "/home" });
      }),
    reset: async () => {
      resetMockData();
      localStorage.removeItem(SESSION);
    },
  },
};

/* ---- simulated other side of a chat (used by src/lib/realtime/mock.ts) ---- */

/** The other person in a chat, from the signed-in viewer's side. */
export function mockPeer(connectionId: ID) {
  const db = load();
  const vid = sessionId();
  const c = db.connections.find((x) => x.id === connectionId && !x.endedAt);
  if (!c || !vid) return null;
  const other = db.users[c.a === vid ? c.b : c.a];
  return other ? { id: other.account.id, name: other.profile.displayName, me: vid } : null;
}

/** The peer's phone received (and optionally read) everything sent to them. */
export function mockPeerSaw(connectionId: ID, read: boolean) {
  const db = load();
  const peer = mockPeer(connectionId);
  if (!peer) return [];
  const changed: ID[] = [];
  db.messages.forEach((m) => {
    if (m.connectionId !== connectionId || m.senderId !== peer.me) return;
    if (!m.deliveredAt) {
      m.deliveredAt = now();
      changed.push(m.id);
    }
    if (read && !m.readAt) {
      m.readAt = now();
      if (!changed.includes(m.id)) changed.push(m.id);
    }
  });
  persist();
  return changed;
}

/** The peer sends a message. */
export function mockPeerSend(connectionId: ID, body: string) {
  const db = load();
  const peer = mockPeer(connectionId);
  if (!peer) return null;
  const m = { id: uid("m"), connectionId, senderId: peer.id, body, at: now(), deliveredAt: now(), readAt: null, kind: "text" as const };
  db.messages.push(m);
  db.users[peer.id].lastActive = now();
  persist();
  const { connectionId: _c, ...out } = m;
  void _c;
  return out;
}
