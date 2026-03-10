# Environment Variables Documentation

This document outlines all environment variables used in the Modern PNR Frontend application, with specific focus on production deployment to Netlify.

## Overview

The application uses environment variables for configuration management across different deployment contexts (development, staging, production). Netlify automatically handles environment variable injection during the build process.

## Core API Configuration

> **Note (March 2026):** These variables are validated by `scripts/validate-env.js` during
> the `prebuild` hook, but **none of them are actually imported in source code**.
> The frontend uses a hardcoded `const API_BASE = '/.netlify/functions'` in
> `src/services/pnrService.ts`. The validation script now warns on missing vars
> but **never exits** — the build always continues.

| Variable | Description | Example | Used in code? |
|----------|-------------|---------|---------------|
| `VITE_API_URL` | Backend API endpoint URL | `https://api.pnrtracker.com` | No — API base is hardcoded |
| `VITE_SOCKET_URL` | WebSocket endpoint for real-time updates | `wss://api.pnrtracker.com` | No |
| `VITE_ENVIRONMENT` | Environment identifier | `production` | No — only `import.meta.env.DEV` is used |

## Recommended Variables for Production

These variables enhance functionality and monitoring but are not required for basic operation:

### Monitoring & Analytics

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `VITE_SENTRY_DSN` | Sentry error tracking DSN | `https://abc123@sentry.io/123456` | 🔶 |
| `VITE_GA_ID` | Google Analytics tracking ID | `G-XXXXXXXXXX` | 🔶 |
| `VITE_MONITORING_ENDPOINT` | Custom analytics endpoint | `/api/monitoring` | 🔶 |

### Third-party Services

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `VITE_MAPS_API_KEY` | External map service API key | `AIzaSyC4R6AN7SmxjPUIGKdyBDRr4b9zK-3A1B2` | 🔶 |
| `VITE_VAPID_PUBLIC_KEY` | Push notification VAPID public key | `BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U` | 🔶 |

## Netlify Auto-Generated Variables

Netlify automatically provides these variables during build - **do not set manually**:

| Variable | Description | Auto-Generated |
|----------|-------------|----------------|
| `NETLIFY` | Indicates Netlify build environment | `true` |
| `COMMIT_REF` | Git commit SHA | `abc123def456` |
| `BRANCH` | Git branch name | `main` |
| `CONTEXT` | Deployment context | `production`, `deploy-preview`, `branch-deploy` |
| `URL` | Site production URL | `https://site-name.netlify.app` |
| `DEPLOY_URL` | Current deploy URL | `https://deploy-preview-123--site-name.netlify.app` |
| `DEPLOY_PRIME_URL` | Primary deploy URL | Same as `DEPLOY_URL` |

## Feature Flags

Control application features through environment variables:

| Variable | Description | Default | Production Value |
|----------|-------------|---------|------------------|
| `VITE_ENABLE_ANALYTICS` | Enable/disable analytics tracking | `false` | `true` |
| `VITE_ENABLE_VOICE` | Enable/disable voice features | `true` | `true` |
| `VITE_ENABLE_OFFLINE` | Enable/disable offline functionality | `true` | `true` |
| `VITE_ENABLE_QR_SCANNER` | Enable/disable QR code scanning | `true` | `true` |
| `VITE_ENABLE_MAPS` | Enable/disable map integration | `true` | `true` |
| `VITE_ENABLE_NOTIFICATIONS` | Enable/disable push notifications | `true` | `true` |

## Development vs Production Configuration

### Development Settings
```bash
VITE_DEV_TOOLS=true
VITE_MOCK_API=false
VITE_DEBUG=false
VITE_ENABLE_ANALYTICS=false
```

### Production Settings
```bash
VITE_DEV_TOOLS=false
VITE_MOCK_API=false
VITE_DEBUG=false
VITE_ENABLE_ANALYTICS=true
```

## Setting Up Environment Variables in Netlify

### Method 1: Netlify Dashboard (Recommended)

1. Go to your site in the Netlify dashboard
2. Navigate to **Site Settings** > **Environment Variables**
3. Click **Add a variable**
4. Enter the variable name and value
5. Select the appropriate scopes:
   - **Production**: For production deployments
   - **Deploy previews**: For pull request previews
   - **Branch deploys**: For branch-specific deployments

### Method 2: netlify.toml Configuration

```toml
[build.environment]
  VITE_ENVIRONMENT = "production"
  VITE_ENABLE_ANALYTICS = "true"
  VITE_DEV_TOOLS = "false"

[context.production.environment]
  VITE_API_URL = "https://api.pnrtracker.com"
  VITE_SOCKET_URL = "wss://api.pnrtracker.com"

[context.deploy-preview.environment]
  VITE_API_URL = "https://staging-api.pnrtracker.com"
  VITE_SOCKET_URL = "wss://staging-api.pnrtracker.com"
```

### Method 3: Netlify CLI

```bash
# Set a single variable
netlify env:set VITE_API_URL "https://api.pnrtracker.com"

# Import from file
netlify env:import .env.production
```

## Environment Variable Validation

The application includes automatic environment variable validation during the build process:

### Validation Script Location
`scripts/validate-env.js`

### Validation Rules
- **Required variables**: Warnings are logged if missing, but the build **always continues** (no `process.exit(1)`)
- **Format validation**: URLs are validated for correct format (if present)
- **Auto-generation**: Build metadata (`VITE_BUILD_VERSION`, `VITE_BUILD_TIMESTAMP`) is automatically generated
- **Context-aware**: Different log messages for Netlify vs local, but behaviour is the same — warn and continue

### Build Process Integration
```json
{
  "scripts": {
    "prebuild": "node scripts/validate-env.js",
    "build": "vite build"
  }
}
```

## Security Considerations

### Sensitive Variables
- Never commit actual API keys or secrets to version control
- Use Netlify's encrypted environment variables for sensitive data
- Prefix client-side variables with `VITE_` (they will be exposed in the bundle)

### Variable Exposure
- All `VITE_*` variables are included in the client-side bundle
- Server-side variables (without `VITE_` prefix) are only available during build
- Use server-side variables for build-time secrets (API keys for build tools, etc.)

## Troubleshooting

### Common Issues

1. **Build logs show "Missing required environment variable"**
   - This is a **warning only** — the build will continue regardless
   - The variables listed as "required" are not actually used in the source code
   - No action needed unless you add code that reads `import.meta.env.VITE_*`

2. **API calls fail in production**
   - Verify `VITE_API_URL` points to correct production endpoint
   - Check that API endpoint is accessible from Netlify's build environment

3. **Features not working as expected**
   - Check feature flag environment variables
   - Verify boolean values are strings (`"true"` not `true`)

4. **Build succeeds but runtime errors occur**
   - Check browser console for environment variable related errors
   - Verify all client-side variables are properly prefixed with `VITE_`

### Debug Commands

```bash
# Check current environment variables (local)
npm run validate-env

# Build with environment debugging
VITE_DEBUG=true npm run build

# Preview production build locally
npm run preview
```

## Migration Guide

### From Development to Production

1. Copy `.env.example` to `.env.production`
2. Update API URLs to production endpoints
3. Set production feature flags
4. Add monitoring and analytics variables
5. Configure variables in Netlify dashboard
6. Test deployment with deploy preview

### Environment-Specific Overrides

Use Netlify's context-specific environment variables to override settings for different deployment contexts:

- **Production**: Live site variables
- **Deploy Preview**: Staging API endpoints for PR testing
- **Branch Deploy**: Feature-specific configurations

## Best Practices

1. **Use descriptive variable names** with consistent prefixing
2. **Document all variables** with purpose and example values
3. **Validate variables** during build process
4. **Use context-specific overrides** for different environments
5. **Keep sensitive data secure** using Netlify's encrypted storage
6. **Test thoroughly** with deploy previews before production
7. **Monitor usage** and update documentation as variables change

## Related Files

- `.env.example` - Template for all environment variables
- `.env.production` - Production-specific template
- `scripts/validate-env.js` - Environment validation script
- `netlify.toml` - Netlify configuration with environment settings
- `vite.config.ts` - Build configuration that uses environment variables