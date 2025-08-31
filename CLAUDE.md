# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Core Commands

### Development

```bash
# Install dependencies
bun install

# Start development server (Vite only)
bun run dev

# Start API worker (CORS proxy, JWKS, etc.)
bun run proxy

# Start both Vite and API worker concurrently (blocks terminal)
bun run dev:all

# Start servers detached (background with logs in .logs directory)
bun run dev:detach          # Both Vite and API worker
bun run dev:detach:vite     # Only Vite dev server
bun run dev:detach:proxy    # Only API worker

# Stop all running development servers
bun run dev:stop

# Build for production
bun run build

# Preview production build
bun run preview
```

### Testing

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test:watch

# Run tests with coverage
bun test:coverage

# Update test snapshots
bun test:update
```

### Maintenance

```bash
# Lint the codebase
bun run lint

# Clean the project
bun run clean       # Standard clean (node_modules, dist)
bun run clean:dry   # Preview what will be cleaned
bun run clean:deep  # Deep clean (includes lock files)
```

## Project Architecture

IAM Tools is built with a feature-based architecture pattern that organizes code by functionality rather than technical role. The application consists of specialized tools for Identity and Access Management (IAM) development and debugging.

### Technology Stack

- **Frontend**: Vite + React + TypeScript
- **UI Framework**: Tailwind CSS v4 + shadcn/ui components
- **Package Manager**: Bun
- **Routing**: React Router
- **Testing**: Bun Test + React Testing Library
- **Deployment**: Cloudflare Workers (with static assets)

### Key Architecture Principles

1. **Feature-First Organization**: Each tool is a self-contained feature module
2. **Co-location**: Related code stays together (components with their hooks, utils, etc.)
3. **Clear Module Boundaries**: Features export only what's needed by other parts of the app
4. **Shared Components**: Truly reusable components live in `src/components`

### Core Features

1. **Token Inspector**
   - Analyzes and decodes JWT tokens
   - Validates signatures using JWKS
   - Displays token timelines and expiration info
   - Shows detailed claims information

2. **OIDC Explorer**
   - Fetches and displays OpenID Connect configurations
   - Retrieves JWKS from providers
   - Identifies common identity providers
   - Shows provider-specific information

3. **OAuth Playground**
   - Interactive OAuth 2.0 flow testing
   - Supports Authorization Code with PKCE flow
   - Supports Client Credentials flow
   - Provides a demo mode with simulated IdP

### Important Implementation Details

#### CORS Proxy

The application includes a CORS proxy to access external APIs that don't have CORS headers:

- Implemented in the Cloudflare Worker (`src/worker.ts`)
- Accessed via `/api/cors-proxy/{url}`
- Primarily used for fetching OIDC configurations and JWKS URIs
- Security-restricted to only allow specific endpoint types

#### Data Flow

1. User interacts with a feature's UI components
2. Components use hooks and utilities to process data
3. External requests are made via the CORS proxy when needed
4. State is managed locally within components using React's useState and useContext
5. Some data is persisted in localStorage using custom hooks

## File Structure Overview

```
├── src/
│   ├── features/           # Feature modules (main functionality)
│   │   ├── tokenInspector/ # Token inspection tool
│   │   ├── oidcExplorer/   # OIDC configuration explorer
│   │   └── oauthPlayground/ # OAuth flow testing tool
│   ├── components/         # Shared components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions and shared libraries
│   ├── types/              # TypeScript type definitions
│   └── main.tsx            # Application entry point
├── src/worker.ts           # Cloudflare Worker (API + static assets)
└── docs/                   # Documentation
```

## Working with Features

When modifying or extending a feature:

1. Understand the feature's architecture within its directory
2. Respect the existing patterns for components, utilities, and data organization
3. For new components, follow the feature's style and existing patterns
4. Use TypeScript for all new code and maintain type safety
5. Add tests for new functionality

When adding a new feature:

1. Create a directory in `src/features/` with appropriate subdirectories
2. Export the main component from an index file
3. Update navigation components to include the new feature
4. Add routes in `src/main.tsx`
5. Add documentation in `docs/feature-guides/`

## Testing Philosophy

- Tests are located in `src/tests/` and follow a structure mirroring the main application
- Tests focus on component behavior and user interactions
- When adding new functionality, write tests that verify the feature works as expected

## Puppeteer Testing

When using Puppeteer for testing the application:

### Button Selectors
- Primary buttons: Use `.bg-primary` to select main action buttons (e.g., "Fetch Config", "Inspect Token")
- Secondary buttons: Use `.bg-secondary` for secondary actions
- Text matching: Use JS with `Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Button Text'))`

### Input Fields
- Use `input[placeholder="placeholder text"]` to target input fields

### Navigation
- Use `a[href="/route-path"]` to select navigation links

### Form Submission
- Target the submit button with `.bg-primary` within the form context

### Tips
- The application uses shadcn/ui components with Tailwind CSS
- Button states use classes like `bg-primary`, `bg-secondary`, `bg-accent`
- For conditional rendering, check if elements exist before interacting
- For loading states, add delays or observe DOM changes
