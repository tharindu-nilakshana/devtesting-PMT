# --- Dependencies stage ---
FROM node:20.9.0-alpine AS deps
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production --frozen-lockfile && npm cache clean --force

# --- Build stage ---
FROM node:20.9.0-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --frozen-lockfile
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- Runtime stage ---
FROM node:20.9.0-alpine AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /usr/src/app/public ./public
COPY --from=builder --chown=nextjs:nodejs /usr/src/app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /usr/src/app/.next/static ./.next/static

USER nextjs
CMD ["node", "server.js"]
    