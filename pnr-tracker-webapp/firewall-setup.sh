#!/bin/bash

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
