
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
