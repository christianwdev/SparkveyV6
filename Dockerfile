FROM oven/bun:1.3 AS deps

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

FROM deps AS nextjs

ARG NEXT_PUBLIC_ENV=production
ARG NEXT_PUBLIC_GA4_MEASUREMENT_ID
ARG NEXT_PUBLIC_CF_BEACON_TOKEN

ENV NODE_ENV=production
ENV NEXT_BUILD_CPUS=2
ENV NEXT_PUBLIC_ENV=$NEXT_PUBLIC_ENV
ENV NEXT_PUBLIC_GA4_MEASUREMENT_ID=$NEXT_PUBLIC_GA4_MEASUREMENT_ID
ENV NEXT_PUBLIC_CF_BEACON_TOKEN=$NEXT_PUBLIC_CF_BEACON_TOKEN

COPY tsconfig.json base.tsconfig.json global.d.ts ./
COPY scripts/generate-icons.ts ./scripts/generate-icons.ts
COPY types ./types
COPY schemas ./schemas
COPY src ./src

RUN bun run generate-icons && bun run build-frontend \
  && chown -R bun:bun /app

EXPOSE 4000

USER bun

CMD ["bun", "run", "start-frontend"]
