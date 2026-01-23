FROM node:20-alpine AS base

# Stage 1: Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejsuser

# Copy package files
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built artifacts from builder with correct permissions
COPY --from=builder --chown=nodejsuser:nodejs /app/dist ./dist

USER nodejsuser
EXPOSE 8080
ENV PORT=8080

CMD ["node", "dist/index.js"]
