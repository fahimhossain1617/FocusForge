# ==============================================================================
# Focentia Companion Backend - Production Multi-Stage Dockerfile
# Express 5 + WebSocket Server (Port 5000)
# ==============================================================================

# Stage 1: Build TypeScript into dist
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install all dependencies required for compilation
RUN npm ci

# Copy TypeScript configuration and source files
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript to dist
RUN npm run build

# Stage 2: Minimal, secure production runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000
ENV HOST=0.0.0.0

# Create unprivileged group and user for container security
RUN addgroup -S focentiagroup && adduser -S focentiauser -G focentiagroup

# Copy dependency manifests and install ONLY production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled JavaScript output from builder stage
COPY --from=builder --chown=focentiauser:focentiagroup /app/dist ./dist

# Switch to non-root user
USER focentiauser

EXPOSE 5000

# Docker healthcheck pinging backend /health endpoint
HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5000/health || exit 1

CMD ["node", "dist/server.js"]
