# IAM Tools Project Structure

This document outlines the current project structure following best practices for a feature-based organization.

## Directory Structure

```
src/
  ├── components/               # Shared components
  │   ├── common/               # Common UI components
  │   │   └── ThemeToggle/      # Theme toggle component
  │   ├── layout/               # Layout components
  │   │   ├── AppSidebar/       # Sidebar components
  │   │   │   ├── index.tsx     # Main export
  │   │   │   ├── NavMain.tsx   # Main navigation
  │   │   │   ├── NavProjects.tsx
  │   │   │   ├── NavSecondary.tsx
  │   │   │   └── NavUser.tsx   # User menu
  │   │   ├── Layout.tsx        # Main application layout
  │   │   └── index.ts          # Barrel exports
  │   ├── theme-provider.tsx    # Theme context provider
  │   └── ui/                   # shadcn UI components
  │       ├── avatar.tsx
  │       ├── breadcrumb.tsx
  │       ├── button.tsx
  │       ├── card.tsx
  │       └── ...               # Other UI components
  ├── features/                 # Feature modules
  │   ├── home/                 # Homepage feature
  │   │   └── index.tsx         # Homepage component
  │   ├── tokenInspector/       # Token inspector feature
  │   │   ├── components/       # Feature-specific components
  │   │   └── index.tsx         # Main page component
  │   └── mermaidEditor/        # Mermaid editor feature
  │       ├── components/       # Feature-specific components
  │       └── index.tsx         # Main page component
  ├── hooks/                    # Shared React hooks
  ├── lib/                      # Shared utilities
  │   └── utils.ts              # Utility functions
  └── main.tsx                  # Application entry point
```

## Feature-Based Organization

The project follows a feature-based organization pattern with these key principles:

1. **Feature Encapsulation**: Each tool/feature (tokenInspector, mermaidEditor) has its own directory that contains all related code.

2. **Shared Components**: Components used across multiple features are located in the `components` directory.

3. **Layout Components**: UI layout elements are organized in the `components/layout` directory.

4. **UI Components**: shadcn UI components are located in `components/ui`.

5. **Barrel Exports**: Index files are used to simplify imports (e.g., `import { ThemeToggle } from '@/components/common'`).

## Adding New Features

When adding a new feature:

1. Create a new directory in the `features` folder
2. Create an `index.tsx` file for the main page component
3. Create a `components` folder for feature-specific components
4. Add the route in `main.tsx`
5. Update the sidebar navigation in `components/layout/AppSidebar/index.tsx`

## Benefits of This Structure

- **Improved Developer Experience**: New developers can quickly understand where to find or add code.
- **Scalability**: New features can be added without affecting existing ones.
- **Maintainability**: Related code is co-located, making changes easier.
- **Clear Responsibilities**: Each directory has a clear purpose.
