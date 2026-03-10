# Netlify Deployment - Quick Troubleshooting Reference

## Quick Diagnostics Checklist

### Build Failures
- [ ] Check build command in `netlify.toml` matches `package.json` script
- [ ] Verify all dependencies are in `package.json`
- [ ] Check Node.js version compatibility
- [ ] Review build logs for specific error messages

### Environment Variables
- [ ] Confirm variables exist in Netlify dashboard
- [ ] Check variable names are exact matches (case-sensitive)
- [ ] Verify variables are set for correct deploy context
- [ ] Test variables in deploy preview first

### Deployment Issues
- [ ] Check GitHub integration permissions
- [ ] Verify branch settings and deploy contexts
- [ ] Review redirect rules in `netlify.toml`
- [ ] Confirm publish directory contains built files

## Common Error Messages & Solutions

| Error Message | Likely Cause | Quick Fix |
|---------------|--------------|-----------|
| `Command "npm run build:production" not found` | Missing script in package.json | Add script to package.json |
| `Module not found` | Missing dependency | Add to package.json and redeploy |
| `ENOENT: no such file or directory` | Wrong publish directory | Check build output location |
| `404 - Page not found` | Missing SPA redirect | Add `/*` → `/index.html` redirect |
| `Environment variable undefined` | Missing env var | Add to Netlify dashboard |
| `Build exceeded time limit` | Build too slow | Optimize build process |
| Netlify build loops / never finishes | `postbuild` calling `npm run size-check` which re-triggers `build` | Call `node scripts/size-check.js` directly in `postbuild` (fixed in `27083e1`) |
| `process.exit(1)` from `validate-env.js` on Netlify | Script exits when `VITE_*` vars missing in production context | Env vars aren't used in code; script now warns only (fixed in `27083e1`) |

## Emergency Response Steps

### Site is Down
1. Check [Netlify Status](https://netlifystatus.com/)
2. Review latest deployment logs
3. Rollback to previous working deployment
4. Contact team if issue persists

### Build Failing
1. Check build logs in Netlify dashboard
2. Test build locally with same Node version
3. Compare with last successful build
4. Create hotfix branch if needed

### Performance Issues
1. Check Netlify Analytics for traffic spikes
2. Review Core Web Vitals metrics
3. Check CDN cache status
4. Monitor third-party service dependencies

## Contact Information

- **Netlify Support**: support@netlify.com
- **Internal DevOps**: [Your team contact]
- **Emergency Escalation**: [Emergency contact]

---
*Keep this reference handy during deployments*