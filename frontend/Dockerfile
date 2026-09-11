FROM node:20-alpine AS builder

WORKDIR /app

# Install SEMUA deps termasuk devDependencies (tailwindcss, postcss, dll)
COPY package.json package-lock.json* ./

# Konfigurasi retry dan network timeout agar tidak terkena ECONNRESET
RUN npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm ci --include=dev --legacy-peer-deps

# Salin kode sumber dan build Next.js
COPY . .
ARG NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
RUN npm run build

# Mode production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Salin hasil build dari tahap builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

# Jalankan standalone server dari Next.js
CMD ["node", "server.js"]
