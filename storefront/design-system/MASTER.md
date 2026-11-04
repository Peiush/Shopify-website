# HYPEFORGE Design System (Master)

The single source of truth for every storefront page. Page-specific deviations go in
`design-system/pages/<page>.md`; if none exists, this file wins.

## Direction
Light **street-brutalism**: warm off-white paper, deep navy ink, brick-red and mustard-gold
pops. Hard navy outlines and offset shadows, sticker graphics, taped labels, hand-built SVG
illustration. Loud, but every page stays scannable and shoppable.

## Tokens (`app/styles/tailwind.css`)
Token names are semantic (they predate the light theme): `ink` = background, `bone` = text.
| Token | Value | Use |
|---|---|---|
| `ink` / `ink-2` / `ink-3` | #F4F1EC / #FFFFFF / #DDD6CC | Page, cards, subtle borders |
| `bone` | #18214D (navy) | Text, hard shadows, dark tape |
| `mute` | #5D6280 | Secondary text |
| `body` | #353C5E | Long-form paragraph text |
| `volt` | #C62F28 (brick red) | Pop 1: CTAs, active states, highlights |
| `on-volt` | #FFFFFF | Text/icons on a volt fill |
| `heat` | #EFB43F (mustard gold) | Pop 2: stickers, labels (navy text on it) |
| `edge` | #18214D | Outlines on stickers, tapes, badges |
| emerald-600/700 | Tailwind default | Positive status only (in stock, free shipping) |
| `font-display` | Anton | Headlines, uppercase, tight leading |
| `font-sans` | Space Grotesk | Body, UI, labels |

All pairs pass WCAG AA (red as text 4.9:1, white on red 5.5:1, navy on gold 8.3:1).

## Building blocks (`app/components/PageKit.tsx`)
- **PageHero**: breadcrumb, eyebrow, split-letter title, outlined background word, optional art.
- **Eyebrow**: 12px, bold, 0.3em tracking, uppercase, volt (or heat for urgency).
- **Brutal card**: `border-2 border-ink-3 bg-ink-2`, hover `border-volt shadow-brutal-volt`.
- **Primary button**: `.btn-volt` + `shadow-brutal`; secondary is a 2px bone outline.
- **EmptyState**: illustration + one sentence + two actions. Never a blank screen.
- **TrustRow**: Verified / 48h dispatch / 30-day returns with line icons.

## Motion rules (GSAP, `app/lib/gsap.ts`, `usePageMotion`)
- Titles: split chars rise (`[data-split]`). Supporting copy fades up (`[data-hero-fade]`).
- Content: `[data-reveal]` batches fade up once on scroll. Art: `[data-draw]` strokes draw on.
- Micro-interactions 150–300ms; entrances 0.6–1.2s `expo/power3.out`.
- 1–2 hero animations per view. Transform/opacity only.
- `prefers-reduced-motion: reduce` = no motion, everything visible.
- Always `useGSAP({scope})`; never run GSAP during SSR.

## Accessibility
4.5:1 text contrast, visible volt focus ring, 44px touch targets, labelled inputs,
alt text on every product image, SVG icons only (no emoji).
