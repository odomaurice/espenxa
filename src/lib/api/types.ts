/*
 * Meet API contract, as the frontend consumes it.
 *
 * The backend owns every rule behind these shapes: prices, fees, refunds,
 * compensation, ranking, payout eligibility, verification and market
 * activation. The frontend only displays what it is given.
 *
 * Money is always an integer amount in minor units plus an ISO 4217 code.
 * Timestamps are ISO 8601 strings in UTC; `timezone` fields are IANA names.
 */

/* ---- shared ----------------------------------------------------------- */

export type Money = { amountMinor: number; currency: string };
export type ISODate = string;
export type ID = string;

export type Page<T> = { items: T[]; nextCursor: string | null };

export type ApiErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "validation"
  | "conflict"
  | "market_unavailable"
  | "rate_limited"
  | "server";

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

/* ---- people ----------------------------------------------------------- */

export type Gender = "woman" | "man" | "non_binary" | "other";

export type VerificationStatus =
  | "unverified"
  | "pending"
  | "verified"
  | "rejected"
  | "needs_info"
  | "suspended";

export type StaffRole =
  | "super_admin"
  | "admin"
  | "moderator"
  | "support"
  | "finance"
  | "verification_officer";

/** Why someone is on Meet. Not every reason is romantic. */
export type Intention =
  | "dating"
  | "friendship"
  | "companionship"
  | "conversation"
  | "activity_partner"
  | "travel_companion"
  | "networking";

export type Visibility = "public" | "connections" | "hidden";

/** How location is shown to others. Never a precise point. */
export type LocationVisibility = "approximate" | "city_only" | "hidden";

export type PrivacySettings = {
  showAge: boolean;
  location: LocationVisibility;
  /** Hidden from discovery; only people you like or connect with see you. */
  privateDiscovery: boolean;
  fields: { bio: Visibility; interests: Visibility; languages: Visibility; intentions: Visibility };
};

/**
 * How someone uses Meet. Members discover, connect and book. Companions are
 * members who also offer experiences (the spec's "providers").
 */
export type AccountRole = "member" | "companion";

export type OtpChannel = "email" | "sms";

/** The signed-in account. Private fields never appear on other people. */
export type Account = {
  id: ID;
  email: string;
  phone: string;
  fullName: string;
  /** Public handle, unique, lowercase. */
  username: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: Gender;
  country: string; // ISO 3166-1 alpha-2
  city: string;
  role: AccountRole;
  otpChannel: OtpChannel;
  /** The email or phone chosen for the one-time code has been confirmed. */
  contactVerified: boolean;
  verification: VerificationStatus;
  roles: StaffRole[];
  isProvider: boolean;
  /** Every onboarding step is complete (steps can be skipped, but must be finished to use Meet). */
  onboarded: boolean;
  createdAt: ISODate;
};

/* ---- onboarding ------------------------------------------------------- */

export type OnboardingStepId =
  | "photos"
  | "about"
  | "looking_for"
  | "preferences"
  | "experiences"
  | "rates"
  | "availability"
  | "location"
  | "id_document"
  | "selfie";

export type OnboardingStep = { id: OnboardingStepId; done: boolean; skipped: boolean };

export type OnboardingStatus = {
  role: AccountRole;
  steps: OnboardingStep[];
  complete: boolean;
  verification: VerificationStatus;
  /** Complete and approved: the whole platform is open. */
  canUsePlatform: boolean;
};

export type Build = "slim" | "athletic" | "average" | "curvy" | "full_figured" | "muscular";

/** Who someone would like to meet. Kept tasteful and non-explicit. */
export type Preferences = {
  genders: Gender[];
  ageMin: number;
  ageMax: number;
  heightMinCm: number | null;
  heightMaxCm: number | null;
  builds: Build[];
  notes: string;
};

/** Private address. Used for safety and verification only, never shown to anyone. */
export type PrivateLocation = {
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

export type IdDocumentType = "national_id" | "passport" | "drivers_licence" | "voters_card" | "residence_permit";

export type KycState = {
  document: { type: IdDocumentType; country: string; submittedAt: ISODate; hasBack: boolean } | null;
  selfieSubmittedAt: ISODate | null;
  /** Shown to the person when staff need something else. */
  reviewerNote: string | null;
};

export type OnboardingData = {
  about: { displayName: string; bio: string; gender: Gender; heightCm: number | null; build: Build | null; languages: string[]; interests: string[] };
  lookingFor: { intentions: Intention[]; note: string };
  preferences: Preferences;
  location: PrivateLocation | null;
  kyc: KycState;
};

export type Rank = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export type Rating = { average: number; count: number };

/** What other members see. */
export type Profile = {
  id: ID;
  displayName: string;
  age: number | null;
  gender: Gender;
  country: string;
  city: string;
  /** Rounded by the backend. Null when the person hides location. */
  distanceKm: number | null;
  photos: string[];
  bio: string;
  interests: string[];
  hobbies: string[];
  languages: string[];
  intentions: Intention[];
  verified: boolean;
  activeRecently: boolean;
  provider: ProviderPublic | null;
  /** Relationship to the viewer. */
  viewer: {
    liked: boolean;
    saved: boolean;
    connectionId: ID | null;
    requestPending: "sent" | "received" | null;
  };
};

export type ProfileDraft = Pick<
  Profile,
  "displayName" | "bio" | "interests" | "hobbies" | "languages" | "intentions"
> & { photos: string[]; privacy: PrivacySettings };

/* ---- experiences and providers ---------------------------------------- */

export type Category = {
  id: ID;
  slug: string;
  name: string;
  description: string;
  active: boolean;
};

/** The six booking durations Meet always offers. */
export const DURATIONS = [1, 2, 4, 8, 24, 48] as const;
export type DurationHours = (typeof DURATIONS)[number];

export type Arrangement = "free" | "paid" | "flexible";

export type Rate = { hours: DurationHours; enabled: boolean; price: Money | null };

export type ProviderPublic = {
  rank: Rank;
  rating: Rating;
  arrangement: Arrangement;
  categories: ID[];
  rates: Rate[];
  negotiable: boolean;
  /** Non-sexual extras the customer may cover, e.g. tickets or transport. */
  expensesNote: string;
  completedBookings: number;
  responseMinutes: number | null;
  availabilitySummary: string;
};

export type AvailabilityWindow = { weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6; start: string; end: string };

export type ProviderSettings = {
  status: "draft" | "pending_review" | "active" | "paused" | "restricted";
  headline: string;
  arrangement: Arrangement;
  categories: ID[];
  currency: string;
  rates: Rate[];
  negotiable: boolean;
  expensesNote: string;
  availability: AvailabilityWindow[];
  timezone: string;
  /** From the market policy; the backend rejects prices outside it. */
  priceLimits: { min: Money; max: Money } | null;
};

export type RateChange = { at: ISODate; hours: DurationHours; from: Money | null; to: Money | null };

export type ScoreEvent = { at: ISODate; delta: number; reason: string; bookingRef?: string };

export type ProviderPerformance = {
  rank: Rank;
  nextRank: Rank | null;
  score: number;
  progressToNext: number; // 0..1
  completedBookings: number;
  cancellationRate: number; // 0..1
  acceptanceRate: number; // 0..1
  rating: Rating;
  responseMinutes: number | null;
  events: ScoreEvent[];
};

export type RankThreshold = {
  rank: Rank;
  minScore: number;
  minCompleted: number;
  minRating: number;
  maxCancellationRate: number;
};

/* ---- discovery -------------------------------------------------------- */

export type DiscoveryFilters = {
  genders?: Gender[];
  ageMin?: number;
  ageMax?: number;
  country?: string;
  city?: string;
  maxKm?: number;
  interests?: string[];
  intentions?: Intention[];
  categories?: ID[];
  arrangement?: Arrangement;
  durations?: DurationHours[];
  /** Max price for the chosen duration (or any enabled duration). */
  budget?: Money;
  languages?: string[];
  verifiedOnly?: boolean;
  providersOnly?: boolean;
  minRank?: Rank;
  query?: string;
};

export type DiscoveryMode = "for_you" | "browse" | "nearby";

/* ---- connections and messaging ---------------------------------------- */

export type PersonRef = { id: ID; displayName: string; photo: string; verified: boolean };

/**
 * A conversation. "match" and "request" are social connections; "enquiry"
 * is a chat opened with a companion to plan before booking; "booking" is
 * opened automatically by a booking request.
 */
export type Connection = {
  id: ID;
  person: PersonRef;
  source: "match" | "request" | "enquiry" | "booking";
  since: ISODate;
  lastMessage: { body: string; at: ISODate; fromMe: boolean; status: MessageStatus; kind: Message["kind"] } | null;
  unread: number;
  /** The other person offers experiences, so a booking can be planned here. */
  companion: boolean;
  /** Most recent open booking between the two, if any. */
  booking: { id: ID; reference: string; status: BookingStatus; role: "customer" | "provider" } | null;
  presence: Presence;
};

export type Presence = { online: boolean; lastSeen: ISODate | null };

export type MessageStatus = "sending" | "sent" | "delivered" | "read";

export type ConnectionRequest = {
  id: ID;
  person: PersonRef;
  direction: "incoming" | "outgoing";
  message: string;
  at: ISODate;
};

/**
 * A chat message. `kind: "system"` is a note from Meet in the thread, e.g.
 * a booking request; `bookingId` links it. Delivery and read times drive the
 * ticks (one grey: sent, two grey: delivered, two blue: read).
 */
export type Message = {
  id: ID;
  senderId: ID;
  body: string;
  at: ISODate;
  deliveredAt: ISODate | null;
  readAt: ISODate | null;
  kind: "text" | "system";
  bookingId?: ID;
  /** Client-generated id, so an optimistic message can be matched to its server copy. */
  clientId?: string;
};

export type LikeResult = { matched: boolean; connectionId: ID | null };

/* ---- bookings --------------------------------------------------------- */

export type BookingStatus =
  | "requested"
  | "adjustment_proposed"
  | "accepted" // terms agreed, awaiting payment
  | "confirmed" // payment verified by the backend
  | "in_progress"
  | "provider_completed"
  | "completed"
  | "customer_cancelled"
  | "provider_cancelled"
  | "platform_cancelled"
  | "declined"
  | "expired"
  | "disputed";

export type CancellationTier = {
  /** Applies when notice is >= minHours and < maxHours (null = no upper bound). */
  minHours: number;
  maxHours: number | null;
  refundPct: number;
  compensationPct: number;
};

export type CancellationPolicy = { id: ID; name: string; tiers: CancellationTier[] };

export type PaymentGateway = "paystack" | "flutterwave";

/**
 * How money is split, set by staff in the admin console. Every booking keeps
 * a copy of the rules it was made under, so a change only affects new bookings.
 */
export type MoneyRules = {
  /** Meet's share of whatever the companion earns, in percent (completed bookings and cancellation compensation). */
  commissionPct: number;
  /** How a paid booking is split when the member cancels, by notice. Percentages of the price. */
  tiers: CancellationTier[];
  /**
   * When the companion cancels a paid booking with less than `withinHours` notice,
   * `pct` of the price is taken from their next payout. The member is always refunded in full.
   */
  latePenalty: { withinHours: number; pct: number };
  /** New or changed payout details wait this long before money can be sent to them. */
  payoutHoldHours: number;
  updatedAt: ISODate;
  updatedBy: string | null;
};

/** The part of the money rules a booking keeps. */
export type BookingRules = Pick<MoneyRules, "commissionPct" | "tiers" | "latePenalty">;

export type PriceBreakdown = {
  price: Money;
  commission: Money | null;
  processing: Money | null;
  tax: Money | null;
  total: Money;
};

export type BookingProposal = {
  by: "customer" | "provider";
  startAt?: ISODate;
  hours?: DurationHours;
  meetingArea?: string;
  price?: Money;
  note: string;
  at: ISODate;
};

export type BookingEvent = { at: ISODate; label: string; actor: "customer" | "provider" | "system" | "staff" };

export type Booking = {
  id: ID;
  reference: string;
  role: "customer" | "provider";
  customer: PersonRef;
  provider: PersonRef;
  categoryId: ID;
  hours: DurationHours;
  startAt: ISODate;
  timezone: string;
  /** A public meeting area, never a home address. */
  meetingArea: string;
  notes: string;
  status: BookingStatus;
  breakdown: PriceBreakdown;
  policy: CancellationPolicy;
  /** The money rules this booking was made under. */
  rules: BookingRules;
  /** What the companion receives for a completed booking, after Meet's share. */
  companionShare: Money;
  /** How the member paid. Refunds always go back to this. */
  payment: { method: string; gateway: PaymentGateway } | null;
  /** Filled in once the booking is cancelled or settled. */
  settlement: { refund: Money; companion: Money; platform: Money; penalty: Money | null } | null;
  proposal: BookingProposal | null;
  events: BookingEvent[];
  checkIns: { customer: ISODate | null; provider: ISODate | null };
  canReview: boolean;
  disputeId: ID | null;
};

export type BookingRequestInput = {
  providerId: ID;
  categoryId: ID;
  hours: DurationHours;
  startAt: ISODate;
  meetingArea: string;
  notes: string;
};

/** Calculated by the backend; the UI shows it before anyone confirms. */
export type CancellationQuote = {
  /** Who would be cancelling: the quote differs. */
  by: "member" | "companion";
  noticeHours: number;
  tier: CancellationTier;
  /** Back to the member, to the method they paid with. */
  refund: Money;
  /** To the companion, after Meet's share. */
  compensation: Money;
  /** Meet's share of the compensation. */
  platform: Money;
  /** Companion cancelling late: taken from their next payout. */
  penalty: Money | null;
  /** Where the refund goes, e.g. "Card ending 4242". */
  refundTo: string | null;
  feesNote: string;
};

export type ProviderCancelReason =
  | "emergency"
  | "illness"
  | "unforeseen"
  | "scheduling_conflict"
  | "safety_concern"
  | "other";

/* ---- payments and earnings -------------------------------------------- */

export type PaymentStatus = "initiated" | "pending" | "succeeded" | "failed" | "refunded" | "partially_refunded";

export type Payment = {
  id: ID;
  reference: string;
  bookingRef: string;
  amount: Money;
  status: PaymentStatus;
  method: string;
  at: ISODate;
};

export type Checkout = {
  bookingId: ID;
  breakdown: PriceBreakdown;
  /** Which partner processes the payment in this country. */
  gateway: PaymentGateway;
  methods: { id: string; label: string; kind: "card" | "bank_transfer" | "mobile_money" }[];
  /** False when payments are not enabled in this market. */
  available: boolean;
  unavailableReason?: string;
  /** True when no real gateway is connected. The UI must say so. */
  simulated: boolean;
};

export type Earnings = {
  currency: string;
  total: Money;
  pending: Money;
  available: Money;
  paidOut: Money;
  compensation: Money;
  refunds: Money;
  deductions: Money;
  entries: { at: ISODate; label: string; bookingRef?: string; amount: Money; state: "pending" | "available" | "paid" | "reversed" }[];
};

export type Payout = { id: ID; amount: Money; status: "pending" | "processing" | "paid" | "failed"; method: string; at: ISODate };

export type PayoutKind = "bank" | "mobile_money";

/** A bank or mobile money network that payouts can go to. */
export type PayoutInstitution = { code: string; name: string; kind: PayoutKind };

export type PayoutOptions = {
  country: string;
  currency: string;
  /** Which partner sends the money in this country. */
  gateway: PaymentGateway;
  institutions: PayoutInstitution[];
  holdHours: number;
  /** False until payouts are switched on for the market. */
  enabled: boolean;
};

/** Where a companion is paid. Only the last 4 digits ever reach the browser. */
export type PayoutAccount = {
  kind: PayoutKind;
  institution: string;
  last4: string;
  accountName: string;
  gateway: PaymentGateway;
  /**
   * "verified": the bank confirmed the name and it matches the verified ID.
   * "pending_review": entered by hand; Meet checks it before money is sent.
   * "rejected": Meet could not confirm it; the companion must add other details.
   */
  check: "verified" | "pending_review" | "rejected";
  /** Money can be sent from this time; new or changed details wait first. */
  activeFrom: ISODate;
  addedAt: ISODate;
};

export type PayoutAccountInput = {
  kind: PayoutKind;
  /** From the list. Null when the bank or network was typed in by hand. */
  code: string | null;
  number: string;
  code6: string;
  /** "My bank is not listed", or the bank's name check was unavailable. */
  manual?: { institution: string; accountName: string };
};

/* ---- reviews and disputes --------------------------------------------- */

export type Review = {
  id: ID;
  bookingRef: string;
  author: PersonRef;
  rating: number;
  body: string;
  tags: string[];
  at: ISODate;
  response: string | null;
};

export type DisputeKind =
  | "provider_no_show"
  | "customer_no_show"
  | "incomplete_experience"
  | "cancellation_disagreement"
  | "refund_disagreement"
  | "payment_problem"
  | "misconduct"
  | "safety_concern";

export type Dispute = {
  id: ID;
  bookingId: ID;
  bookingRef: string;
  kind: DisputeKind;
  status: "open" | "under_review" | "resolved" | "rejected";
  description: string;
  openedBy: "customer" | "provider";
  at: ISODate;
  resolution: string | null;
};

/* ---- safety ----------------------------------------------------------- */

export type ReportCategory =
  | "harassment"
  | "fake_profile"
  | "scam"
  | "threats"
  | "underage"
  | "trafficking_coercion"
  | "non_consensual_imagery"
  | "violence"
  | "suspicious_transaction"
  | "policy_violation"
  | "other";

export type TrustedContact = { id: ID; name: string; phone: string; relation: string };

/* ---- notifications ---------------------------------------------------- */

export type NotificationKind =
  | "account"
  | "verification"
  | "connection"
  | "message"
  | "booking"
  | "payment"
  | "refund"
  | "payout"
  | "review"
  | "ranking"
  | "dispute"
  | "security";

export type AppNotification = {
  id: ID;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string | null;
  at: ISODate;
  read: boolean;
};

/* ---- markets ---------------------------------------------------------- */

export type MarketStatus = "planned" | "under_review" | "active" | "restricted" | "suspended";

export type MarketFeature = "registration" | "discovery" | "booking" | "payments" | "payouts";

export type Market = {
  country: string;
  status: MarketStatus;
  features: Record<MarketFeature, boolean>;
  currency: string;
  languages: string[];
  paymentGateways: string[];
  payoutMethods: string[];
  verificationProvider: string | null;
  /** Basis points. Null means not decided yet. */
  commissionBps: number | null;
  taxBps: number | null;
  crossBorderBooking: boolean;
  categories: ID[];
  policyId: ID;
};

/* ---- admin ------------------------------------------------------------ */

export type AdminStats = {
  members: number;
  companions: number;
  pendingVerification: number;
  openDisputes: number;
  bookings: number;
  activeMarkets: number;
  openReports: number;
  connections: number;
  messages: number;
  byStatus: Record<BookingStatus, number>;
};

/** A verification case. Staff see the decision inputs, never the raw documents. */
export type VerificationCase = {
  userId: ID;
  name: string;
  username: string;
  photo: string | null;
  role: AccountRole;
  country: string;
  age: number;
  documentType: IdDocumentType | null;
  documentCountry: string | null;
  hasBack: boolean;
  selfie: boolean;
  submittedAt: ISODate | null;
  status: VerificationStatus;
};

export type VerificationDecision = "approve" | "reject" | "needs_info";

export type KycFileKind = "id_front" | "id_back" | "selfie";

/**
 * A file someone submitted for identity verification. In production `url`
 * is a short-lived signed link from the KYC provider; every fetch is logged.
 */
export type KycFile = { id: ID; kind: KycFileKind; mimeType: string; url: string; uploadedAt: ISODate; sample: boolean };

/** Everything a verification officer needs to decide, in one place. */
export type KycReview = {
  case: VerificationCase;
  fullName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  files: KycFile[];
  profilePhotos: string[];
  reviewerNote: string | null;
  /** Previous staff decisions and document views for this person. */
  history: AuditEntry[];
};

export type AdminUserRow = {
  id: ID;
  name: string;
  username: string;
  email: string;
  photo: string | null;
  role: AccountRole;
  staff: StaffRole[];
  country: string;
  verification: VerificationStatus;
  onboarded: boolean;
  joinedAt: ISODate;
};

export type AdminDispute = Dispute & { customer: string; provider: string; amount: Money };

/* ---- analytics -------------------------------------------------------- */

/** A two-level hierarchy for sunburst charts (root > group > leaf). */
export type HierarchyNode = { id: string; label: string; value?: number; children?: HierarchyNode[] };

export type AdminAnalytics = {
  /** True while figures are generated for design work. The UI must say so. */
  simulated: boolean;
  days: { date: string; signups: number; completed: number; active: number; cancelled: number }[];
  membersByRegion: HierarchyNode;
  bookingsByExperience: HierarchyNode;
  funnel: { stage: string; value: number }[];
  ranks: { rank: Rank; count: number }[];
};

export type CompanionAnalytics = {
  simulated: boolean;
  currency: string;
  weeks: { week: string; earnings: Money; bookings: number }[];
  byExperience: HierarchyNode;
  ratings: { stars: number; count: number }[];
};

/** Platform-wide view of a booking. */
export type AdminBooking = {
  id: ID;
  reference: string;
  customer: PersonRef;
  provider: PersonRef;
  categoryId: ID;
  hours: DurationHours;
  startAt: ISODate;
  timezone: string;
  country: string;
  meetingArea: string;
  status: BookingStatus;
  price: Money;
  paid: Money | null;
  refunded: Money | null;
  compensation: Money | null;
  payoutHeld: boolean;
  disputeId: ID | null;
  events: BookingEvent[];
  createdAt: ISODate;
};

export type AdminBookingAction =
  | { type: "platform_cancel" } // full refund, no companion penalty
  | { type: "hold_payout" }
  | { type: "release_payout" };

export type DisputeResolution = {
  /** Share of the booking price returned to the member, 0 to 100. The companion receives the rest. */
  refundPct: number;
  /** Optional companion score change, e.g. -25 for a confirmed no-show. */
  scoreDelta: number;
  note: string;
};

export type ActivityKind = "signup" | "verification" | "match" | "connection" | "booking" | "payment" | "refund" | "report" | "dispute" | "staff";

export type ActivityEvent = { id: ID; at: ISODate; kind: ActivityKind; text: string; href: string | null };

export type LedgerEntry = {
  id: ID;
  at: ISODate;
  kind: "payment" | "refund" | "compensation" | "host_earning" | "payout" | "platform_fee" | "penalty";
  bookingRef: string;
  party: string;
  amount: Money;
  status: string;
};

export type FinanceSummary = {
  currency: string;
  volume: Money;
  payments: number;
  refunds: Money;
  compensation: Money;
  hostPending: Money;
  hostAvailable: Money;
  paidOut: Money;
  /** Null while commission rates are a team decision. */
  platformRevenue: Money | null;
};

export type ReportStatus = "open" | "actioned" | "dismissed";

export type AdminReport = {
  id: ID;
  at: ISODate;
  category: ReportCategory;
  urgent: boolean;
  details: string;
  reporter: PersonRef;
  target: PersonRef;
  bookingRef: string | null;
  status: ReportStatus;
  resolution: string | null;
  priorReports: number;
};

export type ReportAction = "dismiss" | "warn" | "suspend";

export type AdminUserDetail = {
  row: AdminUserRow;
  displayName: string;
  bio: string;
  photos: string[];
  city: string;
  isProvider: boolean;
  rank: Rank | null;
  connections: number;
  messagesSent: number;
  bookings: AdminBooking[];
  /** Masked; staff never see full account numbers. */
  payoutAccount: PayoutAccount | null;
  reportsAgainst: number;
  reportsMade: number;
  activity: ActivityEvent[];
};

export type AuditEntry = {
  id: ID;
  at: ISODate;
  actor: string;
  role: StaffRole;
  action: string;
  target: string;
  reason: string;
};
