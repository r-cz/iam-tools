# Deployment Guide

This project is configured for deployment on Cloudflare Pages with Cloudflare Functions for backend API support.

## Overview

The deployment process is automated through a GitHub integration with Cloudflare Pages:

1. Changes pushed to the `main` branch trigger a new deployment
2. Cloudflare Pages builds the project using the build command in `package.json`
3. The static assets are deployed to Cloudflare's edge network
4. Cloudflare Functions are deployed alongside the static assets

## Cloudflare Pages Configuration

### Build Configuration

The deployment uses the following settings:

- **Build Command**: `bun run build`
- **Build Output Directory**: `dist`
- **Node.js Version**: 18.x (or the latest LTS version supported by Cloudflare Pages)

### Environment Variables

No special environment variables are required for basic deployment. However, you may configure the following if needed:

- **NODE_ENV**: Set to `production` for production builds (default in Cloudflare Pages)
- **CORS_ALLOWED_ORIGINS**: Comma-separated list of allowed origins for CORS

### Custom Domains

The site can be configured with custom domains through the Cloudflare Pages dashboard:

1. Add your domain in the Cloudflare Pages project settings
2. Configure DNS records in your Cloudflare DNS dashboard
3. Cloudflare will automatically provision an SSL certificate

## Cloudflare Functions

The project uses Cloudflare Functions (formerly Workers) for backend API functionality.

### Function Structure

Functions are located in the `functions/` directory:

- `functions/_middleware.ts`: Global middleware for all functions
- `functions/_routes.json`: Custom routing rules
- `functions/api/cors-proxy/[[path]].ts`: CORS proxy implementation
- `functions/api/jwks/index.ts`: JWKS endpoint implementation

### Function URLs

In production, functions are accessible at:

- CORS Proxy: `https://your-domain.com/api/cors-proxy/*`
- JWKS Endpoint: `https://your-domain.com/api/jwks/`

### Function Development

For local development of functions:

1. Use `bun run dev:all` to start both the Vite dev server and the functions
2. Functions will be accessible at `http://localhost:8788/api/*`

## Manual Deployment

If you need to deploy manually:

1. Build the project:
   ```bash
   bun run build
   ```

2. Deploy using Wrangler CLI (Cloudflare's deployment tool):
   ```bash
   npx wrangler pages deploy dist
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

The current deployment pipeline is:

1. Developers push changes to GitHub
2. GitHub triggers a build in Cloudflare Pages
3. Cloudflare Pages builds and deploys the application
4. The deployment is automatically available at the configured domains

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
