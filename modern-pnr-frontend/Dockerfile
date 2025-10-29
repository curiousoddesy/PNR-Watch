# Multi-stage Dockerfile for Modern PNR Frontend
# Optimized for production deployment with security and performance

# =============================================================================
# Build Stage
# =============================================================================
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production=false --no-audit --no-fund

# Copy source code
COPY . .

# Build arguments
ARG VITE_API_URL
ARG VITE_SOCKET_URL
ARG VITE_ENVIRONMENT=production
ARG VITE_BUILD_VERSION
ARG VITE_BUILD_TIMESTAMP

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_ENVIRONMENT=$VITE_ENVIRONMENT
ENV VITE_BUILD_VERSION=$VITE_BUILD_VERSION
ENV VITE_BUILD_TIMESTAMP=$VITE_BUILD_TIMESTAMP

# Run quality checks
RUN npm run lint
RUN npm run test

# Build application
RUN npm run build

# Run security audit
RUN npm audit --audit-level=moderate || true

# =============================================================================
# Production Stage
# =============================================================================
FROM nginx:1.25-alpine AS production

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache \
    curl \
    tzdata

# Create non-root user
RUN addgroup -g 1001 -S nginx-app && \
    adduser -S nginx-app -u 1001

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy security headers configuration
COPY --from=builder /app/scripts/security-headers.conf /etc/nginx/conf.d/security-headers.conf 2>/dev/null || echo "# No security headers file" > /etc/nginx/conf.d/security-headers.conf

# Set proper permissions
RUN chown -R nginx-app:nginx-app /usr/share/nginx/html && \
    chown -R nginx-app:nginx-app /var/cache/nginx && \
    chown -R nginx-app:nginx-app /var/log/nginx && \
    chown -R nginx-app:nginx-app /etc/nginx/conf.d

# Create nginx PID directory
RUN mkdir -p /var/run/nginx && \
    chown -R nginx-app:nginx-app /var/run/nginx

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Security: Remove unnecessary packages and files
RUN apk del curl && \
    rm -rf /var/cache/apk/* && \
    rm -rf /tmp/*

# Switch to non-root user
USER nginx-app

# Expose port
EXPOSE 8080

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# =============================================================================
# Development Stage (optional)
# =============================================================================
FROM node:20-alpine AS development

WORKDIR /app

# Install development dependencies
RUN apk add --no-cache git

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci --no-audit --no-fund

# Copy source code
COPY . .

# Expose development port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# =============================================================================
# Testing Stage (optional)
# =============================================================================
FROM builder AS testing

# Run all tests and quality checks
RUN npm run test
RUN npm run lint
RUN npm run security-audit || true
RUN npm run size-check

# Generate test reports
RUN npm run test:coverage || true

# Keep container running for CI/CD
CMD ["tail", "-f", "/dev/null"]