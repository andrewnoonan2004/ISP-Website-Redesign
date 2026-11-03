# Brand and Visual Style Guide

Pitt brand standards as they apply to the Intelligent Systems Program website, checked against the official *University of Pittsburgh Brand Guidelines* PDF (page numbers in brackets). When this guide and a design idea conflict, this guide wins. When something isn't covered here, check the PDF or ask instead of guessing.

Official marks and assets: https://www.brand.pitt.edu/templates-assets

## Typography

| Role | Typeface | Style | Approved substitute |
|---|---|---|---|
| Headlines | Alternate Gothic Compressed Heavy | All caps | League Gothic [24] |
| Subheads | Alternate Gothic Demi | All caps | `TODO: none listed in the PDF; ask` |
| Body and supporting copy | Roboto or Merriweather | Sentence case | — |
| Expressive accent | Instrument Serif Regular | Title case | — |

Rules:

- **Instrument Serif is an accent face only.** It is not suitable for large amounts of copy and must never be used for body copy [25]. Use it in short display moments, typically paired with Alternate Gothic Compressed Heavy (see "Mixed" below).
- Pick one body face per page or component. Don't mix Roboto and Merriweather in the same block of text.
- Alternate Gothic and Alternate Gothic Compressed come from Adobe Fonts (`TODO: Adobe Fonts kit ID`). If the Adobe kit isn't available, use League Gothic for headlines. Do not substitute any other condensed sans.
- Roboto, Merriweather, Instrument Serif, and League Gothic are on Google Fonts and can be self-hosted.
- All-caps headlines and subheads are a brand requirement. Keep body copy in sentence case.
- Keep body line length under about 80 characters. Give Merriweather slightly more line-height than Roboto.

Expressive headline treatments [28]. Use these sparingly to highlight key messages; they should complement the primary typefaces, not overwhelm them [29].

- **Underlined:** Alternate Gothic Compressed Heavy, all caps, tracking 0, left or center aligned, with a heavy underline bar.
- **Mixed:** Alternate Gothic Compressed Heavy in all caps followed by Instrument Serif Regular in title case, both tracking 0.
- **Tracked out:** Alternate Gothic Compressed Heavy, all caps, tracking 200 (`letter-spacing: 0.2em`).

Type inside a box or frame [30]: the outline's stroke should be roughly the width of the type's ascender, with balanced padding (neither cramped nor loose).

Suggested font stacks:

```css
--font-headline: "alternate-gothic-compressed-atf", "League Gothic", sans-serif;
--font-subhead:  "alternate-gothic-atf", sans-serif;
--font-body:     "Roboto", system-ui, sans-serif;
--font-body-alt: "Merriweather", Georgia, serif;
--font-accent:   "Instrument Serif", Georgia, serif;
```

`TODO: confirm the exact Adobe Fonts family names once the kit is set up.`

## Color

RGB and HEX are for digital; CMYK and Pantone (PMS) are for print only [19].

Hierarchy [20]: Pitt Royal and Pitt Gold lead. Secondary colors support them and are used for subheadings and complementary elements that add depth. Accent colors are used sparingly for buttons, icons, infographics, and data visualizations. **No more than four accent colors at once**, except in data visualizations.

### Primary

| Name | HEX | RGB | PMS | CMYK |
|---|---|---|---|---|
| Pitt Royal | `#003594` | 0 53 148 | 661C | 100 75 0 6 |
| Pitt Gold | `#FFB81C` | 255 184 28 | 1235C | 0 31 98 0 |

### Secondary

| Name | HEX | RGB | CMYK |
|---|---|---|---|
| New Sky | `#DBEEFF` | 219 238 255 | 12 2 0 0 |
| Gray | `#C8C9C7` | 200 201 199 | 21 16 18 0 |
| White | `#FFFFFF` | 255 255 255 | 0 0 0 0 |
| Medium Blue | `#00205B` | 0 32 91 | 100 85 5 36 |
| Bronze | `#B87333` | 184 115 51 | 16 63 100 3 |
| Black | `#000000` | 0 0 0 | 0 0 0 100 |

### Accent

| Name | HEX | RGB | CMYK |
|---|---|---|---|
| Golden Haze | `#FFE939` | 255 233 57 | 2 3 88 0 |
| Light Blue | `#66B2E3` | 102 178 227 | 56 15 0 0 |
| Light Green | `#00AD6E` | 0 173 110 | 80 3 78 0 |
| Orange | `#F7911E` | 247 145 30 | 0 52 100 0 |
| Infrared | `#FF5B45` | 255 91 69 | 0 79 74 0 |
| White Peach | `#FFDECD` | 255 222 205 | 0 15 16 0 |
| Merlot | `#770538` | 119 5 56 | 36 100 58 37 |

### Palette flexibility by audience [22]

The PDF shows three mixes. All keep Royal and Gold dominant; they differ in how much secondary and accent color appears.

- **Boldest mix:** accepted and current students, recent alumni. `TODO: confirm the tier's name on p. 22.`
- **Formal:** current faculty and staff, parents, Pitt Health Sciences. Royal and Gold with New Sky, Bronze, Medium Blue, White, Black, plus White Peach and Merlot accents.
- **Subtle:** older alumni and the most formal pieces. Lots of white, with small amounts of New Sky, Gray, Bronze, Medium Blue, Black, plus White Peach and Light Blue accents.

For this site, prospective and current students suggest the bolder mix, while policy and handbook pages suit Formal.

### Design tokens

Define these once and reference them everywhere. Components must not contain raw hex values.

```css
:root {
  /* Primary */
  --pitt-royal: #003594;
  --pitt-gold: #FFB81C;

  /* Secondary */
  --pitt-new-sky: #DBEEFF;
  --pitt-gray: #C8C9C7;
  --pitt-white: #FFFFFF;
  --pitt-medium-blue: #00205B;
  --pitt-bronze: #B87333;
  --pitt-black: #000000;

  /* Accent */
  --pitt-golden-haze: #FFE939;
  --pitt-light-blue: #66B2E3;
  --pitt-light-green: #00AD6E;
  --pitt-orange: #F7911E;
  --pitt-infrared: #FF5B45;
  --pitt-white-peach: #FFDECD;
  --pitt-merlot: #770538;
}
```

### Contrast reference

Approximate WCAG 2.x contrast ratios (not from the brand PDF). AA requires 4.5:1 for normal text and 3:1 for large text (24px+, or 18.66px+ bold). Verify any new pairing with a contrast checker.

| Text / foreground | Background | Ratio | Use for text? |
|---|---|---|---|
| Pitt Royal | White | ~10.8:1 | Yes |
| Medium Blue | White | ~15.5:1 | Yes |
| Merlot | White | ~11.3:1 | Yes |
| Pitt Royal | New Sky | ~9.1:1 | Yes |
| White | Pitt Royal | ~10.8:1 | Yes |
| Pitt Gold | Pitt Royal | ~6.3:1 | Yes |
| Pitt Royal | Pitt Gold | ~6.3:1 | Yes |
| Golden Haze | Pitt Royal | ~8.8:1 | Yes |
| Pitt Gold | Black | ~12:1 | Yes |
| Bronze | White | ~3.8:1 | Large text only |
| Infrared | White | ~3.1:1 | Large text only |
| Light Green | White | ~2.9:1 | No |
| Light Blue | White | ~2.3:1 | No |
| Orange | White | ~2.3:1 | No |
| Pitt Gold | White | ~1.7:1 | No |
| Gray | White | — | No (decorative or borders only) |

Light accents (Gold, Golden Haze, Light Blue, Light Green, Orange, White Peach) work as fills, icons, rules, and button backgrounds with dark text, not as text on light backgrounds.

## Logos and marks

- **Use only official marks** from brand.pitt.edu. Custom logos, or marks not created by University Communications and Marketing (UCM), are not supported [55].
- **The Institutional Mark must stand alone.** Don't combine it with other marks, and don't alter it or add graphic elements to it [56].
- **Minimum size:** 220px wide on screen (1.25" in print) [59].
- **Unit lockups (e.g. "Intelligent Systems Program" with the shield) are made only by UCM.** If the ISP doesn't have one, request it through UCM's design request form; never build one in HTML/CSS/SVG [61, 65]. Until it exists, use a clearly labeled placeholder.
- **When using the informal "Pitt" wordmark**, make sure "University of Pittsburgh" also appears prominently on the page, because audiences outside the region may not know "Pitt" [65].
- **Do not use the Pitt Script / Spirit Mark on the website.** It belongs to Athletics; academic units may use it on merchandise only, not in marketing or communications [55, 67].
- Co-branded headers with partners use Roboto Bold for names, separated by hairline dividers [76–77].

## Graphic elements

The Pitt Shield Pattern, nodes, and textures come from official files. **Do not recreate, redraw, trace, or modify them**, including in SVG, CSS, or canvas [35]. If you need a variant that doesn't exist, ask. Frames are the exception: they are plain outlined rectangles and may be built in CSS (see Frames).

### Pitt Shield Pattern

Derived from the grid at the heart of the Pitt shield [35]. Files: `pitt-shield-pattern.png`, `pitt-shield-pattern_tab.png` (small "tab" version for use beside a headline), `pitt-shield-pattern.pdf`.

### Nodes [36–37]

Single nodes are building blocks from the shield grid. Use them to highlight key information or add energy; they anchor body copy without overpowering it. Multi-node elements can frame type or photos and can sit in one, two, or all four corners.

Spacing and scale:

- The largest node in a layout must be no more than 250% the size of the smallest.
- Keep elements at least one node's size away from the headline.
- Next to subhead or body copy, the text's cap height must not exceed the height of the node graphic.
- Keep nodes at least one node's size from the edge of the image or layout.

### Frames [39–40]

Thick-line frames highlight text, photos, and callouts and create a focal point. Stacked frames add depth and hierarchy and must be offset at 45-degree angles. Tight stacks focus on a single element; wider stacks can show multiple images.

Building frames in CSS: use solid borders in approved colors only. Around type, set the border width to roughly the width of the type's ascender, with balanced padding [30]. For stacks, offset each layer by equal x and y amounts so the stack steps along a 45-degree line.

### Textures [41–42]

- **Paper texture:** apply at **30% opacity** to keep it subtle. `texture-royal.webp` and `texture-gold.webp` appear to be the paper textures on Royal and Gold. `TODO: confirm.`
- **Grid texture:** a fine grid over Royal, as seen on the PDF's section divider pages. `TODO: confirm usage rules on p. 42.`

### Web usage

- These elements are decorative: use `alt=""` or `aria-hidden="true"`.
- One featured graphic element per section is usually enough.
- They must not overlap text in a way that reduces readability or contrast.

## Voice and messaging

Brand personality [7, 9]: **inquisitive, transformative, approachable, collaborative, determined.** Write ISP copy that sounds like this, but don't paste the brand's internal pillar language directly into site copy; the PDF says it isn't for use in communications [9].

### Taglines

- **"It's Possible at Pitt"** is the University's belief statement and is intended for broad use at the school, unit, and division level [16–17]. It's fine on this site. Use the official "It's Possible at Pitt" digital screen files rather than typesetting your own version. `DigitalScreen01`–`08_1920x1080.jpg` in the project appear to be these screens. `TODO: confirm.` Keep the apostrophe and capitalization exactly.
- **"Hail to Pitt" / "H2P"** is a fight song and rallying cry rooted in Pitt athletics that fosters camaraderie [15]. Reserve it for community content (events, celebrations), not program or admissions copy.
- **"Hail to Possible"** is the University's creative platform and is **reserved for UCM**. Schools and units must not create "Hail to Possible" campaigns on their own [16]. Do not use it on this site without UCM approval.

Do not write new slogans or variations of these taglines.

## Brand questions

Pitt's Brand Questions Submission Form is linked from the PDF's table of contents and back pages.
