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

function maybeDecodeEntities(html: string): string {
  // If the string has entity-encoded angle brackets but no literal HTML tags,
  // it was double-encoded and needs one round of decoding before sanitization.
  if (/&lt;/.test(html) && !/<[a-zA-Z]/.test(html)) {
    return html
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
  return html;
}

export function sanitizeJobHtml(html: string): string {
  return sanitizeHtml(stripRawTextElements(maybeDecodeEntities(html)), {
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
