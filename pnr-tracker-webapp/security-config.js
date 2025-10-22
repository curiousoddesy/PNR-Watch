#!/usr/bin/env node

/**
 * Security Configuration Script
 * Sets up security best practices and configurations for production deployment
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SecurityConfig {
  constructor() {
    this.projectRoot = __dirname;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  generateSecureSecret(length = 64) {
    return crypto.randomBytes(length).toString('hex');
  }

  generateVAPIDKeys() {
    // This would normally use web-push library, but for now we'll generate placeholder
    const publicKey = crypto.randomBytes(65).toString('base64url');
    const privateKey = crypto.randomBytes(32).toString('base64url');
    
    return {
      publicKey: `BP${publicKey}`,
      privateKey: privateKey
    };
  }

  createSecurityHeaders() {
    this.log('Creating security headers configuration...');

    const securityHeaders = `
# Security Headers Configuration

## Nginx Security Headers
Add these to your nginx configuration:

\`\`\`nginx
# Security Headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ws: wss:; frame-ancestors 'self';" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
\`\`\`

## Express.js Security Middleware
The application already includes:
- Helmet.js for security headers
- CORS configuration
- Rate limiting
- Input validation
- JWT authentication

## Additional Security Measures
1. **SSL/TLS Configuration**
   - Use strong cipher suites
   - Enable HSTS
   - Disable weak protocols (SSLv2, SSLv3, TLS 1.0, TLS 1.1)

2. **Database Security**
   - Use connection pooling
   - Enable SSL for database connections
   - Regular security updates
   - Principle of least privilege for database users

3. **Application Security**
   - Regular dependency updates
   - Security scanning
   - Input sanitization
   - Output encoding
   - Secure session management

4. **Infrastructure Security**
   - Firewall configuration
   - Regular OS updates
   - Intrusion detection
   - Log monitoring
   - Backup encryption
\`\`\`
`;

    fs.writeFileSync(path.join(this.projectRoot, 'SECURITY.md'), securityHeaders);
    this.log('Security headers configuration created', 'success');
  }

  createFirewallRules() {
    this.log('Creating firewall configuration...');

    const firewallScript = `#!/bin/bash

# UFW Firewall Configuration for PNR Tracker

echo "🔥 Configuring UFW firewall..."

# Reset UFW to defaults
sudo ufw --force reset

# Set default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (change port if using non-standard)
sudo ufw allow 22/tcp comment 'SSH'

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

# Allow application ports (if not behind reverse proxy)
# sudo ufw allow 3001/tcp comment 'Backend API'
# sudo ufw allow 5173/tcp comment 'Frontend Dev'

# Allow database access (only from localhost or specific IPs)
# sudo ufw allow from 127.0.0.1 to any port 5432 comment 'PostgreSQL localhost'
# sudo ufw allow from YOUR_APP_SERVER_IP to any port 5432 comment 'PostgreSQL app server'

# Allow Redis access (only from localhost or specific IPs)
# sudo ufw allow from 127.0.0.1 to any port 6379 comment 'Redis localhost'

# Enable logging
sudo ufw logging on

# Enable UFW
sudo ufw --force enable

# Show status
sudo ufw status verbose

echo "✅ Firewall configuration completed"
echo "⚠️  Remember to:"
echo "   - Change SSH port if using non-standard"
echo "   - Add specific IP restrictions for database access"
echo "   - Configure fail2ban for additional protection"
`;

    const fail2banConfig = `# Fail2Ban Configuration for PNR Tracker

# /etc/fail2ban/jail.local

[DEFAULT]
# Ban time: 1 hour
bantime = 3600

# Find time: 10 minutes
findtime = 600

# Max retry: 5 attempts
maxretry = 5

# Ignore local IPs
ignoreip = 127.0.0.1/8 ::1

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 7200

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 3

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10

[nginx-botsearch]
enabled = true
filter = nginx-botsearch
logpath = /var/log/nginx/access.log
maxretry = 2

# Custom jail for application logs
[pnr-tracker-auth]
enabled = true
filter = pnr-tracker-auth
logpath = /app/logs/application.log
maxretry = 5
bantime = 1800
`;

    const fail2banFilter = `# Fail2Ban Filter for PNR Tracker Authentication
# /etc/fail2ban/filter.d/pnr-tracker-auth.conf

[Definition]
failregex = ^.*Authentication failed.*IP: <HOST>.*$
            ^.*Invalid credentials.*IP: <HOST>.*$
            ^.*Login attempt failed.*IP: <HOST>.*$

ignoreregex =
`;

    fs.writeFileSync(path.join(this.projectRoot, 'firewall-setup.sh'), firewallScript);
    fs.writeFileSync(path.join(this.projectRoot, 'fail2ban-jail.conf'), fail2banConfig);
    fs.writeFileSync(path.join(this.projectRoot, 'fail2ban-filter.conf'), fail2banFilter);

    this.log('Firewall configuration files created', 'success');
  }

  createSSLConfig() {
    this.log('Creating SSL/TLS configuration...');

    const sslConfig = `# SSL/TLS Configuration for Nginx

# Strong SSL Configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_session_tickets off;

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;

# DH Parameters (generate with: openssl dhparam -out /etc/ssl/certs/dhparam.pem 2048)
ssl_dhparam /etc/ssl/certs/dhparam.pem;

# Security Headers
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Content Security Policy
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ws: wss:; frame-ancestors 'self';" always;
`;

    const certbotScript = `#!/bin/bash

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
`;

    fs.writeFileSync(path.join(this.projectRoot, 'ssl-config.conf'), sslConfig);
    fs.writeFileSync(path.join(this.projectRoot, 'ssl-setup.sh'), certbotScript);

    this.log('SSL/TLS configuration files created', 'success');
  }

  createSecurityChecklist() {
    this.log('Creating security checklist...');

    const checklist = `
# Production Security Checklist

## Pre-Deployment Security

### Environment & Secrets
- [ ] All default passwords changed
- [ ] Strong JWT secrets generated (64+ characters)
- [ ] Database credentials secured
- [ ] SMTP credentials configured
- [ ] VAPID keys generated for push notifications
- [ ] Environment variables properly set
- [ ] Secrets not committed to version control

### Database Security
- [ ] Database user has minimal required permissions
- [ ] Database connection uses SSL
- [ ] Database backups are encrypted
- [ ] Database access restricted to application servers only
- [ ] Regular database security updates scheduled

### Application Security
- [ ] All dependencies updated to latest secure versions
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] Input validation implemented
- [ ] Output encoding in place
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Authentication and authorization working
- [ ] Session management secure

## Infrastructure Security

### Server Security
- [ ] Operating system updated
- [ ] Unnecessary services disabled
- [ ] SSH key-based authentication
- [ ] SSH root login disabled
- [ ] Firewall configured (UFW/iptables)
- [ ] Fail2ban installed and configured
- [ ] Intrusion detection system setup
- [ ] Log monitoring configured

### Network Security
- [ ] SSL/TLS certificates installed
- [ ] Strong cipher suites configured
- [ ] HSTS enabled
- [ ] Secure protocols only (TLS 1.2+)
- [ ] Network segmentation implemented
- [ ] VPN access for administration

### Monitoring & Logging
- [ ] Application logging configured
- [ ] Security event logging enabled
- [ ] Log rotation configured
- [ ] Centralized log management
- [ ] Security monitoring alerts
- [ ] Performance monitoring
- [ ] Uptime monitoring

## Post-Deployment Security

### Regular Maintenance
- [ ] Security update schedule established
- [ ] Dependency vulnerability scanning
- [ ] Regular security assessments
- [ ] Backup testing procedures
- [ ] Incident response plan
- [ ] Security training for team

### Compliance & Documentation
- [ ] Security policies documented
- [ ] Access control procedures
- [ ] Data retention policies
- [ ] Privacy policy updated
- [ ] Terms of service updated
- [ ] Compliance requirements met

## Security Testing

### Automated Testing
- [ ] Security unit tests
- [ ] Integration security tests
- [ ] Dependency vulnerability scans
- [ ] Static code analysis
- [ ] Dynamic security testing

### Manual Testing
- [ ] Penetration testing
- [ ] Security code review
- [ ] Configuration review
- [ ] Access control testing
- [ ] Data protection testing

## Incident Response

### Preparation
- [ ] Incident response plan documented
- [ ] Emergency contacts list
- [ ] Backup restoration procedures
- [ ] Communication plan
- [ ] Legal compliance procedures

### Detection & Response
- [ ] Security monitoring alerts configured
- [ ] Log analysis procedures
- [ ] Escalation procedures
- [ ] Forensic procedures
- [ ] Recovery procedures

## Compliance Considerations

### Data Protection
- [ ] Personal data inventory
- [ ] Data processing agreements
- [ ] User consent mechanisms
- [ ] Data subject rights procedures
- [ ] Cross-border data transfer compliance

### Industry Standards
- [ ] OWASP Top 10 addressed
- [ ] Security framework compliance (ISO 27001, NIST, etc.)
- [ ] Industry-specific requirements
- [ ] Audit trail requirements
- [ ] Reporting requirements

## Tools & Resources

### Security Tools
- OWASP ZAP for security testing
- Nmap for network scanning
- Lynis for system auditing
- ClamAV for malware scanning
- Tripwire for file integrity monitoring

### Monitoring Tools
- Fail2ban for intrusion prevention
- Logwatch for log analysis
- Nagios/Zabbix for system monitoring
- ELK Stack for log management
- Prometheus for metrics collection

### Update Management
- Unattended-upgrades for automatic security updates
- Dependency vulnerability scanners (npm audit, Snyk)
- Container security scanning
- Regular security advisories monitoring
`;

    fs.writeFileSync(path.join(this.projectRoot, 'SECURITY_CHECKLIST.md'), checklist);
    this.log('Security checklist created', 'success');
  }

  generateProductionSecrets() {
    this.log('Generating production secrets...');

    const secrets = {
      JWT_ACCESS_SECRET: this.generateSecureSecret(64),
      JWT_REFRESH_SECRET: this.generateSecureSecret(64),
      DB_PASSWORD: this.generateSecureSecret(32),
      ADMIN_PASSWORD: this.generateSecureSecret(16),
      VAPID_KEYS: this.generateVAPIDKeys()
    };

    const secretsTemplate = `
# Production Secrets Template
# IMPORTANT: Store these securely and never commit to version control

# Database
DB_PASSWORD=${secrets.DB_PASSWORD}

# JWT Secrets
JWT_ACCESS_SECRET=${secrets.JWT_ACCESS_SECRET}
JWT_REFRESH_SECRET=${secrets.JWT_REFRESH_SECRET}

# Admin User
ADMIN_EMAIL=admin@your-domain.com
ADMIN_PASSWORD=${secrets.ADMIN_PASSWORD}

# Push Notifications
VAPID_PUBLIC_KEY=${secrets.VAPID_KEYS.publicKey}
VAPID_PRIVATE_KEY=${secrets.VAPID_KEYS.privateKey}
VAPID_EMAIL=noreply@your-domain.com

# Instructions:
# 1. Copy these values to your production .env file
# 2. Update email addresses with your actual domain
# 3. Store backup copies securely (password manager, encrypted storage)
# 4. Delete this file after copying values
# 5. Never commit secrets to version control
`;

    fs.writeFileSync(path.join(this.projectRoot, 'production-secrets.txt'), secretsTemplate);
    this.log('Production secrets generated in production-secrets.txt', 'success');
    this.log('⚠️  IMPORTANT: Secure these secrets and delete the file after use!', 'error');
  }

  async run() {
    try {
      this.log('Setting up security configuration...');

      this.createSecurityHeaders();
      this.createFirewallRules();
      this.createSSLConfig();
      this.createSecurityChecklist();
      this.generateProductionSecrets();

      this.log('Security configuration completed!', 'success');
      this.log('Next steps:');
      this.log('1. Review SECURITY.md and SECURITY_CHECKLIST.md');
      this.log('2. Copy secrets from production-secrets.txt to your .env file');
      this.log('3. Run firewall-setup.sh on your server');
      this.log('4. Configure SSL with ssl-setup.sh');
      this.log('5. Set up fail2ban with the provided configuration');

      return true;

    } catch (error) {
      this.log(`Security configuration failed: ${error.message}`, 'error');
      return false;
    }
  }
}

// Run configuration if called directly
if (require.main === module) {
  const config = new SecurityConfig();
  
  config.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Security configuration failed:', error);
    process.exit(1);
  });
}

module.exports = SecurityConfig;