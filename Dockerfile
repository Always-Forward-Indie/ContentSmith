# Multi-stage build for production
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy root package files
COPY package.json package-lock.json* ./

# Copy package.json files for all workspaces
COPY apps/studio/package.json ./apps/studio/
COPY packages/database/package.json ./packages/database/
COPY packages/validation/package.json ./packages/validation/
COPY packages/ui/package.json ./packages/ui/

# Install dependencies
RUN npm ci

# Development stage
FROM base AS dev
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY apps/studio/package.json ./apps/studio/
COPY packages/database/package.json ./packages/database/
COPY packages/validation/package.json ./packages/validation/
COPY packages/ui/package.json ./packages/ui/

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Build packages first
RUN npm run build --workspace=packages/database
RUN npm run build --workspace=packages/validation

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Start development server
CMD ["npm", "run", "dev", "--workspace=apps/studio"]

# Production build stage
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps ./apps
COPY --from=deps /app/packages ./packages

# Copy source code
COPY . .

# Build packages
RUN npm run build --workspace=packages/database
RUN npm run build --workspace=packages/validation

# Build the Next.js application
RUN npm run build --workspace=apps/studio

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/apps/studio/public ./apps/studio/public

# Set the correct permission for prerender cache
RUN mkdir -p /app/apps/studio/.next
RUN chown nextjs:nodejs /app/apps/studio/.next

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/apps/studio/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/studio/.next/static ./apps/studio/.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "apps/studio/server.js"]