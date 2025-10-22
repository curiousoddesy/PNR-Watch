#!/usr/bin/env node

/**
 * Deployment Configuration Script
 * Creates production-ready configuration files and deployment setup
 */

const fs = require('fs');
const path = require('path');

class DeploymentConfig {
  constructor() {
    this.projectRoot = __dirname;
    this.backendPath = path.join(this.projectRoot, 'backend');
    this.frontendPath = path.join(this.projectRoot, 'frontend');
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  createDockerfiles() {
    this.log('Creating Docker configuration files...');

    // Backend Dockerfile
    const backendDockerfile = `
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
`;

    // Frontend Dockerfile
    const frontendDockerfile = `
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
`;

    // Docker Compose
    const dockerCompose = `
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: pnr_tracker
      POSTGRES_USER: pnr_user
      POSTGRES_PASSWORD: \${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/src/migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U pnr_user -d pnr_tracker"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://pnr_user:\${DB_PASSWORD}@postgres:5432/pnr_tracker
      REDIS_URL: redis://redis:6379
      JWT_ACCESS_SECRET: \${JWT_ACCESS_SECRET}
      JWT_REFRESH_SECRET: \${JWT_REFRESH_SECRET}
      SMTP_HOST: \${SMTP_HOST}
      SMTP_PORT: \${SMTP_PORT}
      SMTP_USER: \${SMTP_USER}
      SMTP_PASS: \${SMTP_PASS}
      VAPID_PUBLIC_KEY: \${VAPID_PUBLIC_KEY}
      VAPID_PRIVATE_KEY: \${VAPID_PRIVATE_KEY}
      VAPID_EMAIL: \${VAPID_EMAIL}
    ports:
      - "3001:3001"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - backend_logs:/app/logs
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  backend_logs:
`;

    // Nginx configuration
    const nginxConf = `
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # API proxy
        location /api/ {
            proxy_pass http://backend:3001/api/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Health check proxy
        location /health {
            proxy_pass http://backend:3001/health;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket proxy
        location /socket.io/ {
            proxy_pass http://backend:3001/socket.io/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Static files
        location / {
            try_files $uri $uri/ /index.html;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Cache static assets
        location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Disable cache for index.html
        location = /index.html {
            expires -1;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }
    }
}
`;

    fs.writeFileSync(path.join(this.backendPath, 'Dockerfile'), backendDockerfile);
    fs.writeFileSync(path.join(this.frontendPath, 'Dockerfile'), frontendDockerfile);
    fs.writeFileSync(path.join(this.projectRoot, 'docker-compose.yml'), dockerCompose);
    fs.writeFileSync(path.join(this.projectRoot, 'nginx.conf'), nginxConf);

    this.log('Docker configuration files created', 'success');
  }

  createProductionEnvFiles() {
    this.log('Creating production environment templates...');

    const prodBackendEnv = `
# Production Backend Environment Variables
NODE_ENV=production
PORT=3001

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/pnr_tracker
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pnr_tracker
DB_USER=username
DB_PASSWORD=CHANGE_THIS_SECURE_PASSWORD

# JWT Configuration (CHANGE THESE IN PRODUCTION)
JWT_ACCESS_SECRET=CHANGE_THIS_TO_A_SECURE_RANDOM_STRING_AT_LEAST_32_CHARS
JWT_REFRESH_SECRET=CHANGE_THIS_TO_ANOTHER_SECURE_RANDOM_STRING_AT_LEAST_32_CHARS

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-production-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@your-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Push Notification Configuration
VAPID_PUBLIC_KEY=your-production-vapid-public-key
VAPID_PRIVATE_KEY=your-production-vapid-private-key
VAPID_EMAIL=your-production-email@your-domain.com

# Background Scheduler Configuration
SCHEDULER_ENABLED=true
SCHEDULER_CRON=0 */30 * * * *
SCHEDULER_BATCH_SIZE=50
SCHEDULER_REQUEST_DELAY=2000
SCHEDULER_MAX_RETRIES=3
SCHEDULER_INITIAL_CHECK=false
AUTO_DEACTIVATE_FLUSHED=true

# PNR Archiver Configuration
ARCHIVER_ENABLED=true
ARCHIVER_DAYS_AFTER_TRAVEL=7
ARCHIVER_BATCH_SIZE=100

# Admin Configuration
ADMIN_EMAILS=admin@your-domain.com

# Error Handling and Monitoring
LOG_LEVEL=info
ALERTS_ENABLED=true
ALERT_WEBHOOK_URL=https://your-webhook-url.com/alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Monitoring Thresholds
ERROR_RATE_THRESHOLD=10
RESPONSE_TIME_THRESHOLD=5000
MEMORY_USAGE_THRESHOLD=85
FAILED_HEALTH_CHECKS_THRESHOLD=3

# Timezone
TZ=UTC
`;

    const prodFrontendEnv = `
# Production Frontend Environment Variables
VITE_API_BASE_URL=https://your-domain.com/api
VITE_WS_URL=https://your-domain.com

# App Configuration
VITE_APP_NAME=PNR Tracker
VITE_APP_VERSION=1.0.0

# Push Notifications
VITE_VAPID_PUBLIC_KEY=your-production-vapid-public-key
`;

    fs.writeFileSync(path.join(this.backendPath, '.env.production'), prodBackendEnv);
    fs.writeFileSync(path.join(this.frontendPath, '.env.production'), prodFrontendEnv);

    this.log('Production environment templates created', 'success');
  }

  createDeploymentScripts() {
    this.log('Creating deployment scripts...');

    const deployScript = `#!/bin/bash

# Production Deployment Script

set -e

echo "🚀 Starting PNR Tracker deployment..."

# Check if required environment variables are set
if [ -z "$DB_PASSWORD" ]; then
    echo "❌ Error: DB_PASSWORD environment variable is required"
    exit 1
fi

if [ -z "$JWT_ACCESS_SECRET" ]; then
    echo "❌ Error: JWT_ACCESS_SECRET environment variable is required"
    exit 1
fi

if [ -z "$JWT_REFRESH_SECRET" ]; then
    echo "❌ Error: JWT_REFRESH_SECRET environment variable is required"
    exit 1
fi

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Build and start services
echo "🏗️ Building and starting services..."
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 30

# Check service health
echo "🔍 Checking service health..."
docker-compose ps

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose exec backend npm run migrate:up

# Verify deployment
echo "✅ Verifying deployment..."
curl -f http://localhost/health || exit 1

echo "🎉 Deployment completed successfully!"
echo "📊 Access the application at: http://localhost"
echo "🔧 Monitor logs with: docker-compose logs -f"
`;

    const backupScript = `#!/bin/bash

# Database Backup Script

set -e

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="pnr_tracker_backup_$DATE.sql"

echo "📦 Creating database backup..."

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Create database backup
docker-compose exec postgres pg_dump -U pnr_user -d pnr_tracker > "$BACKUP_DIR/$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_DIR/$BACKUP_FILE"

echo "✅ Backup created: $BACKUP_DIR/$BACKUP_FILE.gz"

# Clean up old backups (keep last 7 days)
find $BACKUP_DIR -name "pnr_tracker_backup_*.sql.gz" -mtime +7 -delete

echo "🧹 Old backups cleaned up"
`;

    const monitoringScript = `#!/bin/bash

# System Monitoring Script

echo "📊 PNR Tracker System Status"
echo "=========================="

# Check Docker containers
echo "🐳 Docker Containers:"
docker-compose ps

echo ""

# Check service health
echo "🏥 Service Health:"
curl -s http://localhost/health | jq '.' || echo "❌ Health check failed"

echo ""

# Check system resources
echo "💻 System Resources:"
echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')"
echo "Memory Usage: $(free | grep Mem | awk '{printf("%.2f%%", $3/$2 * 100.0)}')"
echo "Disk Usage: $(df -h / | awk 'NR==2{printf "%s", $5}')"

echo ""

# Check logs for errors
echo "🔍 Recent Errors:"
docker-compose logs --tail=10 backend | grep -i error || echo "No recent errors found"
`;

    fs.writeFileSync(path.join(this.projectRoot, 'deploy.sh'), deployScript);
    fs.writeFileSync(path.join(this.projectRoot, 'backup.sh'), backupScript);
    fs.writeFileSync(path.join(this.projectRoot, 'monitor.sh'), monitoringScript);

    // Make scripts executable
    const { execSync } = require('child_process');
    try {
      execSync('chmod +x deploy.sh backup.sh monitor.sh', { cwd: this.projectRoot });
    } catch (error) {
      this.log('Note: Could not make scripts executable (Windows system)', 'info');
    }

    this.log('Deployment scripts created', 'success');
  }

  createDeploymentDocumentation() {
    this.log('Creating deployment documentation...');

    const deploymentGuide = `
# Production Deployment Guide

## Prerequisites

1. **Server Requirements**
   - Ubuntu 20.04+ or similar Linux distribution
   - Docker and Docker Compose installed
   - At least 2GB RAM and 20GB disk space
   - PostgreSQL 15+ (if not using Docker)
   - Redis 7+ (if not using Docker)

2. **Domain and SSL**
   - Domain name pointing to your server
   - SSL certificate (Let's Encrypt recommended)

## Quick Deployment with Docker

### 1. Clone Repository
\`\`\`bash
git clone <repository-url>
cd pnr-tracker-webapp
\`\`\`

### 2. Set Environment Variables
\`\`\`bash
export DB_PASSWORD="your-secure-database-password"
export JWT_ACCESS_SECRET="your-secure-jwt-access-secret-at-least-32-chars"
export JWT_REFRESH_SECRET="your-secure-jwt-refresh-secret-at-least-32-chars"
\`\`\`

### 3. Configure Production Environment
\`\`\`bash
# Copy and edit production environment files
cp backend/.env.production backend/.env
cp frontend/.env.production frontend/.env

# Edit the files with your production values
nano backend/.env
nano frontend/.env
\`\`\`

### 4. Deploy
\`\`\`bash
chmod +x deploy.sh
./deploy.sh
\`\`\`

## Manual Deployment

### 1. Database Setup
\`\`\`bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres createuser --interactive pnr_user
sudo -u postgres createdb pnr_tracker
sudo -u postgres psql -c "ALTER USER pnr_user PASSWORD 'your-password';"
\`\`\`

### 2. Redis Setup
\`\`\`bash
# Install Redis
sudo apt install redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server
\`\`\`

### 3. Application Setup
\`\`\`bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install dependencies
npm install

# Build applications
npm run build

# Run database migrations
cd backend && npm run migrate:up
\`\`\`

### 4. Process Management (PM2)
\`\`\`bash
# Install PM2
npm install -g pm2

# Start backend
cd backend && pm2 start dist/index.js --name pnr-backend

# Serve frontend with nginx or serve
npm install -g serve
cd frontend && pm2 start "serve -s dist -l 3000" --name pnr-frontend
\`\`\`

## SSL Configuration with Nginx

### 1. Install Nginx
\`\`\`bash
sudo apt install nginx
\`\`\`

### 2. Configure Nginx
\`\`\`bash
# Copy nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/pnr-tracker
sudo ln -s /etc/nginx/sites-available/pnr-tracker /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
\`\`\`

### 3. Install SSL Certificate
\`\`\`bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
\`\`\`

## Environment Variables Reference

### Backend (.env)
- \`DATABASE_URL\`: PostgreSQL connection string
- \`JWT_ACCESS_SECRET\`: JWT access token secret (32+ chars)
- \`JWT_REFRESH_SECRET\`: JWT refresh token secret (32+ chars)
- \`SMTP_*\`: Email configuration for notifications
- \`VAPID_*\`: Web push notification keys
- \`REDIS_URL\`: Redis connection string

### Frontend (.env)
- \`VITE_API_BASE_URL\`: Backend API URL
- \`VITE_WS_URL\`: WebSocket server URL
- \`VITE_VAPID_PUBLIC_KEY\`: Public VAPID key for push notifications

## Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT secrets (32+ characters)
- [ ] Configure firewall (UFW recommended)
- [ ] Enable SSL/TLS
- [ ] Set up regular backups
- [ ] Configure log rotation
- [ ] Enable fail2ban for SSH protection
- [ ] Update system packages regularly

## Monitoring and Maintenance

### Health Checks
\`\`\`bash
# Check application health
curl https://your-domain.com/health

# Monitor system resources
./monitor.sh
\`\`\`

### Backups
\`\`\`bash
# Create database backup
./backup.sh

# Schedule daily backups with cron
echo "0 2 * * * /path/to/backup.sh" | crontab -
\`\`\`

### Log Management
\`\`\`bash
# View application logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Or with PM2
pm2 logs pnr-backend
pm2 logs pnr-frontend
\`\`\`

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL in backend/.env
   - Verify PostgreSQL is running
   - Check firewall settings

2. **JWT Token Errors**
   - Verify JWT secrets are set correctly
   - Check token expiration settings

3. **Email Notifications Not Working**
   - Verify SMTP configuration
   - Check email provider settings
   - Test with a simple email client

4. **High Memory Usage**
   - Monitor with \`docker stats\`
   - Adjust Node.js memory limits
   - Consider scaling horizontally

### Performance Optimization

1. **Database**
   - Add database indexes for frequently queried fields
   - Configure connection pooling
   - Regular VACUUM and ANALYZE

2. **Caching**
   - Enable Redis caching
   - Configure browser caching headers
   - Use CDN for static assets

3. **Monitoring**
   - Set up application monitoring (e.g., New Relic, DataDog)
   - Configure alerts for high error rates
   - Monitor response times and throughput

## Scaling Considerations

### Horizontal Scaling
- Use load balancer (nginx, HAProxy)
- Deploy multiple backend instances
- Shared Redis and PostgreSQL instances

### Database Scaling
- Read replicas for read-heavy workloads
- Connection pooling (PgBouncer)
- Database partitioning for large datasets

### Monitoring and Alerting
- Application performance monitoring
- Infrastructure monitoring
- Log aggregation and analysis
- Automated alerting for critical issues
`;

    fs.writeFileSync(path.join(this.projectRoot, 'DEPLOYMENT.md'), deploymentGuide);

    this.log('Deployment documentation created', 'success');
  }

  async run() {
    try {
      this.log('Creating production deployment configuration...');

      this.createDockerfiles();
      this.createProductionEnvFiles();
      this.createDeploymentScripts();
      this.createDeploymentDocumentation();

      this.log('Production deployment configuration completed!', 'success');
      this.log('Next steps:');
      this.log('1. Review DEPLOYMENT.md for detailed instructions');
      this.log('2. Configure production environment variables');
      this.log('3. Set up your production server');
      this.log('4. Run: ./deploy.sh');

      return true;

    } catch (error) {
      this.log(`Deployment configuration failed: ${error.message}`, 'error');
      return false;
    }
  }
}

// Run configuration if called directly
if (require.main === module) {
  const config = new DeploymentConfig();
  
  config.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Deployment configuration failed:', error);
    process.exit(1);
  });
}

module.exports = DeploymentConfig;