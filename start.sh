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
  # Database already populated — skip bootstrap entirely on re-deploys.
  echo "Database has $JOB_COUNT jobs — skipping bootstrap."
else
  # First-ever run: populate the database.
  echo "Database is empty — running full bootstrap in background..."
  npx tsx scripts/bootstrap.ts &
fi

# ── Scheduled sync: twice a day, every 12 hours ──────────────────────────────
# Runs independently of deploys. The loop starts after Next.js is up so the
# first sync fires 12 hours after startup, then every 12 hours after that.
(
  while true; do
    sleep 43200  # 12 hours
    echo "[scheduler] $(date -u '+%Y-%m-%d %H:%M UTC') — running scheduled sync..."
    npx tsx scripts/sync.ts >> /tmp/sync.log 2>&1 \
      && echo "[scheduler] Sync complete." \
      || echo "[scheduler] Sync failed — check /tmp/sync.log"
  done
) &

exec next start -H 0.0.0.0 -p ${PORT:-8080}
