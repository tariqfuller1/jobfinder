import Groq from "groq-sdk";

let _client: Groq | null = null;

export function getGroqClient(): Groq {
  if (!_client) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is not set");
    _client = new Groq({ apiKey });
  }
  return _client;
}

export function formatGroqError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();
  // Covers both classic 429s and Groq's "413 + rate_limit_exceeded" response for
  // requests whose prompt + max_tokens exceeds the per-minute token budget.
  if (
    message.includes("429") ||
    message.includes("413") ||
    lower.includes("rate limit") ||
    lower.includes("rate_limit") ||
    lower.includes("too large") ||
    lower.includes("tokens per minute")
  ) {
    return "AI is temporarily rate-limited. Wait a moment and try again.";
  }
  if (message.includes("API key") || message.includes("auth")) {
    return "Groq API key is missing or invalid.";
  }
  return "Something went wrong. Try again.";
}
