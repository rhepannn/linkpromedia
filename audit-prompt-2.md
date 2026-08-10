# Audit Prompt v2 — LinkProMedia (Post-Launch)

Conduct a thorough audit of the LinkProMedia website (Next.js 15 news CMS), now **live in production** at `https://media.linkproductive.com` (Vercel Hobby, push to `main` = release). This audit supersedes `audit-prompt.md`: several features were removed since then (Live Update Article, Morning Briefing, standalone AI Newsroom Assistant) — do not audit those. Report findings using this format:

```
[Severity: Critical/High/Medium/Low] [Area] Finding title
Description of the issue
Related file: path
Fix recommendation
```

---

## 0. Production / Deployment (new — highest priority)

- [ ] **Domain & env consistency**: robots.txt, sitemap, RSS, OG tags, canonical, share links all reference `https://media.linkproductive.com` — no leftover `*.vercel.app` or `localhost` URLs anywhere in rendered output
- [ ] **Vercel Hobby constraints respected**: every AI route that chains calls has `maxDuration = 60` (Hobby maximum — never raise); cron schedule is daily-only (`0 0 * * *`); no feature silently depends on longer timeouts
- [ ] **CRON_SECRET**: verify whether it is set — if unset, `/api/cron/*` responds 200 to the public. Confirm handlers are idempotent either way
- [ ] **Security headers in production**: CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy — check the live domain, not just next.config
- [ ] **Secrets hygiene**: no API keys in client bundle (`NEXT_PUBLIC_*` audit), `.env*` gitignored, no keys committed in history since last audit, server-only keys (GROQ, TAVILY, SUPABASE_SERVICE_ROLE, VAPID private) never reach the browser
- [ ] **Build reproducibility**: `npm run build` passes from clean state; no build-time dependency on runtime env values that could break a Vercel deploy (e.g. URL parsing of unset vars)

## 1. AI Newsroom (heavily changed — audit deeply)

- [ ] **ChatBot page** (`/admin/chatbot`): full-page layout without sidebar/navbar, message history, loading animation, works for every role that can log in
- [ ] **Intent router** (`klasifikasiIntent`): each intent reachable by natural phrasing; free-topic article requests still refused (`belum-tersedia`) — try to bypass with rephrasing ("tuliskan berita tentang…", "buatin konten soal…"); refusal enforced in route code, not only in the prompt
- [ ] **News discovery (RSS)**: topics grouped correctly, "sudah kita liput" matching not over-eager (≥2 keyword rule), catch-all topics filtered, feed thumbnails display-only (never uploaded — copyright), covered topics hidden with count reported
- [ ] **Web research (Tavily, `riset-web`)**: official sources flagged RESMI and sorted first; graceful message when TAVILY_API_KEY missing; timeout handling (10s per search); no crash on empty/malformed Tavily response; draft from research keeps per-fact attribution + URLs; code-level backstop injects "read original sources" verification item
- [ ] **Draft writer** (`draftArticleFromSource`, all 6 material types): facts only from supplied material — probe for hallucination by feeding sparse material and checking the draft does not pad; attribution rules per type (kutipan-media, riset-web, siaran-pers); disclaimer-leak stripping; conflicting numbers reported side-by-side, not silently chosen; 5W1H gaps and missing responses land in `perluDiverifikasi`
- [ ] **Draft handoff**: chat → "Buatkan draf" → Artikel Baru form prefilled (title/slug/excerpt/content/category), verification items become editorial notes on first save, never overwrites an existing edit session
- [ ] **Editor AI tools**: headlines, SEO, summary (Inti Berita), variants, tags, grammar, category, internal links, duplicates, thumbnail suggestion, breaking assessment, timeline, translate, fact-check, writing review — each returns structured output and applies to the form correctly
- [ ] **Rate limiting**: `/api/admin/ai/*` centrally rate-limited in middleware; verify limits actually trigger

## 2. Studio AI (media generation — new)

- [ ] **Unified panel**: single card with Ilustrasi/Video tabs in the article editor; no leftover standalone illustration button in the Thumbnail card
- [ ] **AI illustration (Pollinations)**: landscape 1200×750 auto-applies as thumbnail; portrait 1080×1350 saves to Media Library without touching the thumbnail; `ai-ilustrasi-` filename prefix; JPEG magic-byte + size validation; scene extracted from headline facts; style prefix locked in code (never photorealistic); people only from behind/silhouette; ethics note shown when thumbnail is AI-made; sensible errors on provider timeout/failure
- [ ] **Video generator**: script compose → human-editable scenes → client-side render; MP4/WebM fallback; progress + cancel; object URL revoked (no memory leak across repeated renders); unsupported-browser message; download naming; "not saved automatically" warning
- [ ] **Media Library**: AI-generated files appear with correct metadata and are distinguishable from uploads; activity log entries for generation

## 3. Reader Interactivity (new)

- [ ] **Reactions** (`ReaksiBar`): anonymous visitor hash (daily-salted, no PII stored), toggle/switch semantics, optimistic UI with rollback, rate limit (30/60s per IP), counts accurate under concurrent clicks, hidden until first GET resolves, 404/400 paths
- [ ] **Breaking ticker**: auto-rotates without clicks; instant swap (not frozen) under `prefers-reduced-motion`; hover/focus pauses; links work
- [ ] **Related articles**: content-based (tag overlap → pg_trgm similarity ≥ 0.05 cross-category → newest fallback) — verify relevance on real articles and query performance
- [ ] **Reduced-motion policy**: global freeze respected, but `.denyut-titik` pulse and ticker rotation exemptions still work — verify on a machine with animations disabled

## 4. Settings / Theming (new)

- [ ] **Settings page** (`/admin/pengaturan`): ADMIN-only (EDITOR/AUTHOR blocked server-side, not just hidden in sidebar); live preview iframe reflects color changes before saving; save persists to `SiteSetting`; reset restores defaults cleanly
- [ ] **Color ramp**: derived 50–800 ramp keeps the measured lightness curve; white-on-600 ≥ 4.5:1 and accent-text-on-accent ≥ 4.5:1 for arbitrary brand colors — test extremes (very light, very dark, neon, low-saturation)
- [ ] **Runtime theming**: `@theme` (not inline) variables actually override at runtime; custom theme `<style id="tema-kustom">` injected in layout; DB failure while reading settings must NOT 500 the public site (falls back to default palette)
- [ ] **Dark mode interplay**: custom colors legible in dark mode; accent-text override doesn't break badges/buttons (regression: Daftar button yellow-on-yellow)

## 5. Function / Features (regression pass)

- [ ] **Auth & RBAC**: login/logout, JWT expiry, role checks server-side on every `/admin` page and API route, direct-URL bypass attempts
- [ ] **Article lifecycle**: CRUD, draft, scheduled publish (timezone), archive, preview token, revisions + rollback, editorial review flow (submit/approve/return), editorial notes
- [ ] **Search**: pg_trgm full-text, filters, empty results, special characters
- [ ] **Categories/Tags/Penulis/Media/Aktivitas**: CRUD + RBAC + empty states; activity list stays digestible (pagination/limit)
- [ ] **Newsletter, Push (VAPID), Bookmark, Reading History, PWA/offline, Personalized homepage, Multi-language, Kronologi**: still functional after the many UI changes
- [ ] **Analytics dashboard**: DailyViewsChart renders with data and with zero data; numbers match PageView rows
- [ ] **Sidebar**: collapse toggle works, state persists, tooltips appear when collapsed, logo-only branding (no "Admin" label)

## 6. UI / UX

- [ ] **Responsive + no horizontal scroll**: mobile/tablet/desktop on homepage, article, category, admin pages, chatbot full-page
- [ ] **Dark mode**: all new components (Studio AI, ReaksiBar, Settings, chatbot cards, riset-web cards with RESMI badge) legible in both themes
- [ ] **Loading/empty/error states**: every new async surface (chat intents, illustration, video render, research) has all three
- [ ] **A11y**: keyboard navigation through new interactive elements (tabs, reaction buttons, ticker), ARIA on tab pills and status messages, focus management in chat
- [ ] **404 and error boundaries**: still styled and helpful

## 7. Database / Schema

- [ ] **New models**: `SiteSetting`, `ArticleReaction` (unique `[articleId, visitorId]`, cascade delete, indexes) — verify constraints in the real DB, not just schema
- [ ] **Leftover columns**: `isLive` / `ArticleLiveUpdate` intentionally kept after feature removal — confirm nothing still reads them in public UI
- [ ] **Pooler discipline**: transaction pooler (6543, pgbouncer) at runtime, session pooler only for schema pushes; retry wrapper covers P1001/P1002/P1017/P2024; graceful degradation when DB is down
- [ ] **Query performance**: pg_trgm related-articles query plan, reaction count queries, N+1 sweep on homepage and article page

## 8. SEO & Distribution

- [ ] **Metadata/Schema.org/sitemaps/RSS/canonical/robots**: valid against the production domain; news-sitemap freshness; noindex on thin content
- [ ] **OG images**: correct on article and home; AI-illustrated thumbnails render properly in link previews
- [ ] **Core Web Vitals**: LCP/INP/CLS on homepage and article page (production), ISR/cache revalidation values still sensible

## 9. Security

- [ ] **Input sanitization**: TipTap HTML (XSS), chat message handling, research topic string (injection into Tavily query), image prompt injection attempts via article title
- [ ] **Upload & AI-generated files**: MIME/size validation both for user uploads and AI illustration ingestion
- [ ] **API abuse**: reaction spam beyond rate limit, AI endpoint hammering, cron endpoint access, preview token guessing
- [ ] **Dependency audit**: `npm audit` — document the 3 known highs awaiting the Next.js 16 upgrade; flag anything new

## 10. Performance & Monitoring

- [ ] **Bundle size**: chatbot page, Studio AI (video renderer), Settings preview — code-split, not shipped to public pages
- [ ] **Server**: `cache()` usage, ISR values, Prisma selects minimal fields
- [ ] **Service worker**: does not cache `/admin`, `/api`, `/preview/`; offline page current
- [ ] **Free-tier ceilings**: Groq rate limits, Tavily credits (2/research), Pollinations reliability — verify every failure mode surfaces a clear Indonesian message to the user, never a hang or blank card

---

**Fix priority**: Critical > High > Medium > Low

**Instructions**:
- Verification must be real — actual browser, direct DB queries, curl against production, or throwaway `-tmp` scripts (delete after use). `tsc --noEmit` passing ≠ feature works.
- Login-gated UI flows: verify via API/DB with a script where possible; ask the owner to drive the browser for anything requiring their credentials (never handle passwords).
- Production checks are read-only: never mutate production data except clearly-marked test rows that you clean up immediately.
- Work in batches by section; fix straightforward findings immediately, report the rest. Report in Indonesian.
- Do not "fix" the Vercel Hobby constraints (maxDuration 60, daily cron) — they are intentional.
