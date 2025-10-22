#!/bin/bash

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
