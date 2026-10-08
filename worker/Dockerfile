# Playwright's image ships Chromium and its system libraries. Keep the tag in
# step with the "playwright" version in package.json.
FROM mcr.microsoft.com/playwright:v1.55.1-noble

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src

ENV NODE_ENV=production
CMD ["npx", "tsx", "src/index.ts"]
