# IAM Tools

A collection of specialized tools for Identity and Access Management (IAM) development and debugging. These tools help developers understand, troubleshoot, and work with various IAM technologies like JWT tokens, OIDC providers, and OAuth 2.0 flows.

## Technologies

- **Frontend**: Vite + React + TypeScript
- **UI Framework**: Tailwind CSS v4
- **Components**: shadcn/ui
- **Package Manager**: Bun
- **Routing**: React Router
- **Testing**: Bun Test + React Testing Library + Playwright
- **Deployment**: Cloudflare Workers (with static assets)

## Development

```bash
# Install dependencies
bun install

# Start development server (Vite only)
bun run dev

# Start API worker (CORS proxy, JWKS, etc.)
bun run proxy

# Start both development server and API worker (blocks terminal)
bun run dev:all

# Start servers detached (runs in background with logs in .logs directory)
bun run dev:detach      # Both Vite and proxy
bun run dev:detach:vite # Only Vite
bun run dev:detach:proxy # Only proxy

# Stop all running development servers
bun run dev:stop

# Build for production
bun run build

# Preview production build
bun run preview
```

## Maintenance

```bash
# Lint the codebase
bun run lint

# Clean the project
bun run clean       # Standard clean (node_modules, dist)
bun run clean:dry   # Preview what will be cleaned
bun run clean:deep  # Deep clean (includes lock files)
```

## Pre-commit Hooks

This repository ships with a [pre-commit](https://pre-commit.com/) configuration to keep common issues from landing in mainline branches.

```bash
# Install the Python pre-commit tool once
pip install pre-commit

# Install the git hook
pre-commit install

# (Optional) run against entire codebase
pre-commit run --all-files
```

The configured hooks cover:

- Consistency checks for JSON/YAML, trailing whitespace, unexpected merge markers, and large files
- Prettier formatting using the repo's `.prettierrc`
- ESLint on staged JS/TS files (runs via `bunx eslint --max-warnings=0`)
- TypeScript type-checking (`bunx tsc -p tsconfig.app.json --noEmit`)

## Testing

The project uses a comprehensive testing strategy with two complementary approaches:

### Unit & Integration Tests

Powered by Bun's built-in test runner with React Testing Library:

```bash
# Run all unit tests
bun test

# Run tests in watch mode
bun test:watch

# Run tests with coverage
bun test:coverage

# Update snapshots
bun test:update
```

Unit tests are located in `src/tests/` and include:

- Component tests with snapshot testing
- Feature module integration tests
- Hook and utility function tests
- API mocking with custom test utilities

### End-to-End Tests

Powered by Playwright for full user flow testing:

```bash
# Install Playwright browsers (first time setup)
bun run e2e:install

# Run E2E tests (Chromium only)
bun run e2e

# Run E2E tests on all browsers
bun run e2e:all

# Run tests in interactive UI mode
bun run e2e:ui

# Debug tests with browser visible
bun run e2e:headed
```

E2E tests are located in `e2e/` and cover:

- Navigation and routing
- OAuth 2.0 flow testing (auth code + PKCE, client credentials)
- OIDC configuration exploration
- Token inspection and validation
- User interactions and error handling

For Playwright tips, selector patterns, and debugging guidance, see `e2e/README.md`.

### Testing Architecture

- **Unit Tests**: Test individual functions and components in isolation
- **Integration Tests**: Test feature modules with mocked APIs
- **E2E Tests**: Test complete user flows with real browser interactions
- **Mocking**: Custom API mocks for predictable testing without external dependencies
- **CI/CD**: All tests run automatically on GitHub Actions for every PR

## CORS Proxy

The application includes a CORS proxy for accessing external APIs that don't have CORS headers configured to allow requests from our domain. This is particularly useful for fetching `.well-known` endpoints and JWKS URIs from identity providers.

The proxy works by:

1. Receiving requests from our frontend at `/api/cors-proxy/{url}`
2. Forwarding the request to the target URL
3. Adding the necessary CORS headers to the response
4. Returning the modified response to our frontend

### Local Development

For local development, the API worker (including the CORS proxy) runs on port 8788. You can start both the Vite development server and the worker in several ways:

```bash
# Start both servers (blocks terminal):
bun run dev:all

# Start servers detached (runs in background, logs in .logs directory):
bun run dev:detach      # Both Vite and proxy
bun run dev:detach:vite # Only Vite
bun run dev:detach:proxy # Only proxy

# To stop all servers:
bun run dev:stop
```

To start only the API worker:

```bash
bun run proxy
```

## Adding shadcn Components

This project uses [shadcn/ui](https://ui.shadcn.com/) for component styling. To add new components:

```bash
# Add a component
bunx --bun shadcn@latest add [component-name]

# Examples
bunx --bun shadcn@latest add button
bunx --bun shadcn@latest add card
bunx --bun shadcn@latest add tabs
```

The components are added to `src/components/ui` and can be imported and used throughout the application.

## Application Structure

We use a feature-based organization pattern that groups code by functionality:

- `src/features` - Each tool is a separate feature module
  - `src/features/tokenInspector` - Token inspection tool
    - `components/` - Feature-specific components
    - `utils/` - Feature-specific utilities
    - `data/` - Feature-specific data
    - `pages/` - Feature pages (routes)
  - `src/features/oidcExplorer` - OIDC configuration explorer
    - `components/` - Feature-specific components
    - `utils/` - Feature-specific utilities
    - `data/` - Feature-specific data
    - `pages/` - Feature pages (routes)
  - `src/features/oauthPlayground` - OAuth flow testing tool
    - `components/` - Feature-specific components
    - `utils/` - Feature-specific utilities
    - `pages/` - Feature pages (routes)
  - `src/features/home` - Homepage components
- `src/components` - Shared components
  - `src/components/layout` - Layout components
  - `src/components/navigation` - Navigation components (sidebar, menus)
  - `src/components/common` - Common UI components
  - `src/components/ui` - shadcn UI components
  - `src/components/theme` - Theme components
  - `src/components/page` - Page layout components
- `src/types` - Shared TypeScript type definitions
- `src/lib` - Utility functions and shared libraries
- `src/hooks` - Custom React hooks (useIsMobile, useLocalStorage, useDebounce, useClipboard)
- `src/tests` - Test files following the same structure as the application
- `src/worker.ts` - Cloudflare Worker (backend API and static asset serving)

See [docs/file-structure.md](docs/file-structure.md) for more details on the codebase organization.

## Available Tools

### Token Inspector

Analyze and debug JWT tokens with detailed information about:

- Header and payload contents
- Signature validation using JWKS
- Token expiration timelines
- Standard claim validation

See [Token Inspector Documentation](docs/feature-guides/token-inspector.md) for detailed usage instructions.

### OIDC Explorer

Explore and analyze OpenID Connect provider configurations:

- Fetch and display `.well-known/openid-configuration` details
- Fetch and inspect the provider's JSON Web Key Set (JWKS)
- Identify common providers based on issuer URL or configuration

See [OIDC Explorer Documentation](docs/feature-guides/oidc-explorer.md) for detailed usage instructions.

### OAuth Playground

Test and explore OAuth 2.0 flows interactively:

- Walk through the Authorization Code with PKCE flow step by step
- Test with your own IdP or use a demo mode with a simulated identity provider
- Generate PKCE parameters, build authorization requests, and exchange codes for tokens
- Visualize the complete OAuth flow for learning and debugging
- Token introspection (RFC 7662) with demo mode support and claim explanations

See [OAuth Playground Documentation](docs/feature-guides/oauth-playground.md) for detailed usage instructions.

### SAML Suite

Tools for working with SAML messages and metadata:

- Response Decoder with signature verification (paste IdP cert)
- AuthnRequest Builder for HTTP-POST and HTTP-Redirect (optional Redirect signing)
- Metadata Validator with signature verification
- SP Metadata XML generator with optional signing cert

See [SAML Suite Documentation](docs/feature-guides/saml-suite.md) for details.

### LDAP Tools

Explore and validate LDAP data sets:

- Schema Explorer for RFC/vendor schema parsing and visualization
- LDIF Builder & Viewer with schema-based validation and templates
- Local-only storage for saved schema snapshots

## Deployment

The application deploys as a Cloudflare Worker (serving both API routes and static assets). A typical deployment includes:

1. Building the application with `bun run build`
2. Deploying static assets (dist/) and the Worker via Wrangler

For more information about the deployment process, see [Deployment Documentation](docs/deployment.md).

## Documentation

- [Getting Started Guide](docs/getting-started.md) - How to set up and run the project
- [Architecture Overview](docs/architecture.md) - System design and principles
- [API Documentation](docs/api.md) - Details about the backend API endpoints
- [Feature Guides](docs/feature-guides/) - Usage guides for specific features
- [Contributing Guide](docs/contributing.md) - How to contribute to the project
- Full docs index: `docs/README.md`
- Styling & Tailwind v4: `docs/styling.md`
