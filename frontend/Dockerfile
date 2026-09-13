FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package.json package-lock.json* ./

# Configure robust network timeouts, socket limits, and BuildKit cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm config set fetch-retries 10 \
    && npm config set fetch-retry-mintimeout 30000 \
    && npm config set fetch-retry-maxtimeout 180000 \
    && npm config set maxsockets 3 \
    && npm ci --include=dev --legacy-peer-deps

# Copy source code and build standalone Next.js production bundle
COPY . .
ARG NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy compiled standalone artifacts
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

# Start standalone Next.js server
CMD ["node", "server.js"]
