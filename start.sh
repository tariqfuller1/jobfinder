#!/bin/bash

# Check if the database already has jobs — if so, skip bootstrap.
# This prevents re-running the full 30-min bootstrap on every deploy.
JOB_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.job.count()
  .then(c => { process.stdout.write(String(c)); p.\$disconnect(); })
  .catch(() => { process.stdout.write('0'); });
" 2>/dev/null)

if [ "${JOB_COUNT:-0}" -gt "500" ] 2>/dev/null; then
  echo "Database has $JOB_COUNT jobs — skipping bootstrap."
else
  echo "Database has ${JOB_COUNT:-0} jobs — running bootstrap in background..."
  npx tsx scripts/bootstrap.ts &
fi

# Start the web server in the foreground
exec next start -H 0.0.0.0 -p ${PORT:-8080}
