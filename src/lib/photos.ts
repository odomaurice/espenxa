/*
 * Every editorial image slot on the public site, in one place.
 *
 * TODO(team): replace each `src` with the photoshoot images. Rules:
 * - Real people only with a signed model release that explicitly allows use
 *   on a dating and paid-companionship platform, in every country we run in.
 * - Never present a model as a member or companion profile. Editorial only.
 * - Cover the whole continent: North (Arab, Amazigh), East (including
 *   Ethiopian, Somali, Eritrean), West, Central and Southern Africa,
 *   including white, Indian and mixed-heritage Africans. See
 *   docs/photo-shoot.md for the shot list.
 *
 * Profiles (everything in the app) always stay fictional. Real people appear
 * only in these editorial slots, never with a name, age, price or rating.
 */
export type PhotoSlot = { src: string; alt: string; /** CSS object-position for the crop. */ focus?: string };


/**
 * Preview only: stock photos the team supplied (public/editorial, web-size
 * copies of the files in public/people). Real people, so editorial use only.
 * TODO(team): confirm the licence allows use on a dating and
 * companionship platform before launch, or replace with the photoshoot.
 */
const stock = (id: string, alt: string, focus = "50% 30%"): PhotoSlot => ({ src: `/editorial/${id}.webp`, alt, focus });

export const PHOTOS = {
  /** Hero: two photos side by side on desktop; the first one alone on phones. */
  hero: [stock("bridge", "A woman in a green outfit on a city bridge", "50% 22%"), stock("autumn", "A man sitting among dried grasses", "50% 40%"), stock("studio", "A man in a knitted jumper")],
  /** "Plan first, pay later" editorial block. */
  plan: stock("phone", "A woman smiling on a phone call in the street", "50% 30%"),
  /** Two-up promo tiles. */
  members: stock("coat", "A woman in a yellow coat smiling", "50% 25%"),
  companions: stock("hat", "A man in a hat and leather jacket", "50% 20%"),
  /** Safety block. */
  safety: stock("denim", "A woman in a denim jacket in the city", "50% 25%"),
  /** One square photo per experience tile. */
  experiences: {
    dinner: stock("pink", "Dressed for dinner", "50% 20%"),
    conversation: stock("smile", "Relaxed and smiling", "50% 20%"),
    events: stock("yellow", "Dressed for an event", "50% 25%"),
    concerts: stock("red", "Ready for a night out", "50% 25%"),
    travel: stock("autumn", "A day away", "50% 35%"),
    sightseeing: stock("shawl", "Exploring a new place", "50% 20%"),
    outdoors: stock("denim", "Out in the city", "50% 25%"),
    gatherings: stock("green", "Dressed for a celebration", "50% 25%"),
  },
  /** Age gate banner strip. */
  gate: [stock("pink", "", "50% 20%"), stock("autumn", "", "50% 30%"), stock("green", "", "50% 25%"), stock("smile", "", "50% 20%"), stock("bridge", "", "50% 20%")],
} as const;

/**
 * "Popular plans" carousel: an editorial photo, a plan and a city. Never a
 * name, age, price or rating next to a real person's photo, so no model is
 * presented as someone you can book.
 */
export const PLANS = [
  { photo: stock("coat", "A woman in a yellow coat smiling", "50% 25%"), title: "Rooftop dinner", city: "Lagos", country: "NG", tag: "Popular" },
  { photo: stock("shawl", "A woman in a patterned shawl", "50% 20%"), title: "Medina walk and mint tea", city: "Marrakech", country: "MA", tag: "New" },
  { photo: stock("hat", "A man in a hat and leather jacket", "50% 20%"), title: "Live jazz night", city: "Johannesburg", country: "ZA", tag: "" },
  { photo: stock("phone", "A woman smiling on a phone call", "50% 25%"), title: "Coffee and a long chat", city: "Nairobi", country: "KE", tag: "Popular" },
  { photo: stock("studio", "A man in a knitted jumper", "50% 25%"), title: "Gallery afternoon", city: "Accra", country: "GH", tag: "" },
  { photo: stock("bridge", "A woman in green on a city bridge", "50% 20%"), title: "Plus-one for a wedding", city: "Abuja", country: "NG", tag: "" },
  { photo: stock("smile", "A man smiling in a warm studio", "50% 20%"), title: "Football and dinner", city: "Kigali", country: "RW", tag: "New" },
  { photo: stock("denim", "A woman in a denim jacket in the city", "50% 25%"), title: "Weekend in Cape Town", city: "Cape Town", country: "ZA", tag: "" },
] as const;
