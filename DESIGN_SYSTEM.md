# Aeon Scorer — Visual Design System

This file is the source of truth for future UI work. It intentionally keeps the product visually restrained so new features do not drift back toward generic dashboard styling.

## Product character

Aeon Scorer should feel like a **serious analysis instrument for Commander players**, not an admin template and not a fantasy-themed Magic fan page.

- dark, calm, technical;
- premium without decorative excess;
- understandable before impressive;
- one strong purple accent, not rainbow status colors;
- metrics are the visual hierarchy, diagnostics are secondary.

## Language policy

- **English is the first-visit default** across navigation, analyzer, results, diagnostics, public pages, metadata and footer.
- French is available through the persistent **EN / FR** switch.
- Never mix untranslated French UI copy into the English view or vice versa, except established Magic terms and proper card names.
- The document `lang` attribute and page metadata must follow the selected language.
- Commander Brackets and Aeon Score are different concepts: copy must never imply that Aeon replaces the five official Commander Brackets.

## Typography

- Primary family: **Manrope**.
- Code/decklist editor: system monospace.
- Headlines use tighter tracking and moderate weight rather than extreme boldness.
- Numeric output uses tabular figures where alignment matters.
- **11 px is the absolute minimum for intentionally visible UI text.** Most microcopy should sit at 12–14 px.
- Navigation subtitle, calibration proof, commander support notes, diagnostics and footer text must remain comfortably readable.
- Never use browser-default blue links.

## Color tokens

- Background: `#08080c`
- Surface: `#111117`
- Raised surface: `#15151d`
- Border: `#262631`
- Primary text: `#f7f6fb`
- Secondary text: `#9995a6`
- Accent: `#967CE1`
- Accent highlight: `#b59ff0`

Purple is for focus, selected states and the power result. It should not fill every component.

## Layout rules

- Main content max width: 1180 px.
- Prefer large structural spacing over many nested cards.
- One clear container per task.
- Cards: 18–24 px radius only for major surfaces; controls use ~10–12 px.
- Avoid stacking bordered boxes when whitespace can establish hierarchy.
- Mobile layouts collapse structurally instead of merely shrinking desktop UI.

## Dashboard hierarchy

The public result must answer this in order:

1. **Median power**
2. **Low output / P20**
3. **High output / P80**
4. **Peak**

The visual distribution bar is allowed because it makes those four values easier to compare. Coverage, commander dependency, dimensions, packages and drivers belong in the detailed diagnostic unless they represent a warning.

## Forms

- Labels stay above controls.
- Primary action is visually unique.
- Optional expert inputs belong under progressive disclosure (`Advanced options` / `Options avancées`).
- Deck size feedback is visible beside the decklist label.
- Focus states must be visible and use the accent color sparingly.

## Motion

- 120–180 ms transitions only.
- Small hover lift is acceptable on primary CTA or external button.
- No looping gradients, floating blobs, parallax or ornamental motion.

## Anti-patterns

Do not reintroduce:

- raw browser links;
- several competing purple gradients;
- huge hero copy that pushes the actual tool below the fold;
- a card for every sentence;
- full-width statistics with no decision value;
- tiny low-contrast text used for important information;
- visible text below 11 px;
- mixed-language UI in one selected locale;
- ambiguous “power level 7” wording that can be confused with Commander Brackets;
- unrelated icon libraries merely for decoration;
- personal-deck cohort as a public calibration reference.

## Accessibility baseline

- Interactive targets should be roughly 40–44 px when practical.
- Focus states remain visible.
- Do not communicate warnings by color alone.
- Maintain readable contrast for labels and body text.
- Horizontal diagnostic tables may scroll on small screens rather than compressing columns into illegibility.
