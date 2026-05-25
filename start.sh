#!/bin/bash

# Ensure database schema exists on the persistent volume.
echo "Running prisma db push against volume..."
npx prisma db push --skip-generate

# Check job count.
JOB_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.job.count()
  .then(c => { process.stdout.write(String(c)); p.\$disconnect(); })
  .catch(() => { process.stdout.write('0'); });
" 2>/dev/null)

if [ "${JOB_COUNT:-0}" -gt "0" ] 2>/dev/null; then
  # Re-deploy: database already populated — run a fresh sync in the background.
  echo "Database has $JOB_COUNT jobs — running sync in background..."
  npx tsx scripts/sync.ts >> /tmp/sync.log 2>&1 &
else
  # First-ever run: populate the database.
  echo "Database is empty — running full bootstrap in background..."
  npx tsx scripts/bootstrap.ts &
fi

# ── Continuous sync: restart immediately after each run ───────────────────────
# Runs independently of the in-process scheduler. Fires the first sync 5 minutes
# after startup, then loops without a fixed interval — next run starts as soon
# as the previous one finishes (60s pause between to avoid tight failure loops).
(
  sleep 300  # wait for Next.js to come up
  while true; do
    echo "[scheduler] $(date -u '+%Y-%m-%d %H:%M UTC') — running sync..."
    npx tsx scripts/sync.ts >> /tmp/sync.log 2>&1 \
      && echo "[scheduler] Sync complete." \
      || echo "[scheduler] Sync failed — check /tmp/sync.log"
    sleep 60  # brief pause between runs
  done
) &

exec next start -H 0.0.0.0 -p ${PORT:-8080}
