# Use official Node.js runtime as parent image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the TypeScript code
RUN npm run build

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejsuser

# Set ownership
RUN chown -R nodejsuser:nodejs /app

# Switch to non-root user
USER nodejsuser

# Start the application
CMD ["node", "dist/index.js"]
