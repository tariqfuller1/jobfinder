#!/bin/bash

# Ensure database schema exists on the persistent volume.
# This runs at startup when /data is already mounted.
echo "Running prisma db push against volume..."
npx prisma db push --skip-generate

# Check if the database already has jobs — skip bootstrap if populated.
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

exec next start -H 0.0.0.0 -p ${PORT:-8080}
