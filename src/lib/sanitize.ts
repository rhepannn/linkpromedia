const ALLOWED_TAGS = new Set([
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "br", "blockquote", "pre", "code",
  "strong", "b", "em", "i", "u", "s", "mark",
  "ul", "ol", "li",
  "a", "img", "figure", "figcaption",
  "table", "thead", "tbody", "tr", "th", "td",
  "div", "span", "hr",
]);

const ALLOWED_ATTRS = new Set([
  "href", "target", "rel", "title",
  "src", "alt", "width", "height", "loading",
  "class", "id", "data-type", "data-id",
]);

const STRIP_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script\s*>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe\s*>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object\s*>/gi,
  /<embed\b[^<]*\/?\s*>/gi,
  /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style\s*>/gi,
  /\bon\w+\s*=\s*["'][^"']*["']/gi,
  /\bon\w+\s*=\s*[^\s>]+/gi,
  /javascript\s*:/gi,
  /data:text\/html/gi,
  /vbscript\s*:/gi,
];

export function sanitizeHtml(html: string): string {
  if (!html) return "";

  let clean = html;

  for (const pattern of STRIP_PATTERNS) {
    clean = clean.replace(pattern, "");
  }

  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\/?>/g;
  clean = clean.replace(tagRegex, (match, tag: string) => {
    const lower = tag.toLowerCase();

    if (!ALLOWED_TAGS.has(lower)) {
      if (lower === "script" || lower === "style" || lower === "iframe") return "";
      const text = match.replace(/<[^>]+>/g, "");
      return text;
    }

    return match.replace(
      /\s+([a-zA-Z][a-zA-Z0-9-]*)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/g,
      (attrMatch: string, attrName: string) => {
        return ALLOWED_ATTRS.has(attrName.toLowerCase()) ? attrMatch : "";
      }
    );
  });

  return clean;
}
