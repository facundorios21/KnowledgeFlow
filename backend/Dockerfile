# ==============================================================================
# KNOWLEDGEFLOW BACKEND — MULTI-STAGE DOCKERFILE
# ==============================================================================

# --- Stage 1: Build stage ---
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# Install dependencies needed for native builds if any
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

# --- Stage 2: Production runtime ---
FROM node:22-alpine AS production

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /usr/src/app/dist ./dist

# Security: run application as unprivileged node user
USER node

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
