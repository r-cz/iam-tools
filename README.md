# IAM Tools

A collection of specialized tools for Identity and Access Management (IAM) development and debugging.

## Technologies

- **Frontend**: Vite + React + TypeScript
- **UI Framework**: Tailwind CSS v4
- **Components**: shadcn/ui
- **Package Manager**: Bun
- **Routing**: React Router

## Development

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview
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

- `src/components` - Reusable UI components
- `src/components/ui` - shadcn UI components
- `src/pages` - Route-based page components
- `src/lib` - Utility functions and shared libraries
- `src/hooks` - Custom React hooks

## Available Tools

### Token Inspector

Analyze and debug JWT tokens with detailed information about:
- Header and payload contents
- Signature validation
- Token expiration timelines
- Standard claim validation

## Deployment

The application is deployed via Cloudflare Pages whenever changes are pushed to the main branch.
