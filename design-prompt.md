# Design Improvement Prompt — LinkProMedia

Copy everything below the line into a fresh AI coding session opened at this repository.

---

Act as a senior product designer who has redesigned news products for large-scale digital publishers (think Kompas, Tempo, Reuters, The Guardian). You are working inside an existing, fully functional Indonesian news site. Your job is **visual and editorial design craft only** — not new features.

## The product

LinkProMedia is an Indonesian news publisher. Readers arrive from search and social, scan fast, and leave fast. The design must make a reader understand *what matters right now* within three seconds of landing, and make long articles genuinely comfortable to read.

## Stack and where things live

- Next.js 15 App Router, React 19, Tailwind CSS **v4**, TypeScript.
- Design tokens are defined with `@theme inline` in `src/app/globals.css`. Read this file first.
- Public pages: `src/app/(public)/` — homepage, `berita/[slug]`, `kategori/[slug]`, `topik/[slug]`, `cari`, `kronologi`, `penulis/[slug]`, `bookmark`, `riwayat-baca`.
- Layout components: `src/components/layout/` — `Header`, `Footer`, `Logo`, `BreakingTicker`, `ThemeToggle`, `NewsletterForm`, `PrivacyNotice`.
- Article components: `src/components/article/` — `ArticleCard`, `ArticleSummaryBox`, `TrendingList`, `ForYouSection`, `NewsTimeline`, `LiveUpdateTimeline`, `ReadingProgress`, `FontSizeControl`, `TextToSpeech`, `BookmarkButton`.
- UI is in **Bahasa Indonesia**. Keep it that way. Code comments in this project are also written in Indonesian — match that.

## Brand — fixed, do not redefine

| Token | Hex | Role |
|---|---|---|
| `primary-600` | `#0C447C` | Navy. Header, footer, primary buttons, dominant brand surface |
| `primary-500` | `#185FA5` | Links, interactive text |
| `accent` | `#F0A400` | Yellow. Badges ("Breaking News", "LIVE") and small highlights **only** |
| `accent-text` | `#412402` | Text on yellow |
| `surface` | `#F7F8FA` | Page/card background |
| `heading` | `#1A1D29` | Headlines and body headings |
| `text-muted` | `#5F5E5A` | Metadata, captions |
| `divider` | `#E2E5EB` | Borders |

The logo mark lives at `/logo-mark.png` (monogram, transparent, works on light and dark) and the full stacked logo at `/logo.png`. Brand references: `linkpromedia-brand-guidelines.md`, `linkpromedia-color-palette.md`.

Yellow is an accent, not a theme colour. If yellow starts covering large areas, you have gone wrong.

## What to improve

Work through these in order. Treat each as a design problem, not a CSS chore.

**1. Homepage hierarchy.** Right now every story competes for attention. Establish a clear editorial ladder: one lead story that unmistakably reads as the most important thing today, a secondary tier, then the scan-able river. Decide deliberately what earns a large image, what gets a headline only, and what becomes a compact list. Density is a design decision — a news homepage should feel dense but not noisy.

**2. Breaking and live treatment.** `BreakingTicker` and the `isBreaking` / `isLive` flags need visual language that conveys urgency without shouting. Consider motion restraint, badge shape, and how a breaking item interrupts the normal grid. A permanent red-alert aesthetic desensitises readers — urgency must be reserved to stay meaningful.

**3. Headline typography.** This is the single highest-leverage change on a news site. Establish a real type scale for headlines, decks, and metadata — with intentional weight, tracking, and line-height at each step. Consider a distinct display face for headlines against the current sans for body. Headlines should have tighter tracking and line-height than body text.

**4. Article reading experience** (`berita/[slug]`). Set a comfortable measure (roughly 65–75 characters per line), a body size and line-height suited to long reading, and clear rhythm between paragraphs, subheadings, images, captions, and pull quotes. Make figure captions and photo credits look like editorial furniture, not afterthoughts. `FontSizeControl` must keep working across whatever scale you introduce.

**5. Category identity.** Categories currently look interchangeable. Give each a subtle, systematic visual signal (a colour accent derived from the brand palette, applied consistently on cards, category pages, and article headers) so a reader can tell sections apart at a glance without reading labels.

**6. Cards and grid rhythm.** `ArticleCard` appears everywhere. Design a small set of deliberate variants (hero, standard, compact, list-row) rather than one card stretched to every context. Unify spacing, image aspect ratios, and metadata treatment across them.

**7. Time and freshness signals.** News lives on recency. Make timestamps, "diperbarui" markers, and live-update indicators legible and consistent everywhere they appear.

**8. Empty, loading, and error states.** `bookmark`, `riwayat-baca`, `cari` with no results, and the offline page should feel designed and reassuring, not broken.

## Hard constraints

- **Dark mode must keep working.** This project overrides Tailwind utility classes explicitly under `:root[data-theme="dark"]` in `globals.css`, because `@theme inline` copies token values into the CSS output — overriding the CSS variable alone does **not** work. Any new token or utility you introduce needs an explicit dark-mode rule, or it will silently break in dark theme. Verify both themes for every change.
- **Contrast: WCAG AA minimum** — 4.5:1 for body text, 3:1 for large text (≥18.66px bold or ≥24px). Measure it, do not eyeball it. This codebase has already shipped a 2.54:1 failure that looked fine at a glance.
- **Do not break existing functionality.** Dark mode toggle, font size control, text-to-speech, reading progress, bookmarks, reading history, language switcher, PWA install, and push notifications all currently work. Design around them.
- **Performance.** Preserve LCP and CLS behaviour: the header logo uses `priority`, and `ForYouSection` is server-rendered specifically to avoid layout shift. Give every image an explicit aspect ratio. Do not add heavy webfonts without weighing the cost — subset and preload if you add one.
- **Mobile first.** Most readers are on phones over uneven connections. Design the small screen first and make sure tap targets are at least 44px.
- **No new dependencies** without saying why the change is impossible without them.

## How to work

Go in **small, reviewable batches** — one area at a time, not a full redesign in one pass. For each batch:

1. Say what is weak about the current design and why it hurts a news reader specifically.
2. Make the change.
3. Verify it in a real browser at mobile and desktop widths, in **both** light and dark themes.
4. Report contrast ratios for any new colour pairing.

Show your reasoning about hierarchy and restraint. If something in the existing design is already working well, say so and leave it alone — churn is not improvement.
