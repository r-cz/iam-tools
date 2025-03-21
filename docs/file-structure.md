# File Structure

## Overview

This project uses a feature-based architecture to organize code. Each feature is a self-contained module with its own components, pages, and utilities.

```
├── src/
│   ├── features/           # Feature modules (main functionality)
│   │   ├── home/           # Home page feature
│   │   └── tokenInspector/ # Token inspection tool
│   │       ├── components/ # Feature-specific components
│   │       ├── data/       # Data files (examples, schemas)
│   │       ├── pages/      # Page components (routes)
│   │       ├── utils/      # Feature-specific utilities
│   │       └── index.tsx   # Feature entry point
│   ├── components/         # Shared components
│   │   ├── layout/         # Layout components
│   │   ├── navigation/     # Navigation components
│   │   ├── common/         # Common UI components
│   │   ├── theme/          # Theme-related components
│   │   ├── page/           # Page layout components
│   │   └── ui/             # shadcn UI components
│   ├── types/              # Shared TypeScript type definitions
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
- `src/components/navigation/nav-help.tsx`: Help and support navigation

## Hook Utilities

The project includes several useful custom React hooks:

- `useIsMobile`: Detect mobile viewport size
- `useLocalStorage`: Persist state in localStorage
- `useDebounce`: Debounce rapidly changing values
- `useClipboard`: Copy text to clipboard with status feedback

## Types

Shared TypeScript type definitions are located in the `src/types` directory:

- `token.ts`: Token-related types (TokenType, DecodedToken, ValidationResult, etc.)
- Additional type files can be added here as the application grows