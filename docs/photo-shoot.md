# espenxa photoshoot brief

The public site uses editorial photos only. Every slot is listed in
`src/lib/photos.ts`; swap a `src` and the site updates.

## Non-negotiables

- **Signed model release for every person**, explicitly allowing use on a
  dating and paid-companionship platform, online and in ads, in all 55
  African Union countries. Keep the releases on file.
- **No real person is ever shown as a member or companion profile.** Models
  appear in banners and editorial blocks only.
- Adults only, and every model visibly 25 or older.
- Nothing suggestive: daywear and evening wear, public places, no beds, no
  hotel rooms, no swimwear close-ups.

## Photo style

This decides how the site feels more than anything in the code. Aim for a
calm fashion catalogue, not a dating app:

- **Bright and soft.** Daylight or large soft studio light. No night scenes,
  neon or heavy background blur. Low contrast, gentle shadows.
- **Neutral colour.** Warm off-white, beige, stone, sand and muted clay
  backdrops and wardrobe. Avoid saturated reds, purples and busy patterns.
- **Room around people.** Full-length or three-quarter framing with plenty
  of empty background. Faces never fill the frame. Leave clear space on one
  side for a headline.
- **One or two people per shot**, relaxed and natural, often looking away
  from the camera. Real plans: a café table, a gallery, a street, a garden.
- **Consistent grade across the set**: the same warm, slightly faded tone,
  so every tile and banner looks like one shoot.
- Supply each hero and banner in two crops: wide (16:9) for desktop and
  tall (4:5) for phones.

## Who to cast

Africa, not one Africa. Aim for at least two people from each group below
across the set, women and men, a range of ages (25 to 55), body types and
skin tones:

- North Africa: Moroccan, Algerian, Tunisian, Egyptian, Libyan (Arab and
  Amazigh)
- West Africa: Nigerian, Ghanaian, Senegalese, Ivorian
- East Africa and the Horn: Kenyan, Ethiopian, Somali, Eritrean, Rwandan
- Central Africa: Congolese, Cameroonian
- Southern Africa: South African (Black, white, Indian and Coloured),
  Zimbabwean, Namibian
- Island nations: Mauritian, Malagasy

## Shot list

| Slot | Use | Orientation and size | Brief |
|---|---|---|---|
| `hero[0..2]` | Homepage hero, three side by side on desktop, first one alone on phones | Portrait 4:5, at least 1600 × 2000 | One person each, warm natural light, a city setting (rooftop, street, café). Subject in the upper half so the headline sits clear below. |
| `plan` | "Plan first, pay later" | Portrait 4:5, 1600 × 2000 | Two people talking over coffee in a bright café, relaxed and fully clothed. |
| `members` | "For members" tile | Portrait 5:6, 1600 × 1920 | Friends laughing at an outdoor table. |
| `companions` | "For companions" tile | Portrait 5:6 | One person dressed for an evening event, confident, looking off camera. |
| `safety` | Safety block | Portrait 4:5 | Someone walking through a busy public square or market in daylight. |
| `experiences.*` | Eight square tiles: dinner, coffee, events, concerts, travel, sightseeing, outdoors, weddings | Square 1:1, 1200 × 1200 | One scene per plan, on a light neutral background where possible. |
| `gate` | Age check banner | Five portraits, 1:2 strips | Head and shoulders, neutral backgrounds. |

Deliver as high-quality JPEG; we convert to WebP. Name files by slot, for
example `hero-1.jpg`, and note each model's release reference.
