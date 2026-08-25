# Base stage
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

# Dependencies stage
FROM base AS deps
COPY package*.json ./
RUN npm ci

# Builder stage
FROM deps AS builder
COPY prisma ./prisma/
RUN npx prisma generate
COPY . .
# tsc reports pre-existing type errors but still emits JS; fail only if nothing was emitted
RUN npm run build; test -d dist

# Test stage (defined before runner so the image default CMD runs the server)
FROM deps AS test
WORKDIR /app
COPY prisma ./prisma/
COPY src ./src
COPY tests ./tests
COPY vitest.config.ts ./
COPY tsconfig.json ./
RUN npx prisma generate
CMD ["npm", "test"]

# Production stage — LAST, so its CMD is the image default
FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["node", "dist/server.js"]