FROM node:20-alpine AS builder

WORKDIR /app

# Salin file package dan install dependencies
# Paksa install SEMUA deps (termasuk devDeps seperti tailwindcss, postcss)
ENV NODE_ENV=development
COPY package.json package-lock.json* ./
RUN npm ci

# Salin kode sumber dan build Next.js
COPY . .
ARG NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
RUN npm run build

# Mode production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

# Salin hasil build dari tahap builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3001
ENV PORT 3001
ENV HOSTNAME "0.0.0.0"

# Jalankan standalone server dari Next.js
CMD ["node", "server.js"]
