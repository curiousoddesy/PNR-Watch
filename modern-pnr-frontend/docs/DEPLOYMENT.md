# Deployment Guide

This document provides comprehensive instructions for deploying the Modern PNR Frontend to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Build Process](#build-process)
- [Deployment Options](#deployment-options)
- [Security Considerations](#security-considerations)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- Node.js 20.x or higher
- npm 10.x or higher
- Git
- Modern web server (Nginx, Apache, or CDN)

### Development Tools

- Docker (optional, for containerized deployment)
- AWS CLI (for AWS deployment)
- Netlify CLI (for Netlify deployment)

## Environment Configuration

### Required Environment Variables

Create environment-specific configuration files:

#### Production (.env.production)
```bash
# API Configuration
VITE_API_URL=https://api.pnrtracker.com
VITE_SOCKET_URL=wss://api.pnrtracker.com
VITE_ENVIRONMENT=production

# Monitoring
VITE_SENTRY_DSN=your-sentry-dsn
VITE_MONITORING_ENDPOINT=/api/monitoring

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_VOICE=true
VITE_ENABLE_OFFLINE=true

# Build Configuration
VITE_BUILD_VERSION=1.0.0
VITE_BUILD_TIMESTAMP=2024-01-01T00:00:00Z
```

#### Staging (.env.staging)
```bash
# API Configuration
VITE_API_URL=https://staging-api.pnrtracker.com
VITE_SOCKET_URL=wss://staging-api.pnrtracker.com
VITE_ENVIRONMENT=staging

# Monitoring
VITE_SENTRY_DSN=your-staging-sentry-dsn
VITE_MONITORING_ENDPOINT=/api/monitoring

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_VOICE=true
VITE_ENABLE_OFFLINE=true
```

### Security Configuration

#### Content Security Policy
```javascript
// Add to your web server configuration
const csp = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' wss: https:;
  worker-src 'self';
  manifest-src 'self';
`
```

## Build Process

### 1. Install Dependencies
```bash
npm ci --production=false
```

### 2. Run Quality Checks
```bash
# Lint code
npm run lint

# Run tests
npm run test

# Type check
npx tsc --noEmit
```

### 3. Security Audit
```bash
# Run security audit
node scripts/security-audit.js

# Check for vulnerabilities
npm audit --audit-level=moderate
```

### 4. Build Application
```bash
# Production build
npm run build

# Analyze bundle (optional)
npm run build:analyze
```

### 5. Performance Check
```bash
# Check bundle sizes and performance
npm run size-check
node scripts/performance-check.js
```

## Deployment Options

### Option 1: AWS S3 + CloudFront

#### Setup
```bash
# Install AWS CLI
aws configure

# Create S3 bucket
aws s3 mb s3://your-pnr-frontend-bucket

# Enable static website hosting
aws s3 website s3://your-pnr-frontend-bucket \
  --index-document index.html \
  --error-document index.html
```

#### Deploy
```bash
# Sync files to S3
aws s3 sync dist/ s3://your-pnr-frontend-bucket --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

#### CloudFront Configuration
```json
{
  "Origins": [{
    "DomainName": "your-pnr-frontend-bucket.s3.amazonaws.com",
    "OriginPath": "",
    "CustomOriginConfig": {
      "HTTPPort": 80,
      "HTTPSPort": 443,
      "OriginProtocolPolicy": "https-only"
    }
  }],
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-your-pnr-frontend-bucket",
    "ViewerProtocolPolicy": "redirect-to-https",
    "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
    "Compress": true
  },
  "CustomErrorResponses": [{
    "ErrorCode": 404,
    "ResponseCode": 200,
    "ResponsePagePath": "/index.html"
  }]
}
```

### Option 2: Netlify

#### Setup
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize site
netlify init
```

#### Deploy
```bash
# Deploy to production
netlify deploy --prod --dir=dist

# Or use the deployment script
./scripts/deploy.sh production
```

#### Netlify Configuration (_redirects)
```
# Handle client-side routing
/*    /index.html   200

# API proxy (optional)
/api/*  https://api.pnrtracker.com/:splat  200

# Security headers
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### Option 3: Docker + Nginx

#### Dockerfile
```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Add security headers
COPY security-headers.conf /etc/nginx/conf.d/security-headers.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Security headers
    include /etc/nginx/conf.d/security-headers.conf;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/javascript application/xml+rss 
               application/json application/xml;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Handle client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Service worker
    location /sw.js {
        add_header Cache-Control "no-cache";
        expires 0;
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

### Option 4: Custom Server

#### Using the Deployment Script
```bash
# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production
./scripts/deploy.sh production --force

# Dry run (see what would be deployed)
./scripts/deploy.sh production --dry-run
```

## Security Considerations

### 1. HTTPS Configuration
- Always use HTTPS in production
- Configure HSTS headers
- Use strong SSL/TLS ciphers

### 2. Security Headers
```nginx
# Add to your web server configuration
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' wss: https:;" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
```

### 3. Environment Security
- Never commit secrets to version control
- Use environment variables for configuration
- Rotate API keys and tokens regularly
- Enable audit logging

### 4. Dependency Security
- Run `npm audit` regularly
- Keep dependencies updated
- Use `npm ci` for production builds
- Monitor for security advisories

## Monitoring and Maintenance

### 1. Application Monitoring
- Set up error tracking (Sentry)
- Monitor Web Vitals
- Track user interactions
- Set up alerts for critical issues

### 2. Infrastructure Monitoring
- Monitor server resources
- Set up uptime monitoring
- Track CDN performance
- Monitor SSL certificate expiration

### 3. Performance Monitoring
- Use Lighthouse CI
- Monitor bundle sizes
- Track Core Web Vitals
- Set performance budgets

### 4. Security Monitoring
- Regular security audits
- Dependency vulnerability scanning
- Monitor for suspicious activity
- Keep security patches updated

## Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version  # Should be 20.x or higher

# Run with verbose logging
npm run build --verbose
```

#### Performance Issues
```bash
# Analyze bundle
npm run build:analyze

# Check bundle sizes
npm run size-check

# Run performance audit
node scripts/performance-check.js
```

#### Security Issues
```bash
# Run security audit
node scripts/security-audit.js

# Check for vulnerabilities
npm audit --audit-level=moderate

# Fix vulnerabilities
npm audit fix
```

#### Deployment Issues
```bash
# Check environment variables
env | grep VITE_

# Verify build output
ls -la dist/

# Test locally
npm run preview
```

### Rollback Procedure

#### AWS S3 + CloudFront
```bash
# List previous versions
aws s3api list-object-versions --bucket your-bucket

# Restore previous version
aws s3 sync s3://your-backup-bucket/backup-timestamp/ s3://your-bucket/

# Invalidate cache
aws cloudfront create-invalidation --distribution-id ID --paths "/*"
```

#### Netlify
```bash
# List deployments
netlify api listSiteDeploys --data '{"site_id": "your-site-id"}'

# Restore previous deployment
netlify api restoreSiteDeploy --data '{"site_id": "your-site-id", "deploy_id": "deploy-id"}'
```

### Support and Maintenance

#### Regular Tasks
- [ ] Weekly dependency updates
- [ ] Monthly security audits
- [ ] Quarterly performance reviews
- [ ] Annual architecture reviews

#### Emergency Procedures
1. Identify the issue
2. Check monitoring dashboards
3. Review recent deployments
4. Rollback if necessary
5. Fix the issue
6. Deploy the fix
7. Verify the solution
8. Document the incident

For additional support, refer to the project documentation or contact the development team.