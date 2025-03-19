# File Structure

## Overview

This project uses a feature-based architecture to organize code. Each feature is a self-contained module with its own components, pages, and utilities.

```
├── src/
│   ├── features/           # Feature modules (main functionality)
│   │   ├── home/           # Home page feature
│   │   ├── tokenInspector/ # Token inspection tool
│   │   │   ├── components/ # Feature-specific components
│   │   │   ├── data/       # Data files (examples, schemas)
│   │   │   ├── pages/      # Page components (routes)
│   │   │   ├── utils/      # Feature-specific utilities
│   │   │   └── index.tsx   # Feature entry point
│   │   └── mermaidEditor/  # Mermaid diagram editor
│   │       ├── components/ # Feature-specific components
│   │       ├── pages/      # Page components (routes)
│   │       └── index.tsx   # Feature entry point
│   ├── components/         # Shared components
│   │   ├── layout/         # Layout components
│   │   ├── navigation/     # Navigation components
│   │   ├── common/         # Common UI components
│   │   └── ui/             # shadcn UI components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions and shared libraries
│   └── main.tsx            # Application entry point
└── public/                 # Static assets
```

## Key Principles

1. **Feature-First Organization**: Code is organized by feature, not by technical role
2. **Co-location**: Related code stays together (components with their hooks, utilities, etc.)
3. **Clear Module Boundaries**: Features export only what's needed by other parts of the app
4. **Shared Components**: Truly reusable components live in `src/components`

## Adding New Features

To add a new feature:

1. Create a new directory in `src/features/`
2. Follow the established pattern with subdirectories for components, pages, etc.
3. Create an `index.tsx` file that exports the main component
4. Add the route in `src/main.tsx`

## Component Guidelines

- Keep components focused on a single responsibility
- Use TypeScript interfaces for props
- Co-locate feature-specific components with their feature
- Move components to `src/components` only when they're used across multiple features

## Navigation Structure

The navigation system is organized in:
- `src/components/navigation/app-sidebar.tsx`: Main sidebar component
- `src/components/navigation/nav-main.tsx`: Primary navigation items
- `src/components/navigation/nav-projects.tsx`: Project-specific navigation
- `src/components/navigation/nav-secondary.tsx`: Secondary navigation items
- `src/components/navigation/nav-user.tsx`: User-related navigation