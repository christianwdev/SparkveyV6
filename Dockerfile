FROM oven/bun:1.4 AS deps

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM deps AS backend

COPY app.ts tsconfig.json base.tsconfig.json global.d.ts ./
COPY backend ./backend
COPY types ./types
COPY schemas ./schemas

ENV NODE_ENV=production

EXPOSE 8080

USER bun

CMD ["bun", "run", "app.ts"]

FROM deps AS worker

COPY tsconfig.json base.tsconfig.json global.d.ts ./
COPY backend ./backend
COPY types ./types
COPY schemas ./schemas

ENV NODE_ENV=production

USER bun

CMD ["bun", "run", "./backend/workers/index.ts"]

# Next's SWC binary SIGILL (exit 132) under Bun. Build and start with Node.
FROM node:22-bookworm AS nextjs

COPY --from=oven/bun:1.4 /usr/local/bin/bun /usr/local/bin/bun

WORKDIR /app

ARG NEXT_PUBLIC_ENV=production
ARG NEXT_PUBLIC_GA4_MEASUREMENT_ID
ARG NEXT_PUBLIC_CF_BEACON_TOKEN

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_BUILD_CPUS=2
ENV NEXT_PUBLIC_ENV=$NEXT_PUBLIC_ENV
ENV NEXT_PUBLIC_GA4_MEASUREMENT_ID=$NEXT_PUBLIC_GA4_MEASUREMENT_ID
ENV NEXT_PUBLIC_CF_BEACON_TOKEN=$NEXT_PUBLIC_CF_BEACON_TOKEN

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json /app/bun.lock ./
COPY tsconfig.json base.tsconfig.json global.d.ts ./
COPY scripts/generate-icons.ts ./scripts/generate-icons.ts
COPY types ./types
COPY schemas ./schemas
COPY src ./src

RUN bun run generate-icons
RUN NODE_OPTIONS=--max-old-space-size=4096 node ./node_modules/next/dist/bin/next build src/

RUN chown -R node:node /app

EXPOSE 4000

USER node

CMD ["node", "./node_modules/next/dist/bin/next", "start", "src/", "-p", "4000"]
