/*
 * The operations the Meet frontend needs from the backend. The mock adapter
 * (./mock) and the future HTTP adapter both implement this interface, so
 * screens never change when the real API arrives.
 */
import type {
  MoneyRules,
  PayoutAccount,
  PayoutAccountInput,
  PayoutOptions,
  Account,
  AccountRole,
  AdminDispute,
  AdminStats,
  AdminAnalytics,
  CompanionAnalytics,
  AdminUserRow,
  AdminBooking,
  AdminBookingAction,
  AdminReport,
  AdminUserDetail,
  ActivityEvent,
  DisputeResolution,
  FinanceSummary,
  LedgerEntry,
  ReportAction,
  AuditEntry,
  VerificationCase,
  VerificationDecision,
  KycReview,
  IdDocumentType,
  OnboardingData,
  OnboardingStatus,
  OnboardingStepId,
  OtpChannel,
  Preferences,
  PrivateLocation,
  AppNotification,
  Booking,
  BookingRequestInput,
  CancellationPolicy,
  CancellationQuote,
  Category,
  Checkout,
  Connection,
  ConnectionRequest,
  DiscoveryFilters,
  DiscoveryMode,
  Dispute,
  DisputeKind,
  DurationHours,
  Earnings,
  ID,
  LikeResult,
  Market,
  Message,
  Payment,
  Payout,
  PrivacySettings,
  Profile,
  ProfileDraft,
  ProviderCancelReason,
  ProviderPerformance,
  ProviderSettings,
  RateChange,
  ReportCategory,
  Review,
  TrustedContact,
} from "./types";

export type RegisterInput = {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  otpChannel: OtpChannel;
  role: AccountRole;
  password: string;
  dateOfBirth: string;
  country: string;
  acceptedTerms: boolean;
};

export type OnboardingSave =
  | { step: "photos"; photos: string[] }
  | { step: "about"; data: OnboardingData["about"] }
  | { step: "looking_for"; data: OnboardingData["lookingFor"] }
  | { step: "preferences"; data: Preferences }
  | { step: "location"; data: PrivateLocation }
  | { step: "experiences"; data: Pick<ProviderSettings, "headline" | "arrangement" | "categories" | "expensesNote"> }
  | { step: "rates"; data: Pick<ProviderSettings, "rates" | "negotiable"> }
  | { step: "availability"; data: Pick<ProviderSettings, "availability"> };

export type BookingAction =
  | { type: "accept" }
  | { type: "decline"; reason: string }
  | { type: "propose"; startAt?: string; hours?: DurationHours; meetingArea?: string; note: string }
  | { type: "accept_proposal" }
  | { type: "reject_proposal" }
  | { type: "check_in" }
  | { type: "mark_completed" }
  | { type: "confirm_completion" }
  | { type: "cancel"; reason: string; providerReason?: ProviderCancelReason };

export interface MeetApi {
  auth: {
    me(): Promise<Account | null>;
    login(email: string, password: string): Promise<Account>;
    register(input: RegisterInput): Promise<Account>;
    /** Confirms the one-time code sent by the chosen channel. */
    verifyOtp(code: string): Promise<Account>;
    /** Sends a fresh code; optionally switches channel. Returns seconds until another resend is allowed. */
    resendOtp(channel?: OtpChannel): Promise<{ retryInSeconds: number; sentTo: string }>;
    usernameAvailable(username: string): Promise<boolean>;
    logout(): Promise<void>;
    requestPasswordReset(email: string): Promise<void>;
    resetPassword(token: string, password: string): Promise<void>;
  };

  onboarding: {
    status(): Promise<OnboardingStatus>;
    data(): Promise<OnboardingData>;
    save(input: OnboardingSave): Promise<OnboardingStatus>;
    skip(step: OnboardingStepId): Promise<OnboardingStatus>;
    /** Government ID images go straight to the KYC provider; Meet keeps only the decision. */
    uploadId(input: { type: IdDocumentType; country: string; front: File; back?: File }): Promise<OnboardingStatus>;
    /** Selfie for face match and liveness, performed by the KYC provider. */
    submitSelfie(image: Blob): Promise<OnboardingStatus>;
  };

  profile: {
    mine(): Promise<ProfileDraft>;
    save(draft: ProfileDraft): Promise<ProfileDraft>;
    /** Uploads one photo; the backend strips metadata and moderates it. */
    uploadPhoto(file: File): Promise<string>;
    privacy(): Promise<PrivacySettings>;
  };

  discovery: {
    list(mode: DiscoveryMode, filters: DiscoveryFilters): Promise<Profile[]>;
    get(id: ID): Promise<Profile>;
    like(id: ID): Promise<LikeResult>;
    pass(id: ID): Promise<void>;
    toggleSave(id: ID): Promise<boolean>;
    saved(): Promise<Profile[]>;
    reviews(id: ID): Promise<Review[]>;
  };

  social: {
    connections(): Promise<Connection[]>;
    requests(): Promise<ConnectionRequest[]>;
    sendRequest(id: ID, message: string): Promise<void>;
    respond(requestId: ID, accept: boolean): Promise<void>;
    unmatch(connectionId: ID): Promise<void>;
    messages(connectionId: ID): Promise<Message[]>;
    send(connectionId: ID, body: string, clientId?: string): Promise<Message>;
    /** Opens (or reuses) a chat with a companion to plan before booking. */
    openChat(personId: ID): Promise<{ connectionId: ID }>;
    markRead(connectionId: ID): Promise<void>;
  };

  safety: {
    block(id: ID): Promise<void>;
    report(input: { targetId: ID; category: ReportCategory; details: string; bookingId?: ID }): Promise<void>;
    trustedContacts(): Promise<TrustedContact[]>;
    saveTrustedContact(c: Omit<TrustedContact, "id"> & { id?: ID }): Promise<TrustedContact>;
    removeTrustedContact(id: ID): Promise<void>;
  };

  notifications: {
    list(): Promise<AppNotification[]>;
    markAllRead(): Promise<void>;
  };

  provider: {
    settings(): Promise<ProviderSettings>;
    saveSettings(s: ProviderSettings): Promise<ProviderSettings>;
    activate(): Promise<Account>;
    performance(): Promise<ProviderPerformance>;
    rateHistory(): Promise<RateChange[]>;
    earnings(): Promise<Earnings>;
    analytics(): Promise<CompanionAnalytics>;
    payouts(): Promise<Payout[]>;
    payoutOptions(): Promise<PayoutOptions>;
    payoutAccount(): Promise<PayoutAccount | null>;
    /** Asks the bank or network for the name on the account, before saving. */
    resolveAccount(code: string, number: string): Promise<{ accountName: string; matchesVerifiedName: boolean }>;
    /** Sends a 6-digit code to confirm a payout details change. */
    requestPayoutCode(): Promise<{ sentTo: string }>;
    setPayoutAccount(input: PayoutAccountInput): Promise<PayoutAccount>;
    withdraw(): Promise<Payout>;
  };

  bookings: {
    list(role: "customer" | "provider"): Promise<Booking[]>;
    get(id: ID): Promise<Booking>;
    request(input: BookingRequestInput): Promise<Booking>;
    act(id: ID, action: BookingAction): Promise<Booking>;
    cancellationQuote(id: ID): Promise<CancellationQuote>;
    checkout(id: ID): Promise<Checkout>;
    pay(id: ID, methodId: string): Promise<Booking>;
    payments(): Promise<Payment[]>;
    review(id: ID, input: { rating: number; body: string; tags: string[] }): Promise<void>;
    openDispute(id: ID, input: { kind: DisputeKind; description: string }): Promise<Dispute>;
  };

  /** Staff only. Every write is permission-checked and written to the audit log. */
  admin: {
    stats(): Promise<AdminStats>;
    analytics(): Promise<AdminAnalytics>;
    verificationQueue(): Promise<VerificationCase[]>;
    decide(userId: ID, decision: VerificationDecision, note: string): Promise<void>;
    /** Opens a person's submitted identity files. Every call is written to the audit log. */
    kycReview(userId: ID): Promise<KycReview>;
    users(query: string): Promise<AdminUserRow[]>;
    user(id: ID): Promise<AdminUserDetail>;
    activity(): Promise<ActivityEvent[]>;
    bookings(): Promise<AdminBooking[]>;
    booking(id: ID): Promise<AdminBooking>;
    bookingAction(id: ID, action: AdminBookingAction, reason: string): Promise<AdminBooking>;
    resolveDispute(id: ID, r: DisputeResolution): Promise<void>;
    /** `payoutReviews`: hand-typed payout details waiting for a staff check. */
    finance(): Promise<{ summaries: FinanceSummary[]; ledger: LedgerEntry[]; payoutReviews: { userId: ID; name: string; institution: string; last4: string; addedAt: string }[] }>;
    reports(): Promise<AdminReport[]>;
    resolveReport(id: ID, action: ReportAction, note: string): Promise<void>;
    setSuspended(userId: ID, suspended: boolean, reason: string): Promise<void>;
    disputes(): Promise<AdminDispute[]>;
    markets(): Promise<Market[]>;
    updateMarket(country: string, patch: Partial<Pick<Market, "status" | "features">>, reason: string): Promise<Market>;
    moneyRules(): Promise<MoneyRules>;
    /** Approve or reject payout details a companion typed in by hand. */
    reviewPayoutAccount(userId: ID, approve: boolean, reason: string): Promise<void>;
    updateMoneyRules(patch: Pick<MoneyRules, "commissionPct" | "tiers" | "latePenalty" | "payoutHoldHours">, reason: string): Promise<MoneyRules>;
    audit(): Promise<AuditEntry[]>;
  };

  reference: {
    categories(): Promise<Category[]>;
    markets(): Promise<Market[]>;
    policy(id: ID): Promise<CancellationPolicy>;
  };
}
