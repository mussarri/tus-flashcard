# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-slim AS deps

WORKDIR /app

# Install system dependencies for Prisma and pdf-poppler
RUN apt-get update && apt-get install -y \
    openssl \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# ============================================
# Stage 2: Builder
# ============================================
FROM node:20-slim AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./

# Copy source code
COPY . .

# Build the application
RUN npm run build

# ============================================
# Stage 3: Production
# ============================================
FROM node:20-slim AS production

WORKDIR /app

# Install system dependencies and dumb-init
RUN apt-get update && apt-get install -y \
    openssl \
    poppler-utils \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nestjs

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Generate Prisma Client in production
RUN npx prisma generate

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Create uploads directory with proper permissions
RUN mkdir -p /app/uploads && \
    chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Expose port 5000
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main.js"]
