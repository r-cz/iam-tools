# Deployment Guide

This project is configured for deployment on Cloudflare Workers with static assets for the React app.

## Overview

You can deploy using Wrangler directly or via GitHub Actions:

1. Changes pushed to the `main` branch trigger a CI workflow
2. CI builds the app and runs tests
3. Wrangler deploys the Worker and static assets to Cloudflare's edge network

## Cloudflare Workers Configuration

### Build Configuration

- Build the frontend: `bun run build` (outputs to `dist/`)
- The Worker entry is `src/worker.ts` (routes API and serves static assets)

### Environment Variables

No special environment variables are required for basic deployment. However, you may configure the following if needed:

- **CORS_ALLOWED_ORIGINS**: Comma-separated list of allowed origins for CORS (disallowed origins receive `403`)
- **APP_VERSION**: Release version string embedded in the frontend (defaults to package.json version)
- **DEMO_REDIRECT_URIS**: Comma-separated additional exact callback URLs for the demo provider
- **DEMO_TOKEN_SIGNING_SECRET**: Optional Worker secret used for strict HMAC-signed, artifact-tagged demo grants (`v2.<payload>.<sig>`)

Configure sensitive values with `bunx wrangler secret put DEMO_TOKEN_SIGNING_SECRET`; never place
them in `wrangler.jsonc` or commit local secret files.

### Custom Domains

You can bind a custom domain to your Worker in the Cloudflare dashboard:

1. Add a route (e.g., `example.com/*`) to your Worker
2. Configure DNS (A/AAAA/CNAME) to point at Cloudflare for your domain
3. Cloudflare automatically provisions an SSL certificate

## Cloudflare Worker (API + Assets)

- API routes are implemented within `src/worker.ts`
- Static assets are served from `dist/` via the `assets` binding
- SPA fallback is enabled with `not_found_handling: "single-page-application"`

## Disabling Cloudflare Pages

If you previously had a Cloudflare Pages project connected:

1. Go to Cloudflare Dashboard → Pages → your project
2. Settings → Build & deployments → disable "Preview deployments" (optional)
3. Either disconnect the GitHub integration or delete the Pages project to prevent duplicate deploys

## Workers Preview Environments (PRs)

This repo deploys preview Workers per pull request via GitHub Actions:

- Workflow: `.github/workflows/wrangler-preview.yml`
- Worker name pattern: `iam-tools-pr-<PR_NUMBER>`
- Deployed on PR open/update; deleted on PR close (best-effort)
- Previews are skipped for forked pull requests (no repository secrets available on forks)

### API URLs

The authoritative endpoint, method, error-shape, and rate-limit contract is in
[API Documentation](./api.md). All Worker API routes are served under `https://your-domain.com/api/`.

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

1. Run all tests: `bun run test`
2. Ensure the build completes successfully: `bun run build`
3. Preview the production build locally: `bun run preview`
4. Verify all features work as expected

### Monitoring Deployments

Monitor your deployments in the Cloudflare dashboard:

1. Verify the Worker deployment status
2. Confirm the site loads correctly
3. Test API endpoints after deployment
4. Check logs and error reports

### Rollbacks

If a deployment causes issues, you can redeploy a previous build using Wrangler or the Cloudflare dashboard.

## Deployment Pipeline

Typical pipeline:

1. Developers push changes to GitHub
2. GitHub Actions build and test the app
3. Wrangler deploys the Worker and static assets

## DNS Configuration

If managing your own DNS for a custom domain, ensure your domain is proxied by Cloudflare and add a route to your Worker in the dashboard.

## Security Considerations

The deployment includes several security measures:

1. Automatic HTTPS for all traffic
2. HTTP security headers set by the Worker in `src/worker.ts` (see `withSecurityHeaders`)
3. API request validation in function handlers
4. Strict allow-listing for the CORS proxy (well-known/JWKS endpoints, `GET/HEAD` only)
5. In-worker rate limiting on `/api/cors-proxy` and demo OAuth endpoints (`429` with `Retry-After`)
6. Tagged auth-code/refresh-token envelopes, with HMAC integrity when `DEMO_TOKEN_SIGNING_SECRET` is configured
7. Demo JWT signature checks in `/api/userinfo` and `/api/introspect` before treating tokens as active
8. Regular security updates through GitHub dependency management

## Performance Optimizations

The deployment benefits from several performance optimizations:

1. Assets are served from Cloudflare's global edge network
2. Static assets are cached according to best practices
3. Worker runs close to users on Cloudflare's edge
4. Images and other assets are optimized during build
