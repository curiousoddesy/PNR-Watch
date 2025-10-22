
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
```bash
git clone <repository-url>
cd pnr-tracker-webapp
```

### 2. Set Environment Variables
```bash
export DB_PASSWORD="your-secure-database-password"
export JWT_ACCESS_SECRET="your-secure-jwt-access-secret-at-least-32-chars"
export JWT_REFRESH_SECRET="your-secure-jwt-refresh-secret-at-least-32-chars"
```

### 3. Configure Production Environment
```bash
# Copy and edit production environment files
cp backend/.env.production backend/.env
cp frontend/.env.production frontend/.env

# Edit the files with your production values
nano backend/.env
nano frontend/.env
```

### 4. Deploy
```bash
chmod +x deploy.sh
./deploy.sh
```

## Manual Deployment

### 1. Database Setup
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres createuser --interactive pnr_user
sudo -u postgres createdb pnr_tracker
sudo -u postgres psql -c "ALTER USER pnr_user PASSWORD 'your-password';"
```

### 2. Redis Setup
```bash
# Install Redis
sudo apt install redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### 3. Application Setup
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install dependencies
npm install

# Build applications
npm run build

# Run database migrations
cd backend && npm run migrate:up
```

### 4. Process Management (PM2)
```bash
# Install PM2
npm install -g pm2

# Start backend
cd backend && pm2 start dist/index.js --name pnr-backend

# Serve frontend with nginx or serve
npm install -g serve
cd frontend && pm2 start "serve -s dist -l 3000" --name pnr-frontend
```

## SSL Configuration with Nginx

### 1. Install Nginx
```bash
sudo apt install nginx
```

### 2. Configure Nginx
```bash
# Copy nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/pnr-tracker
sudo ln -s /etc/nginx/sites-available/pnr-tracker /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
```

### 3. Install SSL Certificate
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

## Environment Variables Reference

### Backend (.env)
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_ACCESS_SECRET`: JWT access token secret (32+ chars)
- `JWT_REFRESH_SECRET`: JWT refresh token secret (32+ chars)
- `SMTP_*`: Email configuration for notifications
- `VAPID_*`: Web push notification keys
- `REDIS_URL`: Redis connection string

### Frontend (.env)
- `VITE_API_BASE_URL`: Backend API URL
- `VITE_WS_URL`: WebSocket server URL
- `VITE_VAPID_PUBLIC_KEY`: Public VAPID key for push notifications

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
```bash
# Check application health
curl https://your-domain.com/health

# Monitor system resources
./monitor.sh
```

### Backups
```bash
# Create database backup
./backup.sh

# Schedule daily backups with cron
echo "0 2 * * * /path/to/backup.sh" | crontab -
```

### Log Management
```bash
# View application logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Or with PM2
pm2 logs pnr-backend
pm2 logs pnr-frontend
```

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
   - Monitor with `docker stats`
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
