# Deployment Guide

This project is configured for deployment on Cloudflare Workers with static assets for the React app.

## Overview

The deployment process is automated through a GitHub integration with Cloudflare Pages:

1. Changes pushed to the `main` branch trigger a new deployment
2. Cloudflare Pages builds the project using the build command in `package.json`
3. The static assets are deployed to Cloudflare's edge network
4. Cloudflare Functions are deployed alongside the static assets

## Cloudflare Workers Configuration

### Build Configuration

- Build the frontend: `bun run build` (outputs to `dist/`)
- The Worker entry is `src/worker.ts` (routes API and serves static assets)

### Environment Variables

No special environment variables are required for basic deployment. However, you may configure the following if needed:

- **NODE_ENV**: Set to `production` for production builds (default in Cloudflare Pages)
- **CORS_ALLOWED_ORIGINS**: Comma-separated list of allowed origins for CORS

### Custom Domains

The site can be configured with custom domains through the Cloudflare Pages dashboard:

1. Add your domain in the Cloudflare Pages project settings
2. Configure DNS records in your Cloudflare DNS dashboard
3. Cloudflare will automatically provision an SSL certificate

## Cloudflare Worker (API + Assets)

- API routes are implemented within `src/worker.ts`
- Static assets are served from `dist/` via the `assets` binding
- SPA fallback is enabled with `not_found_handling: "single_page_application"`

### API URLs

- CORS Proxy: `https://your-domain.com/api/cors-proxy/*`
- JWKS Endpoint: `https://your-domain.com/api/jwks/`
- OIDC Discovery (mock): `https://your-domain.com/api/.well-known/openid-configuration`

### Local Development

1. Use `bun run dev:all` to start Vite and the Worker
2. API endpoints are accessible at `http://localhost:8788/api/*`

## Manual Deployment

If you need to deploy manually:

1. Build the project:
   ```bash
   bun run build
   ```

2. Deploy using Wrangler CLI (Cloudflare's deployment tool):
   ```bash
   bunx wrangler deploy
   ```

## Deployment Best Practices

### Pre-Deployment Checks

Before deploying to production:

1. Run all tests: `bun test`
2. Ensure the build completes successfully: `bun run build`
3. Preview the production build locally: `bun run preview`
4. Verify all features work as expected

### Monitoring Deployments

Monitor your deployments:

1. Check the Cloudflare Pages dashboard for build statuses
2. Verify that the deployed site loads correctly
3. Test API endpoints after deployment
4. Monitor for any errors in the Cloudflare dashboard

### Rollbacks

If a deployment causes issues:

1. Go to the Cloudflare Pages dashboard
2. Find the last known good deployment
3. Click "Rollback to this version"

## Deployment Pipeline

Typical pipeline:

1. Developers push changes to GitHub
2. GitHub Actions build and test the app
3. Wrangler deploys the Worker and static assets

## DNS Configuration

If managing your own DNS for a custom domain:

1. Add a CNAME record pointing to `your-project.pages.dev`
2. If using Cloudflare as your DNS provider, ensure the CNAME is proxied (orange cloud)

## Security Considerations

The deployment includes several security measures:

1. Automatic HTTPS for all traffic
2. HTTP security headers configured in `_middleware.ts`
3. API request validation in function handlers
4. Regular security updates through GitHub dependency management

## Performance Optimizations

The deployment benefits from several performance optimizations:

1. Assets are served from Cloudflare's global edge network
2. Static assets are cached according to best practices
3. Functions run close to users on Cloudflare's edge
4. Images and other assets are optimized during build
