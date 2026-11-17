/*
 * Human labels for contract enums. English first; when more languages land,
 * these move into the i18n catalogue keyed by the same ids.
 */
import type {
  Arrangement,
  BookingStatus,
  DisputeKind,
  Gender,
  Intention,
  MarketFeature,
  MarketStatus,
  ProviderCancelReason,
  Rank,
  ReportCategory,
  StaffRole,
  VerificationStatus,
} from "./api/types";

export const GENDERS: { id: Gender; label: string }[] = [
  { id: "woman", label: "Woman" },
  { id: "man", label: "Man" },
  { id: "non_binary", label: "Non-binary" },
  { id: "other", label: "Another identity" },
];
export const genderLabel = (g: Gender) => GENDERS.find((x) => x.id === g)?.label ?? g;

export const INTENTIONS: { id: Intention; label: string; sub: string }[] = [
  { id: "dating", label: "Dating", sub: "Open to something romantic" },
  { id: "friendship", label: "Friendship", sub: "New friends, nothing more expected" },
  { id: "companionship", label: "Companionship", sub: "Company for a few hours or a day" },
  { id: "conversation", label: "Conversation", sub: "Someone good to talk to" },
  { id: "activity_partner", label: "Activity partner", sub: "Events, sport, outdoors" },
  { id: "travel_companion", label: "Travel companion", sub: "Exploring a city or a trip" },
  { id: "networking", label: "Networking", sub: "Meeting people in your field" },
];
export const intentionLabel = (i: Intention) => INTENTIONS.find((x) => x.id === i)?.label ?? i;

export const ARRANGEMENTS: { id: Arrangement; label: string; sub: string }[] = [
  { id: "free", label: "Free", sub: "No charge for your time" },
  { id: "paid", label: "Paid", sub: "Booked and paid through Meet" },
  { id: "flexible", label: "Flexible", sub: "Free or paid, depending on the plan" },
];
export const arrangementLabel = (a: Arrangement) => ARRANGEMENTS.find((x) => x.id === a)?.label ?? a;

export const RANKS: { id: Rank; label: string; sub: string }[] = [
  { id: "bronze", label: "Bronze", sub: "Verified provider meeting minimum eligibility" },
  { id: "silver", label: "Silver", sub: "Consistent completed bookings and good feedback" },
  { id: "gold", label: "Gold", sub: "Strong completion rate, positive reviews, few cancellations" },
  { id: "platinum", label: "Platinum", sub: "Excellent reliability and sustained satisfaction" },
  { id: "diamond", label: "Diamond", sub: "Exceptional performance and a long record of great bookings" },
];
export const rankLabel = (r: Rank) => RANKS.find((x) => x.id === r)?.label ?? r;
export const rankIndex = (r: Rank) => RANKS.findIndex((x) => x.id === r);

export const VERIFICATION: Record<VerificationStatus, { label: string; tone: "ok" | "warn" | "bad" | "mute" }> = {
  unverified: { label: "Not verified", tone: "mute" },
  pending: { label: "Verification pending", tone: "warn" },
  verified: { label: "Verified", tone: "ok" },
  rejected: { label: "Verification rejected", tone: "bad" },
  needs_info: { label: "More information needed", tone: "warn" },
  suspended: { label: "Suspended", tone: "bad" },
};

export const STAFF_ROLES: { id: StaffRole; label: string }[] = [
  { id: "super_admin", label: "Super Administrator" },
  { id: "admin", label: "Administrator" },
  { id: "moderator", label: "Moderator" },
  { id: "support", label: "Customer Support" },
  { id: "finance", label: "Finance Officer" },
  { id: "verification_officer", label: "Verification Officer" },
];
export const staffRoleLabel = (r: StaffRole) => STAFF_ROLES.find((x) => x.id === r)?.label ?? r;

export const BOOKING_STATUS: Record<BookingStatus, { label: string; tone: "ok" | "warn" | "bad" | "mute" | "info" }> = {
  requested: { label: "Requested", tone: "warn" },
  adjustment_proposed: { label: "Change proposed", tone: "warn" },
  accepted: { label: "Awaiting payment", tone: "info" },
  confirmed: { label: "Confirmed", tone: "ok" },
  in_progress: { label: "In progress", tone: "ok" },
  provider_completed: { label: "Awaiting your confirmation", tone: "info" },
  completed: { label: "Completed", tone: "mute" },
  customer_cancelled: { label: "Cancelled by the member", tone: "bad" },
  provider_cancelled: { label: "Cancelled by the companion", tone: "bad" },
  platform_cancelled: { label: "Cancelled by Meet", tone: "bad" },
  declined: { label: "Declined", tone: "mute" },
  expired: { label: "Expired", tone: "mute" },
  disputed: { label: "In dispute", tone: "bad" },
};

export const PROVIDER_CANCEL_REASONS: { id: ProviderCancelReason; label: string }[] = [
  { id: "emergency", label: "Emergency" },
  { id: "illness", label: "Illness" },
  { id: "unforeseen", label: "Unforeseen circumstances" },
  { id: "scheduling_conflict", label: "Scheduling conflict" },
  { id: "safety_concern", label: "Safety concern" },
  { id: "other", label: "Other" },
];

export const DISPUTE_KINDS: { id: DisputeKind; label: string }[] = [
  { id: "provider_no_show", label: "Provider did not show up" },
  { id: "customer_no_show", label: "Customer did not show up" },
  { id: "incomplete_experience", label: "Experience was not completed" },
  { id: "cancellation_disagreement", label: "Disagreement about a cancellation" },
  { id: "refund_disagreement", label: "Disagreement about a refund" },
  { id: "payment_problem", label: "Payment problem" },
  { id: "misconduct", label: "Misconduct" },
  { id: "safety_concern", label: "Safety concern" },
];

export const REPORT_CATEGORIES: { id: ReportCategory; label: string; urgent?: boolean }[] = [
  { id: "underage", label: "May be under 18", urgent: true },
  { id: "trafficking_coercion", label: "Trafficking or coercion", urgent: true },
  { id: "threats", label: "Threats", urgent: true },
  { id: "violence", label: "Violence", urgent: true },
  { id: "non_consensual_imagery", label: "Non-consensual imagery", urgent: true },
  { id: "harassment", label: "Harassment" },
  { id: "fake_profile", label: "Fake profile" },
  { id: "scam", label: "Scam" },
  { id: "suspicious_transaction", label: "Suspicious transaction" },
  { id: "policy_violation", label: "Policy violation" },
  { id: "other", label: "Other safety concern" },
];

export const MARKET_STATUS: Record<MarketStatus, string> = {
  planned: "Planned",
  under_review: "Under review",
  active: "Active",
  restricted: "Temporarily restricted",
  suspended: "Suspended",
};

export const MARKET_FEATURES: { id: MarketFeature; label: string }[] = [
  { id: "registration", label: "Registration" },
  { id: "discovery", label: "Discovery" },
  { id: "booking", label: "Booking" },
  { id: "payments", label: "Payments" },
  { id: "payouts", label: "Payouts" },
];

export const INTEREST_SUGGESTIONS = [
  "Afrobeats", "Amapiano", "Jazz", "Live music", "Art galleries", "Film", "Theatre", "Books",
  "Poetry", "Photography", "Fashion", "Cooking", "Street food", "Fine dining", "Coffee", "Wine",
  "Football", "Basketball", "Running", "Gym", "Hiking", "Swimming", "Cycling", "Yoga", "Dance",
  "Travel", "Beaches", "Road trips", "Tech", "Startups", "Gaming", "Chess", "Volunteering",
  "Faith", "Languages", "Board games", "Karaoke", "Comedy", "Nature", "Markets",
];

export const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", fr: "French", ar: "Arabic", pt: "Portuguese", sw: "Swahili", am: "Amharic",
  yo: "Yoruba", ig: "Igbo", ha: "Hausa", zu: "Zulu", xh: "Xhosa", af: "Afrikaans", so: "Somali",
  rw: "Kinyarwanda", mg: "Malagasy", ti: "Tigrinya", es: "Spanish", tw: "Twi", wo: "Wolof", ln: "Lingala",
};
export const languageName = (code: string) => LANGUAGE_NAMES[code] ?? code;

export const ACCOUNT_ROLES: { id: import("./api/types").AccountRole; label: string; sub: string }[] = [
  { id: "member", label: "Member", sub: "Discover people, connect, chat and book experiences." },
  { id: "companion", label: "Companion", sub: "Everything members do, plus offer paid or free experiences at your own prices." },
];

export const STEP_LABELS: Record<import("./api/types").OnboardingStepId, { label: string; sub: string }> = {
  photos: { label: "Photos", sub: "Clear photos of you" },
  about: { label: "About you", sub: "A short description" },
  looking_for: { label: "Looking for", sub: "What brings you to Meet" },
  preferences: { label: "Preferences", sub: "Who you would like to meet" },
  experiences: { label: "Experiences", sub: "What you offer" },
  rates: { label: "Prices", sub: "Your rates by duration" },
  availability: { label: "Availability", sub: "When you are usually free" },
  location: { label: "Location", sub: "Private address" },
  id_document: { label: "Government ID", sub: "Identity check" },
  selfie: { label: "Selfie", sub: "Face match" },
};

export const BUILDS: { id: import("./api/types").Build; label: string }[] = [
  { id: "slim", label: "Slim" },
  { id: "athletic", label: "Athletic" },
  { id: "average", label: "Average" },
  { id: "muscular", label: "Muscular" },
  { id: "curvy", label: "Curvy" },
  { id: "full_figured", label: "Full-figured" },
];

export const ID_TYPES: { id: import("./api/types").IdDocumentType; label: string; back: boolean }[] = [
  { id: "national_id", label: "National ID card", back: true },
  { id: "passport", label: "Passport", back: false },
  { id: "drivers_licence", label: "Driver's licence", back: true },
  { id: "voters_card", label: "Voter's card", back: true },
  { id: "residence_permit", label: "Residence permit", back: true },
];

export type StaffPermission = "verification" | "users" | "disputes" | "markets" | "audit" | "bookings" | "finance" | "reports" | "activity";

/** What each staff role may do. The backend enforces the same table. */
export const STAFF_PERMS: Record<StaffRole, StaffPermission[]> = {
  super_admin: ["activity", "bookings", "finance", "reports", "verification", "users", "disputes", "markets", "audit"],
  admin: ["activity", "bookings", "finance", "reports", "verification", "users", "disputes", "markets", "audit"],
  moderator: ["activity", "reports", "verification", "users"],
  support: ["activity", "bookings", "reports", "users", "disputes"],
  finance: ["activity", "bookings", "finance", "disputes", "audit"],
  verification_officer: ["verification"],
};
export const staffCan = (roles: StaffRole[], p: StaffPermission) => roles.some((r) => STAFF_PERMS[r].includes(p));
