# Use official Node.js runtime
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build Next.js application
# Note: We skip the build check for now because of environment variables
# In a real deployment, these should be provided
ENV NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder

RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
