# Service Proof Loop — visual system

## Direction

**Glacial minimal ceramics** treats each completed visit like a clean ceramic
tray: evidence is placed with care, the client leaves one clear mark, and that
mark moves to the next tray. The interface is calm and pale, but never clinical.
Thin cobalt rules, fired-clay chips, soft ice surfaces, and one warm apricot
signal create a recognisable operational tool rather than a generic SaaS page.

The landing layout is deliberately asymmetric. The job and action sit on the
left while a cutaway ceramic "proof loop" occupies the right. Product screens
use a wide workbench with a narrow visit rail and a large evidence sheet.

## Tokens

| Role | Token | Value | Reason |
| --- | --- | --- | --- |
| Ice background | `--ice` | `#f2f7f6` | Glacial daylight without pure-white glare |
| Porcelain surface | `--porcelain` | `#fffdfa` | Warm ceramic body |
| Deep ink | `--ink` | `#172a30` | 13.4:1 on porcelain |
| Muted ink | `--slate` | `#52676c` | 5.8:1 on porcelain |
| Cobalt | `--cobalt` | `#155b72` | Fired glaze; action and focus |
| Dark cobalt | `--cobalt-deep` | `#0c4052` | Hover and high contrast |
| Apricot | `--apricot` | `#d9683b` | Human feedback and pending work |
| Moss | `--moss` | `#386d55` | Accepted and complete states |
| Rust | `--rust` | `#9d3e35` | Problems and destructive actions |
| Hairline | `--line` | `#cad9d7` | Ceramic edges and dividers |
| Night ice | `--night` | `#10252b` | Dark treatment for footer/demo rail |

Dark mode inverts the workbench to night ice, uses `#17323a` surfaces,
`#f1f7f5` text, `#a8bdc0` muted text, and `#72b6c8` cobalt. Both treatments
keep body text above 4.5:1.

## Type

- Display: **Georgia**, with a compact serif fallback. Its tapered strokes feel
  hand-shaped and make the product distinct without a font download.
- Body and controls: **Arial**, `system-ui`, sans-serif. It stays plain at crew
  sizes and keeps the first load small.
- Numbers use `font-variant-numeric: tabular-nums`.
- Scale: 16, 18, 23, 32, 48, 64 px. Body line-height is 1.55; reading measure
  stops at 68 characters.

## Space and shape

- An 8 px base rhythm: 8, 16, 24, 32, 48, 64, 96.
- Controls are at least 44 px high with 12 px corner radii.
- Proof sheets use an uneven `24px 10px 22px 12px` radius, like hand-thrown
  ceramic slabs. Pills are reserved for state only.
- Fine 1 px lines group related evidence before boxes are introduced.

## Interaction and motion

The signature motion is a **loop transfer**: when a client approves an extra,
the item briefly lifts and settles toward the next-visit area using only
`transform` and `opacity` over 220 ms. Navigation fades over 160 ms. Evidence
previews expand from their source. Nothing moves continuously.

With `prefers-reduced-motion: reduce`, transfer and navigation are instant and
all smooth scrolling is disabled. State, labels, and focus never depend on
motion.

## Asset plan and prompt sheet

One original editorial hero shows two linked porcelain trays: a finished-visit
tray holding abstract checklist marks and photo tiles, connected by a cobalt
glaze channel to a next-visit tray holding one apricot task chip. It explains
the product loop without pretending to show a screenshot.

**Prompt:** “Editorial still life, two linked hand-thrown porcelain trays viewed
at a gentle three-quarter angle, left tray holds small blank photographic tiles
and subtle checklist impressions, a thin cobalt glazed channel curves into the
right tray containing one warm apricot clay task token, pale glacial blue-gray
studio floor, diffuse northern daylight, quiet ceramic texture, restrained
shadows, minimal composition, premium utility editorial photography, palette
of ice, porcelain, deep teal, cobalt, apricot, no people, no text, no letters,
no logos, no watermark, no brands, no UI screenshot, no gradient blobs.”

Output is reviewed for malformed edges, stray text, logos, and misleading UI.
The selected image is stored as WebP (and JPEG social fallback), with explicit
dimensions. Generated with the factory image model on 2026-08-28. The image is
original product art; the footer discloses that it is generated.

Hand-authored SVG marks cover the wordmark, status glyphs, favicon, and 404
illustration. They share the cobalt glaze stroke and contain no third-party art.

## Content voice

Use “visit,” “proof,” “client,” “extra,” and “next visit” everywhere. Avoid
portal, ticket, workflow, job card, and response packet. A cleaner should know
what each button does without learning product language.
