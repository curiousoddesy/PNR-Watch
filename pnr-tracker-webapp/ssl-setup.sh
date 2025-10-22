#!/bin/bash

# SSL Certificate Setup with Let's Encrypt

DOMAIN="your-domain.com"
EMAIL="your-email@example.com"

echo "🔒 Setting up SSL certificate for $DOMAIN..."

# Install Certbot
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d $DOMAIN -m $EMAIL --agree-tos --non-interactive

# Test automatic renewal
sudo certbot renew --dry-run

# Set up automatic renewal cron job
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -

echo "✅ SSL certificate setup completed"
echo "📋 Certificate will auto-renew every 12 hours"
