<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---
---

# espenxa rules

The block above is managed by `next dev`; everything below it is ours.
Product names live in `SITE` in [`src/lib/site.ts`](src/lib/site.ts): never
hard-code them elsewhere. The name is always lowercase: **espenxa**.
Plan: [`docs/frontend-plan.md`](docs/frontend-plan.md).

## What this is

The **espenxa** web frontend: an adults-only (18+) platform for social
discovery, connections, messaging and booking social experiences with
companions, across all 55 AU member states. (It was called Meet, inside a
"Watch & Meet" brand; Watch is dropped and nothing of it is built here.)

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

Clean editorial retail look (the user's reference is the structure and feel
of spanx.com; never copy its logo, images or wording).

- **Light.** White page and cards, near-black type, quiet greys. Token names
  are roles: `ink` = page, `cream` = text, `coal < char < smoke` = surfaces,
  one accent `ember` (deep terracotta), only for key actions inside the app
  (never on the public homepage). Public photos use the `wash` treatment. `on-dark` restores
  the dark palette for text over photos (`glass`, anything after
  `photo-shade`) and the staff console, which stays dark.
- **Type:** Gelasio serif for `display` headings at regular weight (400),
  tightly tracked, never bold. Inter for body and UI, mostly regular. Courier
  Prime only in the announcement bar. All self-hosted by `next/font/google`
  (SIL OFL). Do not make headings bold.
- **Shapes:** square photos on the public site; small radii (10px) on app
  cards; buttons are pills in small uppercase (`primary` filled black,
  `secondary` thin outline, `accent` ember only for the key action).
- **Motion** lives in `src/components/motion.tsx` plus `layoutId` pills and
  the `(member)/template.tsx` page transition. Springs, not linear tweens.
  `MotionConfig reducedMotion="user"` must stay in `Providers`.
- **Logo:** `espenxa.` in mid grey, outlined from General Sans Medium in `public/brand/`
  (use `Logo` / `Wordmark`, `kind="light"` on dark or photos); regenerate
  from the font, never hand-type it.
- Companion levels have their own colours: `bronze` to `diamond`.
- **No auto-moving content** (marquees, auto-advancing carousels, looping
  animation). Entrance, hover, drag and scroll-linked motion are fine. The
  chat "typing" dots are the one loop allowed.
- Icons: **Hugeicons** only. No em dashes in copy, comments or docs.

## Content and safety

- Profiles are never real people unless they are real members. Every photo
  in `public/people/` is AI-generated and fictional. Editorial photos of real
  people go only in the editorial slots in `src/lib/photos.ts` (files in
  `public/editorial/`), and only with a licence or signed
  release that allows dating and companionship use (`docs/photo-shoot.md`).
  Cast across the whole continent, not only black Africans.
- Nothing explicit in UI, placeholders or copy. Bookings buy time and company
  for social experiences, never physical contact; say so where money appears.
- Location is always approximate ("about 2 km"), never a precise point.
- Never show simulated payment, refund, payout or verification as real:
  label it (`DevNote`, "simulated").
- Prices, fees, commissions, verification method and legal wording are team
  decisions: leave a marked `TODO(team)` gap and ask.
- Money is integer minor units; format only through `src/lib/format.ts`.
- **Money rules** (agreed 2026-11-18, editable in `/admin/money`, snapshotted
  on each booking): espenxa keeps 10% of what the companion earns, never added
  to the member's price. Member cancels: refund by notice step, the rest to
  the companion minus espenxa's share. Companion cancels: member refunded in
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
