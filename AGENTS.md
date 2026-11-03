# AGENTS.md

Instructions for AI coding agents working in this repository.

## Project overview

This is the website for the **Intelligent Systems Program (ISP)** at the **University of Pittsburgh**. The audience is prospective and current graduate students, faculty, researchers, and partners. The site must follow Pitt's brand standards and be fully accessible.

The full brand and visual style guide lives in [`docs/BRAND.md`](docs/BRAND.md). **Read it before making any change that affects layout, typography, color, imagery, or copy.** The most important rules are summarized below.

## Tech stack

<!-- TODO: fill in -->
- Framework: `TODO`
- Styling: `TODO` (design tokens are defined in `TODO: path/to/tokens.css`)
- Package manager: `TODO`
- Hosting / deployment: `TODO`

## Commands

<!-- TODO: replace with real commands -->
```bash
TODO install   # install dependencies
TODO dev       # start local dev server
TODO build     # production build
TODO lint      # lint and format check
TODO test      # run tests
```

Run lint and build before considering a task complete. If either fails, fix the problem rather than disabling the rule or check.

## Project structure

<!-- TODO: adjust to match the repo -->
```
/docs            Project documentation, including BRAND.md
/public/brand    Official Pitt brand assets (marks, shield pattern, nodes, textures, digital screens) — do not edit
/src             Application source
```

## Brand rules (summary)

These are non-negotiable. Details and rationale are in `docs/BRAND.md`.

1. **Use only the approved fonts and hierarchy.** Headlines: Alternate Gothic Compressed Heavy, all caps (League Gothic is the only approved substitute). Subheads: Alternate Gothic Demi, all caps. Body: Roboto or Merriweather, sentence case. Instrument Serif is for short display moments only, **never body copy**.
2. **Use only the approved colors**, referenced through the design tokens. Never hard-code hex values in components, and never introduce new colors or tints.
3. **Pitt Royal (`#003594`) and Pitt Gold (`#FFB81C`) are the primary palette.** Secondary colors support them; accent colors are for small elements only.
4. **No more than four accent colors on screen at once**, except in data visualizations.
5. **Never recreate, redraw, or modify the Pitt Shield Pattern, nodes, or textures** in SVG, CSS, or canvas. Use the official files in `/public/brand`. If a needed asset is missing, stop and ask. (Frames are plain outlined rectangles and may be built in CSS; see `docs/BRAND.md`.)
6. **Never build or alter University marks in code.** Use the official Institutional Mark files (minimum 220px wide). A program lockup comes only from University Communications and Marketing; use a labeled placeholder until it exists. Never use the Pitt Script / Spirit Mark.
7. **Don't use "Hail to Possible"** in any copy. It is reserved for central University Communications and Marketing.
8. **Never place Pitt Gold or any light accent color as text on a white or light background.** It fails contrast. See the contrast table in `docs/BRAND.md`.
9. **Web uses HEX/RGB only.** Pantone and CMYK values in the guide are for print.

## Accessibility

Target **WCAG 2.1 AA** at minimum on every page.

- All text must meet AA contrast (4.5:1 normal text, 3:1 large text). Check against the table in `docs/BRAND.md`; don't eyeball it.
- Every image needs meaningful `alt` text, or `alt=""` if purely decorative. Brand pattern, node, and frame graphics are decorative.
- Keyboard focus must always be visible. Don't remove outlines without a visible replacement.
- Respect `prefers-reduced-motion`.
- Use semantic HTML (real headings in order, `<nav>`, `<main>`, `<button>` for actions, `<a>` for navigation).
- Pages must work down to a 320px-wide viewport.

## Content and voice

- Write plainly and specifically for prospective students and researchers. Prefer active voice and sentence case.
- Buttons and links say exactly what they do ("Apply to the PhD program", not "Learn more" or "Click here").
- Do not invent facts about the program: faculty names, degree requirements, deadlines, funding, rankings, or statistics. Use clearly marked placeholders (`TODO: confirm`) and flag them.
- Use the taglines "It's Possible at Pitt" and "Hail to Pitt" / "H2P" only where the brand guide allows and only when asked. Do not write new taglines.

## Working rules

**Always**
- Reuse existing components and tokens before creating new ones.
- Keep changes scoped to the task. Mention unrelated issues you notice rather than fixing them silently.
- Summarize what you changed and anything left as `TODO` when you finish.

**Ask first**
- Adding a dependency.
- Changing design tokens, global styles, or the site's navigation structure.
- Adding a new font file or a new brand asset.

**Never**
- Edit files in `/public/brand`.
- Commit secrets, API keys, or `.env` files.
- Use stock photos or AI-generated imagery as a stand-in for real Pitt people or places without labeling it as a placeholder.
- Disable lint rules, type checks, or tests to make a build pass.
