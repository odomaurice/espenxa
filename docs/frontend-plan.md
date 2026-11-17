# Meet: frontend architecture and plan

Meet is the social discovery, companionship and experience-booking product of
the Watch & Meet brand. This repository is the **Meet web frontend**. The
backend (API, database, payments, identity verification, payouts) is built
separately; until it lands, the frontend runs on a clearly labelled mock
adapter that implements the same contract.

## 1. Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| Styling | Tailwind CSS v4, CSS-first tokens in `src/app/globals.css` |
| Server state | TanStack Query v5 over a typed API client |
| Validation | zod (form validation only; the backend re-validates everything) |
| Icons | Hugeicons |
| Type | Antonio (display, numbers), Outfit (text) |
| Motion | framer-motion, used sparingly (swipe stack, sheets) |

## 2. Folder structure

```
src/
  app/
    (auth)/            login, register, forgot-password, reset-password
    onboarding/        profile setup after registration
    (app)/             signed-in member area, shared shell
      discover/        swipe, browse, nearby
      people/[id]/     profile, experiences, rates, reviews
      connections/     matches, requests, saved
      messages/        inbox and threads
      bookings/        customer bookings, booking detail
      book/[id]/       booking request flow
      checkout/[id]/   payment summary
      provider/        provider hub, setup, bookings, earnings, ranking
      notifications/ settings/ safety/ verify/
    admin/             staff console (role-gated)
  components/
    ui/                design-system primitives
    shell/             sidebar, top bar, tab bar
    <feature>/         feature components
  lib/
    api/               contract types, client, mock adapter
    countries.ts       55 AU member states (reference data)
    format.ts          money (minor units), dates, distance
    i18n/              message catalogue, English first
```

## 3. API contract and the mock adapter

- `src/lib/api/types.ts` is the contract: every entity the screens use
  (users, profiles, providers, rates, bookings, payments, disputes, markets,
  policies, audit entries).
- `src/lib/api/client.ts` exposes one `api` object. Screens only call `api`
  through React Query hooks; they never touch storage.
- `src/lib/api/mock/` implements `api` in the browser with seeded data and
  simulated latency. Anything the real backend decides (cancellation
  allocations, ranking, payout eligibility, payment status) is computed in
  the mock only to make the screens usable, and the UI labels it
  "Development data" wherever money, verification or payouts appear.
- Swapping to the real backend means writing `src/lib/api/http.ts` with the
  same interface and switching the export in `client.ts`.

Money is always `{ amountMinor: number, currency: string }` (integers in
minor units). The frontend never does fee, refund or payout arithmetic for
real; it displays what the API returns.

## 4. Roles

Member and provider are the same account (`user.isProvider`). Staff roles:
Super Administrator, Administrator, Moderator, Customer Support, Finance
Officer, Verification Officer. The admin console hides sections the role
cannot use; the backend must enforce the same rules.

## 5. Design system

- Dark only: warm charcoal grounds (`ink`, `coal`, `char`, `smoke`), cream
  type, one accent `ember` #FF5A36.
- Mature and calm: 12 to 16 px radii, hairline borders, photos carry colour.
- Rank colours: Bronze, Silver, Gold, Platinum, Diamond each get a distinct
  badge.
- Desktop: left sidebar. Phones: slim top bar and bottom tab bar.
- Every data view has loading, empty and error states.

## 6. Phases (frontend)

1. Plan, foundation, design system, shell, auth screens, mock adapter.
2. Member experience: onboarding, profile editing, discovery, filters,
   matching, connections, messaging, notifications.
3. Provider experience: activation, categories, six durations with own
   prices, availability, ranking and performance dashboard, booking inbox.
4. Booking and money screens: request, adjustments, checkout, cancellation
   preview, check-in, completion, disputes, reviews, earnings, payouts.
5. Admin console: users, verification, providers, bookings, disputes,
   finance, policies, ranking thresholds, categories, markets, audit log.
6. Quality: accessibility pass, responsive pass, tests, docs.

## 7. Open decisions (team, not frontend)

- Platform commission, processing fee and tax values per market.
- Identity verification provider per country.
- Payment and payout gateways per country.
- Final legal copy: terms, consent, cancellation policy wording.
