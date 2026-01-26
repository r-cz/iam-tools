# Getting Started

This guide will help you set up the IAM Tools project for local development.

## Prerequisites

Before you begin, ensure you have the following installed:

- [Bun](https://bun.sh/) (v1.0.0 or later)
- [Node.js](https://nodejs.org/) (v18 or later, though Bun is the primary runtime)
- Git

## Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/iam-tools.git
cd iam-tools
```

2. Install dependencies:

```bash
bun install
```

## Development Environment

### Starting the Development Server

To start the development server:

```bash
bun run dev
```

This will start the Vite development server at http://localhost:5173.

### Development with CORS Proxy

Some features require the CORS proxy to access external APIs. To start both the Vite development server and the CORS proxy:

```bash
bun run dev:all
```

This will start:

- Vite development server at http://localhost:5173
- CORS proxy at http://localhost:8788

### Available Scripts

- `bun run dev` - Start the development server (Vite only)
- `bun run proxy` - Start the CORS proxy server
- `bun run dev:all` - Start both the development server and CORS proxy
- `bun run dev:detach` - Start both servers in background
- `bun run dev:stop` - Stop all running servers
- `bun run build` - Build the application for production
- `bun run preview` - Preview the production build
- `bun test` - Run the test suite
- `bun test:watch` - Run tests in watch mode
- `bun test:coverage` - Run tests with coverage reporting
- `bun run clean` - Clean build artifacts and node_modules

## Project Structure

The project follows a feature-based structure:

- `src/features/` - Each IAM tool is implemented as a feature
- `src/components/` - Shared components
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utility functions and shared code
- `src/worker.ts` - Cloudflare Worker (backend API + static assets)

See [file-structure.md](./file-structure.md) for a more detailed breakdown.

## Environment Variables

This project doesn't require any environment variables for basic development. However, if you're deploying your own instance, you may want to configure:

- `CORS_ALLOWED_ORIGINS` - Comma-separated allowlist for API origins (disallowed origins receive `403`)

## Working with Features

### Using Existing Features

The application currently includes these main features:

1. **Token Inspector** - For analyzing JWT tokens
2. **OIDC Explorer** - For exploring OpenID Connect configurations
3. **CORS Proxy** - For accessing external APIs with CORS restrictions

### Creating a New Feature

To add a new feature:

1. Create a new directory in `src/features/yourFeatureName/`
2. Create the feature structure following the existing pattern:
   ```
   src/features/yourFeatureName/
   ├── components/     # Feature-specific components
   ├── data/           # Static data and constants
   ├── pages/          # Route components
   ├── utils/          # Feature-specific utilities
   └── index.tsx       # Main export
   ```
3. Export your feature from `src/features/index.ts`
4. Add a route in `src/main.tsx`

## Next Steps

- Review the [Architecture Guide](./architecture.md) to understand the design principles
- Explore the existing features to understand how the application is structured
- Check out the [Contributing Guide](./contributing.md) for guidance on making contributions
