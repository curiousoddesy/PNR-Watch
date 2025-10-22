
# Frontend Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci

# Copy source code
COPY frontend/ ./frontend/

# Build application
WORKDIR /app/frontend
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy built application
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
