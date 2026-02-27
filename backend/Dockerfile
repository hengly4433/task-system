# ─────────────────────────────────────────
# Stage 1: Build
# ─────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests first for better layer caching
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Generate Prisma client before compiling
RUN npx prisma generate

# Copy source and compile TypeScript
COPY . .
RUN npm run build

# ─────────────────────────────────────────
# Stage 2: Production image
# ─────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production

# Copy only what's needed to run
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma/
COPY --from=builder /app/dist ./dist/

# Install production dependencies only (re-runs prisma generate)
RUN npm ci --omit=dev && npx prisma generate

EXPOSE 3000

# prestart:prod runs migrate + generate before starting
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "start:prod"]
