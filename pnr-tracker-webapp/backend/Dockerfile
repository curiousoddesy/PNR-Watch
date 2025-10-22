
# Backend Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY backend/ ./backend/

# Build application
WORKDIR /app/backend
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S backend -u 1001

# Copy built application
COPY --from=builder --chown=backend:nodejs /app/backend/dist ./dist
COPY --from=builder --chown=backend:nodejs /app/backend/node_modules ./node_modules
COPY --from=builder --chown=backend:nodejs /app/backend/package.json ./

# Create logs directory
RUN mkdir -p logs && chown backend:nodejs logs

USER backend

EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
