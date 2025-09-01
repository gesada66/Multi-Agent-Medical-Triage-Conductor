# Multi-stage build for production deployment
FROM node:18-alpine AS base

# Build the application
FROM base AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Copy package files and install all dependencies (including dev deps for build)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code
COPY . .

# Create .env.local for build (will be overridden at runtime)
RUN echo "APP_MODE=LOCAL" > .env.local
RUN echo "MODEL_PROVIDER=anthropic" >> .env.local
RUN echo "MOCK_LLM_RESPONSES=false" >> .env.local

# Build Next.js application
RUN npm run build

# Install production dependencies only
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Create empty public directory
RUN mkdir -p ./public
COPY --from=builder /app/package.json ./package.json

# Create data directory for SQLite
RUN mkdir -p .data && chown nextjs:nodejs .data

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]