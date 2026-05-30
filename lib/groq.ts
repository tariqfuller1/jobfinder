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
  if (message.includes("429") || message.toLowerCase().includes("rate limit")) {
    return "AI is rate-limited. Wait a moment and try again.";
  }
  if (message.includes("API key") || message.includes("auth")) {
    return "Groq API key is missing or invalid.";
  }
  return "Something went wrong. Try again.";
}
