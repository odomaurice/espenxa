/*
 * DEVELOPMENT DATA. Seed for the in-browser mock API. Every photo in
 * public/people is AI-generated: none of these people exist. Prices are
 * illustrative, not recommendations.
 */
import { COUNTRIES } from "../../countries";
import type {
  BookingRules,
  MoneyRules,
  PaymentGateway,
  PayoutAccount,
  Payout,
  Account,
  AppNotification,
  Arrangement,
  CancellationPolicy,
  Category,
  DurationHours,
  Gender,
  ID,
  Intention,
  Market,
  Message,
  PrivacySettings,
  ProviderSettings,
  Rank,
  Rate,
  RateChange,
  Review,
  ScoreEvent,
  TrustedContact,
  Dispute,
  BookingStatus,
  BookingProposal,
  BookingEvent,
  PaymentStatus,
  Build,
  KycState,
  OnboardingStepId,
  Preferences,
  PrivateLocation,
  AuditEntry,
} from "../types";
import { DURATIONS } from "../types";

export const MOCK_VERSION = 12;
export const DEMO_PASSWORD = "meetdemo1";

/* ---- reference ---------------------------------------------------------- */

export const CATEGORIES: Category[] = [
  ["casual", "Casual companionship", "Relaxed company for an afternoon or evening."],
  ["dating", "Dating", "Getting to know someone, with no expectations attached."],
  ["conversation", "Conversations", "Good company and real conversation."],
  ["dinner", "Dinner and restaurants", "A companion for a meal out."],
  ["events", "Events and entertainment", "Shows, exhibitions, comedy and more."],
  ["concerts", "Concerts and parties", "Live music, festivals and parties."],
  ["travel", "Travel companionship", "Company on a trip or a visit."],
  ["sightseeing", "Sightseeing", "Exploring a city and its places."],
  ["recreation", "Recreational activities", "Games, sport, classes and hobbies."],
  ["outdoors", "Outdoor activities", "Hikes, beaches, parks and day trips."],
  ["gatherings", "Social gatherings", "Weddings, birthdays and get-togethers."],
  ["other", "Other approved experiences", "Anything else within the community rules."],
].map(([slug, name, description]) => ({ id: `cat_${slug}`, slug, name, description, active: true }));

export const DEFAULT_POLICY: CancellationPolicy = {
  id: "pol_default",
  name: "Standard policy (proposed)",
  tiers: [
    { minHours: 48, maxHours: null, refundPct: 100, compensationPct: 0 },
    { minHours: 24, maxHours: 48, refundPct: 90, compensationPct: 10 },
    { minHours: 12, maxHours: 24, refundPct: 75, compensationPct: 25 },
    { minHours: 3, maxHours: 12, refundPct: 50, compensationPct: 50 },
    { minHours: 0, maxHours: 3, refundPct: 25, compensationPct: 75 },
  ],
};

/** Agreed with the team: Meet keeps 10% of what companions earn. Everything here is editable in the admin console. */
export const DEFAULT_RULES: MoneyRules = {
  commissionPct: 10,
  tiers: DEFAULT_POLICY.tiers,
  latePenalty: { withinHours: 24, pct: 10 },
  payoutHoldHours: 48,
  updatedAt: new Date(0).toISOString(),
  updatedBy: null,
};

/** Paystack where it operates; Flutterwave everywhere else and as the backup. */
export const PAYSTACK = new Set(["NG", "GH", "KE", "ZA", "CI"]);
/** Countries where payouts can go to mobile money as well as banks. */
export const MOBILE_MONEY = new Set(["GH", "KE", "UG", "TZ", "RW", "ZM", "CM", "CI", "SN", "BJ", "BF", "ML", "NE", "TG", "GN", "MW", "CD", "CG", "GA", "SL", "LR", "MZ", "ET", "SO", "MG"]);

const ACTIVE = new Set(["NG", "GH", "KE", "ZA"]);
const DISCOVERY_ONLY = new Set(["RW", "MA", "EG", "CI", "SN", "TZ", "UG"]);

export const MARKETS: Market[] = COUNTRIES.map((c) => {
  const active = ACTIVE.has(c.code);
  const disc = active || DISCOVERY_ONLY.has(c.code);
  return {
    country: c.code,
    status: active ? "active" : disc ? "under_review" : "planned",
    features: { registration: disc, discovery: disc, booking: active, payments: active, payouts: active },
    currency: c.currency,
    languages: c.languages,
    paymentGateways: PAYSTACK.has(c.code) ? ["paystack", "flutterwave"] : ["flutterwave"],
    payoutMethods: MOBILE_MONEY.has(c.code) ? ["bank", "mobile_money"] : ["bank"],
    verificationProvider: null,
    commissionBps: DEFAULT_RULES.commissionPct * 100,
    taxBps: null,
    crossBorderBooking: false,
    categories: CATEGORIES.map((x) => x.id),
    policyId: DEFAULT_POLICY.id,
  };
});

/* Approximate city centres, used only to derive rounded distances. */
export const CITY_GEO: Record<string, [number, number]> = {
  Lagos: [6.52, 3.38],
  Abuja: [9.06, 7.49],
  Accra: [5.6, -0.19],
  Nairobi: [-1.29, 36.82],
  Johannesburg: [-26.2, 28.05],
  "Cape Town": [-33.92, 18.42],
  Kigali: [-1.95, 30.06],
  Casablanca: [33.57, -7.59],
};

/* ---- people ------------------------------------------------------------- */

export type MockProvider = ProviderSettings & {
  rank: Rank;
  ratingSum: number;
  ratingCount: number;
  completed: number;
  responseMinutes: number | null;
  score: number;
  cancellationRate: number;
  acceptanceRate: number;
  events: ScoreEvent[];
};

export type MockUser = {
  account: Account;
  password: string;
  profile: {
    displayName: string;
    bio: string;
    interests: string[];
    hobbies: string[];
    languages: string[];
    intentions: Intention[];
    photos: string[];
    privacy: PrivacySettings;
  };
  geo: [number, number] | null;
  lastActive: string;
  provider: MockProvider | null;
  /** Private onboarding data. Never returned on public profiles. */
  private: MockPrivate;
};

export type MockPrivate = {
  heightCm: number | null;
  build: Build | null;
  lookingForNote: string;
  preferences: Preferences;
  location: PrivateLocation | null;
  kyc: KycState;
  skipped: OnboardingStepId[];
  /** Steps saved at least once (some steps can be validly empty). */
  saved: OnboardingStepId[];
  otp: { code: string; exp: number; sentAt: number } | null;
};

export const DEFAULT_PREFERENCES: Preferences = { genders: [], ageMin: 18, ageMax: 60, heightMinCm: null, heightMaxCm: null, builds: [], notes: "" };

/** A finished, verified private record for seeded people. */
function seededPrivate(city: string, country: string, role: "member" | "companion"): MockPrivate {
  const all: OnboardingStepId[] =
    role === "companion"
      ? ["photos", "about", "experiences", "rates", "availability", "location", "id_document", "selfie"]
      : ["photos", "about", "looking_for", "preferences", "location", "id_document", "selfie"];
  return {
    heightCm: 170,
    build: "average",
    lookingForNote: "",
    preferences: DEFAULT_PREFERENCES,
    location: { line1: "Private address on file", line2: "", city, region: "", postalCode: "", country },
    kyc: { document: { type: "national_id", country, submittedAt: ago(60 * 24 * 60), hasBack: true }, selfieSubmittedAt: ago(60 * 24 * 60), reviewerNote: null },
    skipped: [],
    saved: all,
    otp: null,
  };
}

export type MockBooking = {
  id: ID;
  reference: string;
  customerId: ID;
  providerId: ID;
  categoryId: ID;
  hours: DurationHours;
  startAt: string;
  timezone: string;
  meetingArea: string;
  notes: string;
  status: BookingStatus;
  priceMinor: number;
  currency: string;
  proposal: BookingProposal | null;
  events: BookingEvent[];
  checkIns: { customer: string | null; provider: string | null };
  reviewed: boolean;
  disputeId: ID | null;
  payoutHeld?: boolean;
  refundMinor: number;
  /** What the companion receives from a member cancellation, after Meet's share. */
  compensationMinor: number;
  /** Meet's share of a member cancellation. */
  platformMinor?: number;
  /** Late companion cancellation, taken from their next payout. */
  penaltyMinor?: number;
  /** Snapshot of the money rules at booking time. */
  rules?: BookingRules;
  createdAt: string;
};

export type MockDB = {
  v: number;
  users: Record<ID, MockUser>;
  likes: { from: ID; to: ID; kind: "like" | "pass" }[];
  saves: { from: ID; to: ID }[];
  blocks: { from: ID; to: ID }[];
  connections: { id: ID; a: ID; b: ID; source: "match" | "request" | "enquiry" | "booking"; since: string; endedAt: string | null }[];
  requests: { id: ID; from: ID; to: ID; message: string; at: string; status: "pending" | "accepted" | "declined" }[];
  messages: (Message & { connectionId: ID })[];
  notifications: (AppNotification & { userId: ID })[];
  bookings: MockBooking[];
  payments: { id: ID; reference: string; bookingId: ID; userId: ID; amountMinor: number; currency: string; status: PaymentStatus; method: string; gateway?: PaymentGateway; at: string }[];
  moneyRules: MoneyRules;
  /** Masked payout details per companion. The mock never stores full numbers either. */
  payoutAccounts: Record<ID, PayoutAccount>;
  payoutCodes: Record<ID, { code: string; exp: number }>;
  payouts: { id: ID; userId: ID; amountMinor: number; currency: string; status: Payout["status"]; method: string; at: string }[];
  reviews: (Review & { subjectId: ID; bookingId: ID })[];
  disputes: (Dispute & { userId: ID })[];
  trusted: (TrustedContact & { userId: ID })[];
  reports: { id: ID; from: ID; targetId: ID; category: string; details: string; at: string; bookingId?: ID; status?: "open" | "actioned" | "dismissed"; resolution?: string | null }[];
  rateHistory: (RateChange & { userId: ID })[];
  resetTokens: { token: string; userId: ID; exp: number }[];
  /** Simulated email and SMS. Nothing is actually sent. */
  outbox: { to: string; subject: string; body: string; at: string }[];
  markets: Market[];
  audit: AuditEntry[];
};

const DEFAULT_PRIVACY: PrivacySettings = {
  showAge: true,
  location: "approximate",
  privateDiscovery: false,
  fields: { bio: "public", interests: "public", languages: "public", intentions: "public" },
};

const ago = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();
const ahead = (hours: number) => {
  const d = new Date(Date.now() + hours * 3_600_000);
  d.setUTCMinutes(0, 0, 0);
  return d.toISOString();
};
const dobForAge = (age: number) => {
  const d = new Date(Date.now() - (40 + age * 7) * 86_400_000);
  d.setUTCFullYear(d.getUTCFullYear() - age);
  return d.toISOString().slice(0, 10);
};

function rates(currency: string, majors: (number | null)[], minor = 2): Rate[] {
  return DURATIONS.map((hours, i) => {
    const v = majors[i];
    return { hours, enabled: v !== null, price: v === null ? null : { amountMinor: v * 10 ** minor, currency } };
  });
}

type Seed = {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  country: string;
  city: string;
  bio: string;
  interests: string[];
  hobbies: string[];
  languages: string[];
  intentions: Intention[];
  activeMins: number;
  jitter: [number, number];
  provider?: {
    rank: Rank;
    arrangement: Arrangement;
    categories: string[];
    currency: string;
    prices: (number | null)[];
    negotiable: boolean;
    expensesNote: string;
    headline: string;
    rating: [number, number];
    completed: number;
    response: number;
    score: number;
    cancel: number;
    accept: number;
  };
};

const SEEDS: Seed[] = [
  {
    id: "amara", name: "Amara", age: 26, gender: "woman", country: "NG", city: "Lagos",
    bio: "Event planner who knows every good rooftop on the Island. Happy to be your plus-one or show you the city properly.",
    interests: ["Afrobeats", "Fine dining", "Art galleries", "Fashion"], hobbies: ["Hosting", "Thrifting"],
    languages: ["en", "yo"], intentions: ["companionship", "conversation", "friendship"], activeMins: 4, jitter: [0.01, 0.02],
    provider: {
      rank: "gold", arrangement: "paid", categories: ["dinner", "events", "conversation", "gatherings"], currency: "NGN",
      prices: [15000, 25000, 40000, 70000, null, null], negotiable: false, expensesNote: "Event tickets and transport, agreed before the booking.",
      headline: "Your plus-one for Lagos evenings", rating: [4.8, 37], completed: 41, response: 12, score: 742, cancel: 0.02, accept: 0.91,
    },
  },
  {
    id: "dami", name: "Dami", age: 30, gender: "man", country: "NG", city: "Abuja",
    bio: "Architect, weekend golfer and a decent cook. Good company at a wedding, better company at dinner after.",
    interests: ["Jazz", "Fine dining", "Football", "Startups"], hobbies: ["Golf", "Cooking"],
    languages: ["en", "ig"], intentions: ["dating", "companionship", "networking"], activeMins: 40, jitter: [0.02, -0.01],
    provider: {
      rank: "diamond", arrangement: "paid", categories: ["gatherings", "dinner", "events", "travel"], currency: "NGN",
      prices: [20000, 35000, 60000, 100000, 180000, 320000], negotiable: true, expensesNote: "Flights and hotel for travel bookings, paid directly by you.",
      headline: "Composed company for formal occasions", rating: [4.9, 112], completed: 128, response: 8, score: 961, cancel: 0.01, accept: 0.88,
    },
  },
  {
    id: "zara", name: "Zara", age: 24, gender: "woman", country: "NG", city: "Lagos",
    bio: "Fashion student. I will find the best concert in town and the best suya after it.",
    interests: ["Amapiano", "Live music", "Fashion", "Street food"], hobbies: ["Dance", "Styling"],
    languages: ["en"], intentions: ["friendship", "activity_partner", "dating"], activeMins: 120, jitter: [-0.02, 0.03],
    provider: {
      rank: "silver", arrangement: "flexible", categories: ["concerts", "sightseeing", "casual", "recreation"], currency: "NGN",
      prices: [10000, 18000, 30000, 50000, 100000, 180000], negotiable: true, expensesNote: "Concert tickets.",
      headline: "Concerts, markets and the best of Lagos", rating: [4.6, 14], completed: 16, response: 25, score: 410, cancel: 0.05, accept: 0.8,
    },
  },
  {
    id: "tobi", name: "Tobi", age: 29, gender: "man", country: "NG", city: "Lagos",
    bio: "Runner, hiker, terrible at karaoke. Looking for people who like being outdoors early.",
    interests: ["Running", "Hiking", "Beaches", "Karaoke"], hobbies: ["Trail running", "Photography"],
    languages: ["en", "yo"], intentions: ["activity_partner", "friendship"], activeMins: 300, jitter: [0.03, 0.01],
    provider: {
      rank: "bronze", arrangement: "free", categories: ["outdoors", "recreation"], currency: "NGN",
      prices: [null, null, null, null, null, null], negotiable: false, expensesNote: "",
      headline: "Sunrise runs and weekend hikes", rating: [5, 3], completed: 3, response: 40, score: 120, cancel: 0, accept: 1,
    },
  },
  {
    id: "yara", name: "Yara", age: 24, gender: "woman", country: "NG", city: "Lagos",
    bio: "Product designer. Coffee first, then we can talk about anything.",
    interests: ["Coffee", "Books", "Film", "Tech"], hobbies: ["Sketching", "Reading"],
    languages: ["en", "fr"], intentions: ["dating", "conversation"], activeMins: 15, jitter: [-0.01, -0.02],
  },
  {
    id: "nia", name: "Nia", age: 26, gender: "woman", country: "GH", city: "Accra",
    bio: "Journalist in Accra. Ask me about the best jollof and I will start a debate.",
    interests: ["Books", "Poetry", "Street food", "Travel"], hobbies: ["Writing", "Podcasts"],
    languages: ["en", "tw"], intentions: ["dating", "friendship"], activeMins: 60, jitter: [0.01, 0.01],
  },
  {
    id: "kai", name: "Kai", age: 32, gender: "man", country: "KE", city: "Nairobi",
    bio: "Photographer by day. Nairobi National Park at sunrise is my favourite place on earth.",
    interests: ["Photography", "Film", "Nature", "Coffee"], hobbies: ["Film photography"],
    languages: ["en", "sw"], intentions: ["dating", "friendship", "travel_companion"], activeMins: 200, jitter: [0.02, 0.02],
  },
  {
    id: "mei", name: "Mei", age: 25, gender: "woman", country: "ZA", city: "Johannesburg",
    bio: "Travel writer based in Joburg. I plan good days out and I am always on time.",
    interests: ["Travel", "Art galleries", "Wine", "Markets"], hobbies: ["Travel writing", "Pottery"],
    languages: ["en", "zu"], intentions: ["companionship", "travel_companion", "conversation"], activeMins: 90, jitter: [-0.02, 0.01],
    provider: {
      rank: "platinum", arrangement: "paid", categories: ["travel", "sightseeing", "dinner", "events"], currency: "ZAR",
      prices: [600, 1000, 1800, 3200, 6000, 10500], negotiable: false, expensesNote: "Entry fees and transport during the booking.",
      headline: "City days and weekend trips around Gauteng", rating: [4.9, 58], completed: 64, response: 10, score: 865, cancel: 0.02, accept: 0.86,
    },
  },
  {
    id: "sofia", name: "Sofia", age: 27, gender: "woman", country: "MA", city: "Casablanca",
    bio: "Architect between Casablanca and Rabat. Big on long walks and long conversations.",
    interests: ["Art galleries", "Languages", "Coffee", "Theatre"], hobbies: ["Painting"],
    languages: ["fr", "ar", "en"], intentions: ["conversation", "networking", "friendship"], activeMins: 500, jitter: [0.01, -0.01],
  },
  {
    id: "marcus", name: "Marcus", age: 27, gender: "man", country: "RW", city: "Kigali",
    bio: "Tour guide in Kigali. I know the hills, the coffee and the quiet places.",
    interests: ["Hiking", "Coffee", "Travel", "Volunteering"], hobbies: ["Guiding", "Cycling"],
    languages: ["en", "rw", "fr"], intentions: ["travel_companion", "friendship", "activity_partner"], activeMins: 30, jitter: [0.01, 0.02],
    provider: {
      rank: "silver", arrangement: "flexible", categories: ["sightseeing", "travel", "outdoors"], currency: "RWF",
      prices: [15000, 25000, 45000, 80000, 140000, null], negotiable: true, expensesNote: "Park entry and transport.",
      headline: "Kigali by foot, bike and coffee stop", rating: [4.7, 21], completed: 23, response: 18, score: 455, cancel: 0.04, accept: 0.84,
    },
  },
];

function mkUser(s: Seed): MockUser {
  const base = CITY_GEO[s.city];
  const country = COUNTRIES.find((c) => c.code === s.country)!;
  const p = s.provider;
  return {
    account: {
      id: s.id,
      email: `${s.id}@meet.dev`,
      phone: `${country.dial}800000${s.age}`,
      fullName: `${s.name} Demo`,
      username: s.id,
      dateOfBirth: dobForAge(s.age),
      gender: s.gender,
      country: s.country,
      city: s.city,
      role: p ? "companion" : "member",
      otpChannel: "email",
      contactVerified: true,
      verification: "verified",
      roles: [],
      isProvider: !!p,
      onboarded: true,
      createdAt: ago(60 * 24 * 90),
    },
    private: seededPrivate(s.city, s.country, p ? "companion" : "member"),
    password: DEMO_PASSWORD,
    profile: {
      displayName: s.name,
      bio: s.bio,
      interests: s.interests,
      hobbies: s.hobbies,
      languages: s.languages,
      intentions: s.intentions,
      photos: [`/people/${s.id}.webp`],
      privacy: DEFAULT_PRIVACY,
    },
    geo: base ? [base[0] + s.jitter[0], base[1] + s.jitter[1]] : null,
    lastActive: ago(s.activeMins),
    provider: p
      ? {
          status: "active",
          headline: p.headline,
          arrangement: p.arrangement,
          categories: p.categories.map((x) => `cat_${x}`),
          currency: p.currency,
          rates: rates(p.currency, p.prices, country.minor),
          negotiable: p.negotiable,
          expensesNote: p.expensesNote,
          availability: [
            { weekday: 5, start: "17:00", end: "23:00" },
            { weekday: 6, start: "10:00", end: "23:00" },
            { weekday: 0, start: "10:00", end: "20:00" },
          ],
          timezone: country.timezone,
          priceLimits: null,
          rank: p.rank,
          ratingSum: Math.round(p.rating[0] * p.rating[1] * 10) / 10,
          ratingCount: p.rating[1],
          completed: p.completed,
          responseMinutes: p.response,
          score: p.score,
          cancellationRate: p.cancel,
          acceptanceRate: p.accept,
          events: [
            { at: ago(60 * 24 * 2), delta: 12, reason: "Booking completed with a 5 star review" },
            { at: ago(60 * 24 * 9), delta: 8, reason: "Booking completed" },
          ],
        }
      : null,
  };
}

export function buildSeed(): MockDB {
  const users: Record<ID, MockUser> = {};
  for (const s of SEEDS) users[s.id] = mkUser(s);

  // The demo member you sign in as.
  users.ada = {
    account: {
      id: "ada",
      email: "ada@meet.dev",
      phone: "+2348000000026",
      fullName: "Ada Demo",
      username: "ada",
      dateOfBirth: dobForAge(27),
      gender: "woman",
      country: "NG",
      city: "Lagos",
      role: "member",
      otpChannel: "email",
      contactVerified: true,
      verification: "verified",
      roles: [],
      isProvider: false,
      onboarded: true,
      createdAt: ago(60 * 24 * 30),
    },
    private: seededPrivate("Lagos", "NG", "member"),
    password: DEMO_PASSWORD,
    profile: {
      displayName: "Ada",
      bio: "Lawyer, new-ish to Lagos. Looking for good company and people to explore the city with.",
      interests: ["Afrobeats", "Fine dining", "Books", "Travel"],
      hobbies: ["Reading", "Swimming"],
      languages: ["en", "ig"],
      intentions: ["friendship", "dating", "companionship"],
      photos: ["/people/ivy.webp"],
      privacy: DEFAULT_PRIVACY,
    },
    geo: [6.5, 3.4],
    lastActive: ago(0),
    provider: null,
  };

  // Staff account for the admin console.
  users.admin = {
    account: {
      id: "admin",
      email: "admin@meet.dev",
      phone: "+2348000000001",
      fullName: "Meet Admin",
      username: "meet.admin",
      dateOfBirth: "1990-01-01",
      gender: "other",
      country: "NG",
      city: "Lagos",
      role: "member",
      otpChannel: "email",
      contactVerified: true,
      verification: "verified",
      roles: ["super_admin"],
      isProvider: false,
      onboarded: true,
      createdAt: ago(60 * 24 * 120),
    },
    private: seededPrivate("Lagos", "NG", "member"),
    password: DEMO_PASSWORD,
    profile: { displayName: "Admin", bio: "", interests: [], hobbies: [], languages: ["en"], intentions: [], photos: [], privacy: DEFAULT_PRIVACY },
    geo: null,
    lastActive: ago(0),
    provider: null,
  };

  // Two people waiting in the verification queue.
  for (const [id, name, country, city, role, mins] of [
    ["u_pending1", "Kemi Balogun", "NG", "Lagos", "companion", 90],
    ["u_pending2", "Yaw Mensah", "GH", "Accra", "member", 260],
  ] as const) {
    users[id] = {
      account: {
        id,
        email: `${id}@example.com`,
        phone: "+2348000009" + mins,
        fullName: name,
        username: name.split(" ")[0].toLowerCase() + ".new",
        dateOfBirth: dobForAge(role === "companion" ? 28 : 31),
        gender: role === "companion" ? "woman" : "man",
        country,
        city,
        role,
        otpChannel: "sms",
        contactVerified: true,
        verification: "pending",
        roles: [],
        isProvider: role === "companion",
        onboarded: true,
        createdAt: ago(mins + 60),
      },
      password: DEMO_PASSWORD,
      profile: { displayName: name.split(" ")[0], bio: "New to Meet and looking forward to good company.", interests: [], hobbies: [], languages: ["en"], intentions: ["friendship"], photos: [], privacy: DEFAULT_PRIVACY },
      geo: null,
      lastActive: ago(mins),
      provider: null,
      private: { ...seededPrivate(city, country, role), kyc: { document: { type: role === "companion" ? "passport" : "national_id", country, submittedAt: ago(mins), hasBack: role !== "companion" }, selfieSubmittedAt: ago(mins - 4), reviewerNote: null } },
    };
  }

  const ngn = (major: number) => major * 100;

  const db: MockDB = {
    v: MOCK_VERSION,
    users,
    likes: [
      { from: "yara", to: "ada", kind: "like" },
      { from: "kai", to: "ada", kind: "like" },
      { from: "ada", to: "dami", kind: "like" },
      { from: "dami", to: "ada", kind: "like" },
    ],
    saves: [{ from: "ada", to: "mei" }],
    blocks: [],
    connections: [
      { id: "con_1", a: "ada", b: "dami", source: "match", since: ago(60 * 24 * 6), endedAt: null },
      { id: "con_2", a: "ada", b: "zara", source: "request", since: ago(60 * 24 * 20), endedAt: null },
      { id: "con_3", a: "ada", b: "amara", source: "booking", since: ago(60 * 23), endedAt: null },
    ],
    requests: [
      { id: "req_1", from: "marcus", to: "ada", message: "Saw you like travel. If you ever visit Kigali, I know the best coffee spots.", at: ago(180), status: "pending" },
      { id: "req_2", from: "ada", to: "nia", message: "Hi Nia, fellow bookworm here.", at: ago(60 * 26), status: "pending" },
    ],
    messages: [
      { id: "m1", connectionId: "con_1", senderId: "dami", body: "Hey Ada, good to match. How are you finding Lagos so far?", at: ago(60 * 24 * 6), deliveredAt: ago(60 * 24 * 6), readAt: ago(60 * 24 * 6), kind: "text" },
      { id: "m2", connectionId: "con_1", senderId: "ada", body: "Busy, loud and I love it. Still learning where to eat though.", at: ago(60 * 24 * 6 - 20), deliveredAt: ago(60 * 24 * 6 - 20), readAt: ago(60 * 24 * 5), kind: "text" },
      { id: "m3", connectionId: "con_1", senderId: "dami", body: "Then you have come to the right person. Have you tried any of the places in Ikoyi?", at: ago(95), deliveredAt: ago(95), readAt: null, kind: "text" },
      { id: "m4", connectionId: "con_2", senderId: "zara", body: "Thank you for Saturday, that concert was so good!", at: ago(60 * 24 * 12), deliveredAt: ago(60 * 24 * 12), readAt: ago(60 * 24 * 12), kind: "text" },
      { id: "m5", connectionId: "con_3", senderId: "ada", body: "Ada requested a booking: Dinner and restaurants, 2 hours.", at: ago(60 * 22), deliveredAt: ago(60 * 22), readAt: ago(60 * 22), kind: "system", bookingId: "bk_2" },
      { id: "m6", connectionId: "con_3", senderId: "amara", body: "Hi Ada! Happy birthday in advance. Do you have a restaurant in mind?", at: ago(60 * 21 + 30), deliveredAt: ago(60 * 21 + 30), readAt: ago(60 * 21 + 20), kind: "text" },
      { id: "m7", connectionId: "con_3", senderId: "ada", body: "Thank you! Thinking Terra Kulture on Victoria Island, around 7pm?", at: ago(60 * 21 + 18), deliveredAt: ago(60 * 21 + 18), readAt: ago(60 * 21 + 10), kind: "text" },
      { id: "m8", connectionId: "con_3", senderId: "amara", body: "Perfect, I love it there. I will accept now and see you on the day.", at: ago(60 * 21 + 5), deliveredAt: ago(60 * 21 + 5), readAt: ago(60 * 21), kind: "text" },
      { id: "m9", connectionId: "con_3", senderId: "amara", body: "Amara accepted the booking. Payment is next.", at: ago(60 * 21), deliveredAt: ago(60 * 21), readAt: ago(60 * 21), kind: "system", bookingId: "bk_2" },
      { id: "m10", connectionId: "con_3", senderId: "ada", body: "Payment received. The booking is confirmed.", at: ago(60 * 20), deliveredAt: ago(60 * 20), readAt: ago(60 * 20), kind: "system", bookingId: "bk_2" },
    ],
    notifications: [
      { id: "n1", userId: "ada", kind: "connection", title: "New connection request", body: "Marcus wants to connect with you.", href: "/connections?tab=requests", at: ago(180), read: false },
      { id: "n2", userId: "ada", kind: "message", title: "New message from Dami", body: "Then you have come to the right person...", href: "/chats/con_1", at: ago(95), read: false },
      { id: "n3", userId: "ada", kind: "booking", title: "Booking confirmed", body: "Your dinner with Amara is confirmed.", href: "/bookings/bk_2", at: ago(60 * 20), read: true },
      { id: "n4", userId: "ada", kind: "verification", title: "You are verified", body: "Your identity and age check passed.", href: null, at: ago(60 * 24 * 29), read: true },
      { id: "n5", userId: "amara", kind: "booking", title: "New booking request", body: "Ada requested 2 hours of Events and entertainment.", href: "/companion/bookings", at: ago(50), read: false },
    ],
    bookings: [
      {
        id: "bk_1", reference: "MT-7Q4K2D", customerId: "ada", providerId: "zara", categoryId: "cat_concerts", hours: 4,
        startAt: ahead(-24 * 13), timezone: "Africa/Lagos", meetingArea: "Eko Convention Centre, main entrance", notes: "Burna Boy concert, I have two tickets.",
        status: "completed", priceMinor: ngn(30000), currency: "NGN", proposal: null,
        events: [
          { at: ago(60 * 24 * 18), label: "Booking requested", actor: "customer" },
          { at: ago(60 * 24 * 18 - 40), label: "Accepted by provider", actor: "provider" },
          { at: ago(60 * 24 * 18 - 55), label: "Payment verified, booking confirmed", actor: "system" },
          { at: ago(60 * 24 * 13 - 240), label: "Marked completed by provider", actor: "provider" },
          { at: ago(60 * 24 * 13 - 300), label: "Completion confirmed by customer", actor: "customer" },
        ],
        checkIns: { customer: ago(60 * 24 * 13), provider: ago(60 * 24 * 13) }, reviewed: true, disputeId: null, refundMinor: 0, compensationMinor: 0, createdAt: ago(60 * 24 * 18),
      },
      {
        id: "bk_2", reference: "MT-3HX9PL", customerId: "ada", providerId: "amara", categoryId: "cat_dinner", hours: 2,
        startAt: ahead(72), timezone: "Africa/Lagos", meetingArea: "Victoria Island, restaurant to be agreed in chat", notes: "Birthday dinner with friends, would love a fun plus-one.",
        status: "confirmed", priceMinor: ngn(25000), currency: "NGN", proposal: null,
        events: [
          { at: ago(60 * 22), label: "Booking requested", actor: "customer" },
          { at: ago(60 * 21), label: "Accepted by provider", actor: "provider" },
          { at: ago(60 * 20), label: "Payment verified, booking confirmed", actor: "system" },
        ],
        checkIns: { customer: null, provider: null }, reviewed: false, disputeId: null, refundMinor: 0, compensationMinor: 0, createdAt: ago(60 * 22),
      },
      {
        id: "bk_3", reference: "MT-8NW2RC", customerId: "ada", providerId: "amara", categoryId: "cat_events", hours: 2,
        startAt: ahead(24 * 9), timezone: "Africa/Lagos", meetingArea: "Lekki, venue to be confirmed", notes: "Art exhibition opening.",
        status: "requested", priceMinor: ngn(25000), currency: "NGN", proposal: null,
        events: [{ at: ago(50), label: "Booking requested", actor: "customer" }],
        checkIns: { customer: null, provider: null }, reviewed: false, disputeId: null, refundMinor: 0, compensationMinor: 0, createdAt: ago(50),
      },
      {
        id: "bk_4", reference: "MT-9KD2QX", customerId: "yara", providerId: "zara", categoryId: "cat_sightseeing", hours: 4,
        startAt: ahead(-24), timezone: "Africa/Lagos", meetingArea: "Lekki Arts and Crafts Market", notes: "Food and craft market walk.",
        status: "disputed", priceMinor: ngn(30000), currency: "NGN", proposal: null,
        events: [
          { at: ago(60 * 24 * 4), label: "Booking requested", actor: "customer" },
          { at: ago(60 * 24 * 4 - 30), label: "Accepted by provider", actor: "provider" },
          { at: ago(60 * 24 * 3), label: "Payment verified (simulated), booking confirmed", actor: "system" },
          { at: ago(60 * 24), label: "Customer checked in", actor: "customer" },
          { at: ago(60 * 22), label: "Marked completed by provider", actor: "provider" },
          { at: ago(60 * 20), label: "Dispute opened by customer. Payout on hold until reviewed", actor: "customer" },
        ],
        checkIns: { customer: ago(60 * 24), provider: ago(60 * 24) }, reviewed: false, disputeId: "dsp_1", payoutHeld: true, refundMinor: 0, compensationMinor: 0, createdAt: ago(60 * 24 * 4),
      },
      {
        id: "bk_5", reference: "MT-2RT7VB", customerId: "nia", providerId: "mei", categoryId: "cat_travel", hours: 8,
        startAt: ahead(-24 * 2), timezone: "Africa/Johannesburg", meetingArea: "Maboneng Precinct", notes: "Day trip to the Cradle of Humankind.",
        status: "customer_cancelled", priceMinor: 3200 * 100, currency: "ZAR", proposal: null,
        events: [
          { at: ago(60 * 24 * 7), label: "Booking requested", actor: "customer" },
          { at: ago(60 * 24 * 7 - 60), label: "Accepted by provider", actor: "provider" },
          { at: ago(60 * 24 * 6), label: "Payment verified (simulated), booking confirmed", actor: "system" },
          { at: ago(60 * 24 * 3), label: "Cancelled by customer with 18 h notice. Refund 75%, provider compensation 25%", actor: "customer" },
        ],
        checkIns: { customer: null, provider: null }, reviewed: false, disputeId: null, refundMinor: 2400 * 100, compensationMinor: 720 * 100, platformMinor: 80 * 100, createdAt: ago(60 * 24 * 7),
      },
    ],
    payments: [
      { id: "pay_3", reference: "PAY-7Q2M90", bookingId: "bk_4", userId: "yara", amountMinor: ngn(30000), currency: "NGN", status: "succeeded", method: "Mobile money (simulated)", at: ago(60 * 24 * 3) },
      { id: "pay_4", reference: "PAY-3LX4K8", bookingId: "bk_5", userId: "nia", amountMinor: 3200 * 100, currency: "ZAR", status: "succeeded", method: "Card (simulated)", at: ago(60 * 24 * 6) },
      { id: "pay_1", reference: "PAY-21AF90", bookingId: "bk_1", userId: "ada", amountMinor: ngn(30000), currency: "NGN", status: "succeeded", method: "Card ending 4242 (simulated)", at: ago(60 * 24 * 18 - 55) },
      { id: "pay_2", reference: "PAY-5C7E11", bookingId: "bk_2", userId: "ada", amountMinor: ngn(25000), currency: "NGN", status: "succeeded", method: "Bank transfer (simulated)", at: ago(60 * 20) },
    ],
    reviews: [
      { id: "rv_1", bookingRef: "MT-7Q4K2D", bookingId: "bk_1", subjectId: "zara", author: { id: "ada", displayName: "Ada", photo: "/people/ivy.webp", verified: true }, rating: 5, body: "Zara was on time, fun and knew everyone at the venue. Felt completely comfortable all evening.", tags: ["Punctual", "Great company"], at: ago(60 * 24 * 12), response: "Thank you Ada, it was a great night!" },
      { id: "rv_2", bookingRef: "MT-1AB2C3", bookingId: "bk_x1", subjectId: "amara", author: { id: "yara", displayName: "Yara", photo: "/people/yara.webp", verified: true }, rating: 5, body: "Amara made a work dinner so much easier. Warm, professional and great conversation.", tags: ["Great conversation", "Professional"], at: ago(60 * 24 * 20), response: null },
      { id: "rv_3", bookingRef: "MT-4DE5F6", bookingId: "bk_x2", subjectId: "amara", author: { id: "nia", displayName: "Nia", photo: "/people/nia.webp", verified: true }, rating: 4, body: "Lovely evening at the gallery. Clear about plans and timing.", tags: ["Clear communication"], at: ago(60 * 24 * 41), response: null },
      { id: "rv_4", bookingRef: "MT-7GH8J9", bookingId: "bk_x3", subjectId: "dami", author: { id: "sofia", displayName: "Sofia", photo: "/people/sofia.webp", verified: true }, rating: 5, body: "Perfect company for a wedding where I knew no one. Respectful and easy to talk to.", tags: ["Respectful", "Punctual"], at: ago(60 * 24 * 15), response: null },
    ],
    disputes: [
      { id: "dsp_1", userId: "yara", bookingId: "bk_4", bookingRef: "MT-9KD2QX", kind: "incomplete_experience", status: "open", description: "We agreed on 4 hours at the food market but the companion left after about 90 minutes saying something came up.", openedBy: "customer", at: ago(60 * 20), resolution: null },
    ],
    trusted: [],
    reports: [
      { id: "rep_1", from: "nia", targetId: "u_pending2", category: "fake_profile", details: "Same photos as another account I saw last week.", at: ago(140), status: "open", resolution: null },
      { id: "rep_2", from: "yara", targetId: "tobi", category: "harassment", details: "Kept messaging after I said I was not interested.", at: ago(60 * 7), status: "open", resolution: null },
      { id: "rep_3", from: "sofia", targetId: "kai", category: "scam", details: "Asked me to pay a deposit by bank transfer outside the app.", at: ago(60 * 30), status: "open", resolution: null },
      { id: "rep_4", from: "ada", targetId: "marcus", category: "other", details: "Profile says Kigali but chatted about being in Lagos.", at: ago(60 * 24 * 5), status: "dismissed", resolution: "Travelling. Location is approximate by design." },
    ],
    rateHistory: [],
    resetTokens: [],
    outbox: [],
    moneyRules: structuredClone(DEFAULT_RULES),
    payoutAccounts: {
      amara: { kind: "bank", institution: "GTBank", last4: "4821", accountName: "AMARA DEMO", gateway: "paystack", check: "verified", activeFrom: ago(60 * 24 * 40), addedAt: ago(60 * 24 * 40) },
    },
    payoutCodes: {},
    payouts: [],
    markets: structuredClone(MARKETS),
    audit: [
      { id: "au_1", at: ago(60 * 24 * 3), actor: "Meet Admin", role: "super_admin", action: "Market activated", target: "Kenya", reason: "Payments partner live" },
      { id: "au_2", at: ago(60 * 24 * 9), actor: "Meet Admin", role: "super_admin", action: "Verification approved", target: "@zara", reason: "Documents match" },
    ],
  };
  return db;
}
