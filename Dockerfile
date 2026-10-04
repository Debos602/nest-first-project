# ---------- build stage ----------
FROM node:22-slim AS builder
WORKDIR /app

# better-sqlite3 prebuilt binary না পেলে compile করতে এগুলো লাগে
RUN apt-get update -y \
 && apt-get install -y openssl python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN DATABASE_URL="file:./build.db" npx prisma generate && npm run build

# ---------- run stage ----------
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y openssl \
 && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/package*.json ./

EXPOSE 5000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]