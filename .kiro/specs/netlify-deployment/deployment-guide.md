# Netlify Deployment Guide

## Overview

This guide provides step-by-step instructions for setting up automated deployment of the PNR Tracker web application to Netlify through GitHub integration.

## Prerequisites

- GitHub repository with your PNR Tracker application
- Netlify account (free tier available)
- Node.js and npm installed locally for testing

## Setup Instructions for Netlify Integration

### 1. Create Netlify Account and Connect Repository

1. **Sign up for Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Sign up using your GitHub account for seamless integration

2. **Connect Your Repository**
   - Click "New site from Git" on your Netlify dashboard
   - Choose "GitHub" as your Git provider
   - Authorize Netlify to access your repositories
   - Select your PNR Tracker repository

3. **Configure Build Settings**
   - **Build command**: `npm run build:production`
   - **Publish directory**: `frontend/dist`
   - **Base directory**: Leave empty (uses root)

### 2. Repository Configuration

1. **Create netlify.toml in your repository root**
   ```toml
   [build]
     command = "npm run build:production"
     publish = "frontend/dist"
   
   [build.environment]
     NODE_VERSION = "18"
   
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   
   [[headers]]
     for = "/*"
     [headers.values]
       X-Frame-Options = "DENY"
       X-Content-Type-Options = "nosniff"
       Referrer-Policy = "strict-origin-when-cross-origin"
   ```

2. **Update package.json with build script**
   ```json
   {
     "scripts": {
       "build:production": "cd frontend && npm ci && npm run build"
     }
   }
   ```

### 3. Deploy Settings Configuration

1. **Branch Settings**
   - Production branch: `main`
   - Deploy previews: Enable for pull requests
   - Branch deploys: Enable for all branches (optional)

2. **Build Hooks** (Optional)
   - Create build hooks for manual deployments
   - Use webhook URLs for external triggers

## Environment Variable Configuration

### Setting Up Environment Variables in Netlify

1. **Access Environment Variables**
   - Go to your site dashboard in Netlify
   - Navigate to "Site settings" → "Environment variables"

2. **Required Production Variables**
   ```
   NODE_ENV=production
   VITE_API_BASE_URL=https://your-api-domain.com
   VITE_APP_TITLE=PNR Tracker
   ```

3. **Adding Variables**
   - Click "Add variable"
   - Enter key-value pairs
   - Choose scopes: "All deploy contexts" or specific contexts

### Environment Variable Best Practices

1. **Security Guidelines**
   - Never commit sensitive values to your repository
   - Use Netlify's encrypted environment variables for secrets
   - Prefix client-side variables with `VITE_` for Vite applications

2. **Variable Validation**
   - Create `.env.example` file with required variable names
   - Document all required variables in this guide
   - Implement runtime validation in your application

3. **Context-Specific Variables**
   ```toml
   [context.production.environment]
     VITE_API_BASE_URL = "https://api.production.com"
   
   [context.deploy-preview.environment]
     VITE_API_BASE_URL = "https://api.staging.com"
   ```

## Deployment Process

### Automatic Deployments

1. **Push to Main Branch**
   - Commits to `main` branch trigger production deployments
   - Build process runs automatically
   - Site updates within 2-5 minutes

2. **Pull Request Previews**
   - Each PR gets a unique preview URL
   - Preview deployments use deploy-preview context
   - Automatic updates on PR commits

### Manual Deployments

1. **Trigger Deploy**
   - Use "Trigger deploy" button in Netlify dashboard
   - Deploy specific branch or commit
   - Use build hooks for external triggers

2. **Deploy from CLI**
   ```bash
   npm install -g netlify-cli
   netlify login
   netlify deploy --prod
   ```

## Troubleshooting Guide

### Common Build Issues

#### 1. Build Command Failures

**Problem**: Build fails with "Command not found" error
```
Error: Command failed: npm run build:production
```

**Solutions**:
- Verify `package.json` contains the build script
- Check that the script path is correct
- Ensure all dependencies are listed in `package.json`

**Fix**:
```json
{
  "scripts": {
    "build:production": "cd frontend && npm ci && npm run build"
  }
}
```

#### 2. Dependency Installation Issues

**Problem**: npm install fails during build
```
Error: Cannot resolve dependency
```

**Solutions**:
- Delete `package-lock.json` and regenerate
- Check for conflicting peer dependencies
- Use `npm ci` instead of `npm install` for consistent builds

**Fix**:
```bash
# In your build command
npm ci --production=false
```

#### 3. Environment Variable Issues

**Problem**: Application fails to load due to missing environment variables
```
Error: VITE_API_BASE_URL is not defined
```

**Solutions**:
- Verify variables are set in Netlify dashboard
- Check variable names match exactly (case-sensitive)
- Ensure variables are available in correct deploy context

**Fix**:
1. Go to Site settings → Environment variables
2. Add missing variables with correct names
3. Redeploy the site

### Deployment Issues

#### 1. Deploy Previews Not Working

**Problem**: Pull requests don't generate preview deployments

**Solutions**:
- Check GitHub integration permissions
- Verify deploy preview settings are enabled
- Ensure branch is not in ignore list

**Fix**:
1. Go to Site settings → Build & deploy → Deploy contexts
2. Enable "Deploy previews" for pull requests
3. Check "Branch deploys" settings

#### 2. Custom Domain Issues

**Problem**: Custom domain not working or showing SSL errors

**Solutions**:
- Verify DNS records are correctly configured
- Wait for SSL certificate provisioning (up to 24 hours)
- Check domain verification status

**Fix**:
1. Go to Site settings → Domain management
2. Verify DNS configuration
3. Force SSL certificate renewal if needed

#### 3. Redirect Rules Not Working

**Problem**: SPA routing returns 404 errors

**Solutions**:
- Check `netlify.toml` redirect configuration
- Verify redirect syntax is correct
- Test redirects in deploy preview

**Fix**:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Performance Issues

#### 1. Slow Build Times

**Problem**: Builds take longer than 15 minutes

**Solutions**:
- Optimize build process and dependencies
- Use build caching
- Split large builds into smaller steps

**Fix**:
```toml
[build]
  command = "npm run build:production"
  
[build.processing]
  skip_processing = false
```

#### 2. Large Bundle Sizes

**Problem**: Application loads slowly due to large JavaScript bundles

**Solutions**:
- Implement code splitting
- Optimize images and assets
- Enable compression

**Fix**:
```toml
[[headers]]
  for = "*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

## Monitoring and Maintenance

### Deployment Monitoring

1. **Build Notifications**
   - Configure email notifications for build failures
   - Set up Slack/Discord webhooks for team notifications
   - Monitor deployment frequency and success rates

2. **Performance Monitoring**
   - Use Netlify Analytics for traffic insights
   - Monitor Core Web Vitals
   - Set up uptime monitoring

### Regular Maintenance Tasks

1. **Weekly Tasks**
   - Review deployment logs for errors
   - Check for security updates in dependencies
   - Monitor build performance metrics

2. **Monthly Tasks**
   - Update Node.js version if needed
   - Review and optimize build configuration
   - Audit environment variables for unused entries

## Security Considerations

### Best Practices

1. **Environment Variables**
   - Rotate API keys regularly
   - Use least-privilege access for external services
   - Audit variable access logs

2. **Build Security**
   - Keep dependencies updated
   - Use npm audit to check for vulnerabilities
   - Implement security headers

3. **Access Control**
   - Limit team member access to production settings
   - Use branch protection rules
   - Enable two-factor authentication

## Support and Resources

### Netlify Resources
- [Netlify Documentation](https://docs.netlify.com/)
- [Netlify Community Forum](https://community.netlify.com/)
- [Netlify Status Page](https://netlifystatus.com/)

### GitHub Integration
- [GitHub Apps Documentation](https://docs.github.com/en/developers/apps)
- [Webhook Configuration](https://docs.github.com/en/developers/webhooks-and-events/webhooks)

### Emergency Contacts
- Netlify Support: support@netlify.com
- Team Lead: [Your team lead contact]
- DevOps Team: [Your DevOps contact]

---

*Last updated: [Current Date]*
*Version: 1.0*