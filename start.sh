#!/bin/bash

# Run bootstrap in the background — volume is mounted at this point so jobs persist.
# The web server starts immediately so Railway's health check passes.
echo "Starting bootstrap in background..."
npx tsx scripts/bootstrap.ts &

# Start the web server in the foreground
exec next start -H 0.0.0.0 -p ${PORT:-8080}
