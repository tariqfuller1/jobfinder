#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -f .env ]; then
  cp .env.example .env
fi

if [ ! -d node_modules ]; then
  npm install
fi

npx prisma generate
npx prisma db push
npm run prisma:seed
npm run bootstrap
npm run dev
