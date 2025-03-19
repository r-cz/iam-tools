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

# Clean the project
bun run clean       # Standard clean (node_modules, dist)
bun run clean:dry   # Preview what will be cleaned
bun run clean:deep  # Deep clean (includes lock files)
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
- `src/lib` - Utility functions and shared libraries
- `src/hooks` - Custom React hooks

See [docs/file-structure.md](docs/file-structure.md) for more details.

## Available Tools

### Token Inspector

Analyze and debug JWT tokens with detailed information about:
- Header and payload contents
- Signature validation
- Token expiration timelines
- Standard claim validation

## Deployment

The application is deployed via Cloudflare Pages whenever changes are pushed to the main branch.
