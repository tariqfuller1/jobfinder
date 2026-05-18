import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "b", "i", "u", "s",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "a", "span", "div", "section",
  "table", "thead", "tbody", "tr", "th", "td",
  "blockquote", "pre", "code",
  "hr",
];

// Strip raw-text elements that bypass sanitize-html <=2.17.3 (GHSA-rpr9-rxv7-x643)
function stripRawTextElements(html: string): string {
  return html.replace(/<(xmp|plaintext|listing)[\s\S]*?<\/\1\s*>/gi, "")
             .replace(/<(xmp|plaintext|listing)(\s[^>]*)?>[\s\S]*/gi, "");
}

export function sanitizeJobHtml(html: string): string {
  return sanitizeHtml(stripRawTextElements(html), {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
    // Strip event handlers and javascript: hrefs regardless of allowedAttributes
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      // Force all links to open in new tab safely
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }),
    },
  });
}
