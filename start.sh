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

# Recurring sync is handled in-process by lib/scheduler.ts (started via
# instrumentation.ts once Next.js boots) — do not also loop scripts/sync.ts
# here, since that spawned a second full Node/tsx process running the same
# work concurrently and was the source of Railway OOM crashes.

exec next start -H 0.0.0.0 -p ${PORT:-8080}
