<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---
---

# Meet rules

The block above is managed by `next dev`; everything below it is ours.
Product names live in `SITE` in [`src/lib/site.ts`](src/lib/site.ts): never
hard-code them elsewhere. Plan: [`docs/frontend-plan.md`](docs/frontend-plan.md).

## What this is

The **Meet** web frontend, part of the **Watch & Meet** brand. Meet is an
adults-only (18+) platform for social discovery, connections, messaging and
booking social experiences with companions, across all 55 AU member states.
Watch is a separate product: it appears on the brand homepage as a preview
only. Do not build Watch features here.

This repo is **frontend only**. The backend is built separately. Screens call
`api` from `src/lib/api/client.ts`, typed by `src/lib/api/contract.ts` and
`types.ts`; until the backend lands that is a localStorage mock
(`src/lib/api/mock/`). Never call storage from screens.

Chats are live over **socket.io**: `realtime()` from `src/lib/realtime/`
(events documented in `types.ts`). With `NEXT_PUBLIC_SOCKET_URL` unset it is
a simulator that plays the other side; the chat screen says so.

## Roles and words

- People are **members** or **companions** (a member who offers bookings).
  Never "host", "guest", "provider" or "customer" in copy; those words stay
  in code identifiers and the API only. Show the role with `RoleBadge`.
- The signed-in person is **"You"** (`nameOf`, `bookingEventText` in
  `src/lib/format.ts`): "You booked Amara", "Ada booked you".
- Write for someone who is not technical: short plain sentences, one clear
  next step ("Pay now", "Answer"), no jargon.
- Chat comes before money: members can message a companion from their
  profile, agree the time and place in the chat, then book; payment opens
  only after the companion accepts. Booking steps post a note in the chat.
- Staff only ever see `/admin`; the member app redirects them there.

## App folder

Route groups by audience: `(public)` homepage and rules, `(auth)` sign in,
register and onboarding, `(member)` the app every signed-in person uses,
`(companion)` companion-only pages under `/companion`, `(admin)` the
staff console under `/admin`. Components follow the same names
(`components/companion`, `components/chats`, ...).

## Before saying it works

- `npm run build` and `npx eslint src/` must both be clean.
- Layout and interaction claims need a browser screenshot at 1440px and 390px.

## Design

- **Dark only.** Neutral near-black surfaces stepped by lightness (`ink` <
  `coal` < `char` < `smoke`), near-white `cream` type, one accent: `ember`
  `#FF5A36`. Small text on ember is `ink`.
- **Type:** General Sans only (self-hosted in `src/fonts/`, licence alongside).
  `display` = semibold, tight tracking, for names, titles and big numbers.
- **Modern premium app language** (see the dating-app references the user
  shared): photo-filled cards with large radii (24 to 36px), frosted `glass`
  name plates over photos, `glass-dark` controls, white pill for the active
  state (segmented `Tabs`, sidebar, tab bar), round icon buttons, pass/like
  pill cluster, scalloped `Verified` seal, story rings, `surface` panels.
- **Buttons are pills.** `primary` is cream; `accent` (ember) only for the
  key action on a screen (join, like, book, pay).
- **Motion** lives in `src/components/motion.tsx` (`Reveal`, `Stagger`,
  `Lift`, `Tilt`, `Spotlight`, `Burst`) plus `layoutId` pills and the
  `(member)/template.tsx` page transition. Springs, not linear tweens.
  `MotionConfig reducedMotion="user"` must stay in `Providers`.
- **Logos** are outlined SVGs in `public/brand/` (use `Logo` / `Wordmark`);
  regenerate from the font, never hand-type them.
- Provider ranks have their own colours: `bronze` to `diamond`.
- **No auto-moving content** (marquees, auto-advancing carousels, looping
  animation). Entrance, hover, drag and scroll-linked motion are fine. The
  chat "typing" dots are the one loop allowed: a live status, shown only
  while the other person types.
- Icons: **Hugeicons** only. No em dashes in copy, comments or docs.

## Content and safety

- Every photo in `public/people/` is AI-generated, of fictional people. Never
  use stock photos or real people's images as profile placeholders.
- Nothing explicit in UI, placeholders or copy. Bookings buy time and company
  for social experiences, never physical contact; say so where money appears.
- Location is always approximate ("about 2 km"), never a precise point.
- Never show simulated payment, refund, payout or verification as real:
  label it (`DevNote`, "simulated").
- Prices, fees, commissions, verification method and legal wording are team
  decisions: leave a marked `TODO(team)` gap and ask.
- Money is integer minor units; format only through `src/lib/format.ts`.
- **Money rules** (agreed 2026-11-18, editable in `/admin/money`, snapshotted
  on each booking): Meet keeps 10% of what the companion earns, never added
  to the member's price. Member cancels: refund by notice step, the rest to
  the companion minus Meet's share. Companion cancels: member refunded in
  full; a late cancellation costs the companion a penalty from their next
  payout. Refunds go back to the original payment method; members never
  enter bank details. Companions add payout details (name must match their
  verified ID, code to confirm, safety wait after a change, last 4 digits
  only). Gateways: Paystack where it operates, Flutterwave elsewhere.
  The bank list comes from the gateway's live bank list per country (mock:
  `src/lib/api/mock/banks.ts`); hand-typed banks are checked by staff
  before any payout.
- **First visit:** `Gates` (in `Providers`) shows the 18+ gate before any page
  is usable (under-18s are shown out) and then the cookie choice. Answers
  live in the `meet_age` and `meet_consent` cookies (`src/lib/consent.ts`);
  only run analytics when `analyticsAllowed()` is true.

## React

- No `setState` in an effect body; the lint rule is an error.

## Windows, and this shell

- sharp holds its source file open: read into a Buffer before overwriting.
- Git Bash heredocs and `node -e` break on apostrophes: write scripts to files.
- Git Bash rewrites a bare `/` argument into a path: use `MSYS_NO_PATHCONV=1`.
- Stop `next start` before rebuilding; it holds `.next` open.
