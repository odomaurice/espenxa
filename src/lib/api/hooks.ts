"use client";

/*
 * React Query hooks over `api`. Query keys live here so mutations can
 * invalidate exactly what they change.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { BookingAction } from "./contract";
import type { DiscoveryFilters, DiscoveryMode, ID } from "./types";

export const qk = {
  me: ["me"] as const,
  myProfile: ["profile", "mine"] as const,
  discovery: (mode: DiscoveryMode, f: DiscoveryFilters) => ["discovery", mode, f] as const,
  person: (id: ID) => ["person", id] as const,
  reviews: (id: ID) => ["reviews", id] as const,
  saved: ["saved"] as const,
  connections: ["connections"] as const,
  requests: ["requests"] as const,
  messages: (id: ID) => ["messages", id] as const,
  notifications: ["notifications"] as const,
  trusted: ["trusted"] as const,
  providerSettings: ["provider", "settings"] as const,
  performance: ["provider", "performance"] as const,
  rateHistory: ["provider", "rates"] as const,
  earnings: ["provider", "earnings"] as const,
  payouts: ["provider", "payouts"] as const,
  bookings: (role: "customer" | "provider") => ["bookings", role] as const,
  booking: (id: ID) => ["booking", id] as const,
  quote: (id: ID) => ["quote", id] as const,
  checkout: (id: ID) => ["checkout", id] as const,
  payments: ["payments"] as const,
  categories: ["categories"] as const,
  markets: ["markets"] as const,
};

export const useCategories = () => useQuery({ queryKey: qk.categories, queryFn: api.reference.categories, staleTime: Infinity });
export const useMarkets = () => useQuery({ queryKey: qk.markets, queryFn: api.reference.markets, staleTime: 5 * 60_000 });

export const useDiscovery = (mode: DiscoveryMode, f: DiscoveryFilters) =>
  useQuery({ queryKey: qk.discovery(mode, f), queryFn: () => api.discovery.list(mode, f) });
export const usePerson = (id: ID) => useQuery({ queryKey: qk.person(id), queryFn: () => api.discovery.get(id) });
export const useReviews = (id: ID) => useQuery({ queryKey: qk.reviews(id), queryFn: () => api.discovery.reviews(id) });
export const useSaved = () => useQuery({ queryKey: qk.saved, queryFn: api.discovery.saved });

export const useConnections = () => useQuery({ queryKey: qk.connections, queryFn: api.social.connections, refetchInterval: 15_000 });
export const useRequests = () => useQuery({ queryKey: qk.requests, queryFn: api.social.requests });
export const useMessages = (id: ID) => useQuery({ queryKey: qk.messages(id), queryFn: () => api.social.messages(id), refetchInterval: 8_000 });
export const useNotifications = () => useQuery({ queryKey: qk.notifications, queryFn: api.notifications.list, refetchInterval: 30_000 });

export const useMyProfile = (enabled = true) => useQuery({ queryKey: qk.myProfile, queryFn: api.profile.mine, enabled });
export const useTrusted = () => useQuery({ queryKey: qk.trusted, queryFn: api.safety.trustedContacts });

export const useProviderSettings = (enabled = true) => useQuery({ queryKey: qk.providerSettings, queryFn: api.provider.settings, enabled });
export const usePerformance = (enabled = true) => useQuery({ queryKey: qk.performance, queryFn: api.provider.performance, enabled });
export const useRateHistory = () => useQuery({ queryKey: qk.rateHistory, queryFn: api.provider.rateHistory });
export const useEarnings = (enabled = true) => useQuery({ queryKey: qk.earnings, queryFn: api.provider.earnings, enabled });
export const usePayouts = () => useQuery({ queryKey: qk.payouts, queryFn: api.provider.payouts });

export const useBookings = (role: "customer" | "provider", enabled = true) =>
  useQuery({ queryKey: qk.bookings(role), queryFn: () => api.bookings.list(role), enabled });
export const useBooking = (id: ID) => useQuery({ queryKey: qk.booking(id), queryFn: () => api.bookings.get(id) });
export const useQuote = (id: ID, enabled: boolean) => useQuery({ queryKey: qk.quote(id), queryFn: () => api.bookings.cancellationQuote(id), enabled });
export const useCheckout = (id: ID) => useQuery({ queryKey: qk.checkout(id), queryFn: () => api.bookings.checkout(id), retry: false });
export const usePayments = () => useQuery({ queryKey: qk.payments, queryFn: api.bookings.payments });

/** Booking state changes refresh both sides' lists and the detail. */
export function useBookingAction(id: ID) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (a: BookingAction) => api.bookings.act(id, a),
    onSuccess: (b) => {
      qc.setQueryData(qk.booking(id), b);
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["provider"] });
      qc.invalidateQueries({ queryKey: qk.notifications });
    },
  });
}

export const useOnboardingStatus = (enabled = true) => useQuery({ queryKey: ["onboarding", "status"], queryFn: api.onboarding.status, enabled });
export const useOnboardingData = () => useQuery({ queryKey: ["onboarding", "data"], queryFn: api.onboarding.data });
