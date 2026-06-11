FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci && npm run build --workspace=@contentsmith/studio

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/apps/studio/.next/standalone /app
COPY --from=builder /app/apps/studio/.next/static /app/apps/studio/.next/static
COPY --from=builder /app/apps/studio/public /app/apps/studio/public
COPY --from=builder /app/apps/studio/messages /app/apps/studio/messages
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "apps/studio/server.js"]
