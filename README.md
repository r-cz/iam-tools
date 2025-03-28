# IAM Tools

A collection of specialized tools for Identity and Access Management (IAM) development and debugging. These tools help developers understand, troubleshoot, and work with various IAM technologies like JWT tokens, OIDC providers, and OAuth 2.0 flows.

## Technologies

- **Frontend**: Vite + React + TypeScript
- **UI Framework**: Tailwind CSS v4
- **Components**: shadcn/ui
- **Package Manager**: Bun
- **Routing**: React Router
- **Testing**: Bun Test + React Testing Library

## Development

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Start development server with CORS proxy
bun run dev:all

# Build for production
bun run build

# Preview production build
bun run preview

# Clean the project
bun run clean       # Standard clean (node_modules, dist)
bun run clean:dry   # Preview what will be cleaned
bun run clean:deep  # Deep clean (includes lock files)
```

## Testing

The project uses Bun's built-in test runner for fast and efficient tests:

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test:watch

# Run tests with coverage
bun test:coverage

# Update snapshots
bun test:update
```

Tests are located in `src/tests` and follow a structure mirroring the main application.

## CORS Proxy

The application includes a CORS proxy for accessing external APIs that don't have CORS headers configured to allow requests from our domain. This is particularly useful for fetching `.well-known` endpoints and JWKS URIs from identity providers.

The proxy works by:

1. Receiving requests from our frontend at `/api/cors-proxy/{url}`
2. Forwarding the request to the target URL
3. Adding the necessary CORS headers to the response
4. Returning the modified response to our frontend

### Local Development

For local development, the CORS proxy runs on port 8788. You can start both the Vite development server and the CORS proxy simultaneously with:

```bash
bun run dev:all
```

To start only the CORS proxy:

```bash
bun run dev:proxy
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

## Deployment

The application is deployed via Cloudflare Pages whenever changes are pushed to the main branch. For more information about the deployment process, see [Deployment Documentation](docs/deployment.md).

## Documentation

- [Getting Started Guide](docs/getting-started.md) - How to set up and run the project
- [Architecture Overview](docs/architecture.md) - System design and principles
- [API Documentation](docs/api.md) - Details about the backend API endpoints
- [Feature Guides](docs/feature-guides/) - Usage guides for specific features
- [Contributing Guide](docs/contributing.md) - How to contribute to the project

