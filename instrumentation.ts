export async function register() {
  // Only run in the Node.js runtime (not Edge), and only in production
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "production") {
    const { startDailySync } = await import("@/lib/scheduler");
    startDailySync();
  }
}
