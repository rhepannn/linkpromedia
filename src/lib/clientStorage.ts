const BOOKMARK_KEY = "linkpromedia:bookmarks";
const HISTORY_KEY = "linkpromedia:reading-history";
const CATEGORY_PREF_KEY = "linkpromedia:category-prefs";
const HISTORY_MAX = 30;
const PREF_MAX = 10;

function readList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeList(key: string, list: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(list));
  window.dispatchEvent(new Event(`${key}-updated`));
}

export function getBookmarks(): string[] {
  return readList(BOOKMARK_KEY);
}

export function isBookmarked(slug: string): boolean {
  return getBookmarks().includes(slug);
}

export function toggleBookmark(slug: string): boolean {
  const current = getBookmarks();
  const exists = current.includes(slug);
  const next = exists ? current.filter((s) => s !== slug) : [slug, ...current];
  writeList(BOOKMARK_KEY, next);
  return !exists;
}

export function onBookmarksChange(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener(`${BOOKMARK_KEY}-updated`, handler);
  return () => window.removeEventListener(`${BOOKMARK_KEY}-updated`, handler);
}

export function getReadingHistory(): string[] {
  return readList(HISTORY_KEY);
}

export function recordArticleView(slug: string): void {
  const current = readList(HISTORY_KEY).filter((s) => s !== slug);
  const next = [slug, ...current].slice(0, HISTORY_MAX);
  writeList(HISTORY_KEY, next);
}

export function clearReadingHistory(): void {
  writeList(HISTORY_KEY, []);
}

export function getCategoryPreferences(): string[] {
  return readList(CATEGORY_PREF_KEY);
}

export function recordCategoryPreference(categorySlug: string): void {
  const current = readList(CATEGORY_PREF_KEY).filter((s) => s !== categorySlug);
  const next = [categorySlug, ...current].slice(0, PREF_MAX);
  writeList(CATEGORY_PREF_KEY, next);
}
