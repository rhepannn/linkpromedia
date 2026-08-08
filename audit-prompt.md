# Audit Prompt — LinkProMedia

Conduct a thorough audit of the LinkProMedia website (Next.js 15.3.3 news CMS). Inspect every area listed below. Report findings using this format:

```
[Severity: Critical/High/Medium/Low] [Area] Finding title
Description of the issue
Related file: path
Fix recommendation
```

---

## 1. Function / Features

- [ ] **Auth**: Login/logout Credentials provider, JWT session — check expiry, refresh, brute-force protection, edge case sessions (manual cookie deletion)
- [ ] **RBAC**: Admin/Editor/Writer — verify each role can only access allowed resources (`permissions.ts`), cannot bypass via direct URL
- [ ] **Article CRUD**: Create, edit, delete, draft, scheduled publish, archive, preview token, revision history, rollback
- [ ] **AI Features**: Headline generator, AI summary auto-enrich, AI Draft Writer (source-based only), Morning Briefing, AI Breaking Detection — test all source material types
- [ ] **Search**: Full-text search with GIN trigram, category/tag filters, empty results, special characters
- [ ] **Categories & Tags**: CRUD, slug uniqueness, articles per category/tag, empty states
- [ ] **Media Library**: Upload (Supabase Storage), delete, reuse, broken image handling
- [ ] **Live Update Article**: Real-time polling, auto-refresh, stops when tab inactive, SSR fallback without JS
- [ ] **Bookmark & Reading History**: localStorage persistence, cross-tab sync, clear, empty states
- [ ] **Newsletter**: Subscribe, unsubscribe, double opt-in, email validation
- [ ] **Push Notification**: Subscribe/unsubscribe, VAPID, auto-push on breaking news, auto-cleanup dead subscriptions (404/410)
- [ ] **Multi-language**: Translation CRUD, LanguageSwitcher, TranslationPanel, canonical/alternate meta, fallback
- [ ] **Journalist Verification**: Verified badge, public author profile `/penulis/[slug]`, empty state
- [ ] **PWA / Offline**: Service worker, offline page `/offline`, manifest, install prompt, cache strategy
- [ ] **Personalized Homepage**: Cookie `lp-pref`, preferred categories prioritized, "Untuk Kamu" section, fallback without preferences
- [ ] **Timeline**: `/kronologi` page, filter Breaking/Live/All, infinite scroll, date grouping, empty state, mobile
- [ ] **Scheduled Publish**: Cron/manual trigger, timezone handling, scheduled articles auto-publish on time
- [ ] **Activity Log**: All actions recorded, filterable, readable

## 2. UI / UX

- [ ] **Responsive**: Mobile, tablet, desktop — all pages, no horizontal scroll, adequate touch targets
- [ ] **Dark Mode**: Toggle works, all components support, no flash, persisted in localStorage
- [ ] **Font Size Adjuster**: Works on articles, persisted, does not break layout
- [ ] **Text-to-Speech**: Functional, pause/resume, graceful fallback for unsupported browsers
- [ ] **Reading Progress Bar**: Accurate, visible, non-intrusive
- [ ] **Breaking News Ticker**: Real-time, smooth animation, links work
- [ ] **Share Buttons**: Native Web Share API + URL copy fallback, all platforms
- [ ] **Breadcrumb**: Consistent, links work, schema.org markup
- [ ] **Loading States**: Skeleton, spinner, empty state, error state — all pages
- [ ] **Error Boundaries**: Global error page, per-section error fallback
- [ ] **Toast/Notification**: Action feedback (save, delete, publish), auto-dismiss
- [ ] **Form Validation**: Client-side + server-side, clear error messages, inline validation
- [ ] **Accessibility (a11y)**: ARIA labels, keyboard navigation, focus management, screen reader, contrast ratios
- [ ] **Animations/Transitions**: Smooth, no jank, respects `prefers-reduced-motion`
- [ ] **404 / Not Found**: Custom page, helpful (article suggestions, back links)

## 3. Database / Schema

- [ ] **Prisma Schema**: Correct relations, proper cascade delete, sufficient indexes, no redundant indexes
- [ ] **DB Connectivity**: Pooler stable, retry wrapper functional, graceful degradation when DB is down
- [ ] **Migrations**: All models in schema, no drift between schema and DB
- [ ] **Edge Runtime Safety**: `prisma.ts` does not crash in Edge Runtime (middleware), `.$extends()` is lazily wrapped
- [ ] **Query Performance**: N+1 queries, eager loading, select only needed fields
- [ ] **Connection Pool**: No connection leaks, `$disconnect()` called properly
- [ ] **Full-text Search**: GIN index utilized, performance at scale, relevance ranking
- [ ] **Data Integrity**: Unique constraints enforced, soft delete vs hard delete, cascading deletes

## 4. SEO & Distribution

- [ ] **Metadata**: title, description, OG, Twitter Card — dynamic per page, fallback
- [ ] **Schema.org**: NewsArticle, Breadcrumb, Organization, Person — valid, no empty fields
- [ ] **Sitemap**: `/sitemap.xml`, `/sitemap-artikel`, `/sitemap-statis.xml`, `/news-sitemap.xml` — valid XML
- [ ] **RSS Feed**: `/rss.xml` — valid, up-to-date, all public articles
- [ ] **Canonical URL**: Consistent, no duplicate content, multi-language alternates
- [ ] **Robots.txt**: Correct, does not block important resources, sitemap referenced
- [ ] **Thin Content**: `wordCount < MIN_INDEXABLE_WORDS` → noindex, but still accessible
- [ ] **Structured Data Testing**: All rich results valid (Google Rich Results Test)
- [ ] **Core Web Vitals**: LCP, FID/INP, CLS — ISR/caching optimal

## 5. Security

- [ ] **Auth**: Strong JWT secret, no token leaks, CSRF protection
- [ ] **API Routes**: Rate limiting, input validation, sanitization, CORS
- [ ] **Input Sanitization**: XSS in article content (TipTap HTML), SQL injection (Prisma parameterized)
- [ ] **File Upload**: MIME type validation, size limit, virus scanning (if applicable), not executable
- [ ] **Environment Variables**: No secrets in client bundle (`NEXT_PUBLIC_*` prefix correct)
- [ ] **Preview Token**: Unique, unguessable, expires, rate-limited
- [ ] **Admin Panel**: Inaccessible without login, role check on server (not just client)
- [ ] **Dependency Audit**: `npm audit`, no critical/high vulnerabilities
- [ ] **Headers**: CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy

## 6. Performance

- [ ] **Server-side**: ISR revalidate optimal, `cache()` React wrap, efficient Prisma queries
- [ ] **Client-side**: Bundle size (code splitting), image optimization (`next/image`), font loading
- [ ] **Service Worker**: Cache strategy (network-first), does not cache `/admin`, `/api`, `/preview/`
- [ ] **DB Query**: No full table scans, indexes utilized, query logging in dev
- [ ] **Image**: WebP/AVIF, lazy loading, blur placeholder, responsive sizes

## 7. Monitoring / Observability

- [ ] **Error Logging**: Console in dev, production logging strategy
- [ ] **Analytics**: PageView tracker, avg read time, traffic source, bounce rate — accurate
- [ ] **Admin Dashboard Analytics**: Real-time refresh, charts, most popular
- [ ] **Health Check**: `/api/health` or equivalent endpoint
- [ ] **DB Monitoring**: Query performance, connection pool usage

---

**Fix priority**: Critical > High > Medium > Low

**Instructions**: Verification must be real — test via actual browser, direct DB queries, or `-tmp.ts` scripts (delete after use). `tsc --noEmit` passing ≠ feature works.
