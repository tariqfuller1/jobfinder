/**
 * Parses JSON that may contain literal control characters (newlines, tabs, etc.)
 * inside string values — a common Groq/LLM output issue where the model writes
 * actual newlines in a JSON string instead of the required \n escape sequence.
 */
export function parseJsonSafe(raw: string): unknown {
  let inString = false;
  let escaped = false;
  let cleaned = "";

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    const code = raw.charCodeAt(i);

    if (escaped) {
      cleaned += ch;
      escaped = false;
      continue;
    }

    if (ch === "\\" && inString) {
      escaped = true;
      cleaned += ch;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      cleaned += ch;
      continue;
    }

    if (inString && code < 0x20) {
      if (ch === "\n") cleaned += "\\n";
      else if (ch === "\r") cleaned += "\\r";
      else if (ch === "\t") cleaned += "\\t";
      else cleaned += "\\u" + code.toString(16).padStart(4, "0");
      continue;
    }

    cleaned += ch;
  }

  return JSON.parse(cleaned);
}
