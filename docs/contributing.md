# Contributing to IAM Tools

Thank you for considering a contribution to IAM Tools! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

Please be respectful and considerate of others when contributing to this project. We aim to foster an inclusive and welcoming community.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/iam-tools.git`
3. Create a new branch for your changes: `git checkout -b feature/your-feature-name`
4. Install dependencies: `bun install`
5. Make your changes
6. Run tests to ensure everything works: `bun test`

## Development Workflow

1. Start the development server: `bun run dev:all`
2. Make your changes
3. Write tests for your changes
4. Run the tests: `bun test`
5. Update documentation if necessary
6. Commit your changes with a descriptive commit message
7. Push your changes to your fork
8. Submit a pull request

### Branching & Commits

- Branch naming: `feat/description`, `fix/description`, `chore/description`
- Use PRs for all changes (no direct merges to `main`)
- Prefer conventional commit style for messages, e.g. `feat: add token timeline` or `fix: handle expired jwk`
- Squash commits when merging to keep history tidy

## Project Structure

Please follow the established project structure:

- New features should be added to the `src/features` directory
- Shared components should be added to the appropriate subdirectory in `src/components`
- Tests should be added to the `src/tests` directory

See [file-structure.md](./file-structure.md) for more details.

## Coding Standards

### General Guidelines

- Use TypeScript for all code
- Follow the existing code style
- Use meaningful variable and function names
- Keep functions small and focused on a single responsibility
- Write comments for complex logic
- Add JSDoc comments for functions and components

### React Best Practices

- Use functional components with hooks
- Keep components focused on a single responsibility
- Use TypeScript interfaces for props
- Avoid directly manipulating the DOM
- Follow the established pattern for new components

### Testing Guidelines

- Write tests for all new functionality
- Use `@testing-library/react` for component tests
- Use meaningful test descriptions
- Test edge cases and error conditions
- Ensure tests run in isolation

## Pull Request Process

1. Update the README.md or documentation with details of changes if appropriate
2. Update the CHANGELOG.md file with details of changes
3. Include relevant issue numbers in your PR description
4. Wait for a maintainer to review your PR
5. Address any feedback or requested changes
6. Once approved, your PR will be merged

### Linting & Formatting

- Run `bun run lint` before opening a PR
- Follow the existing ESLint rules in `eslint.config.js`
- Use your editor’s format-on-save (Prettier or built-in formatter) to keep diffs clean

## Adding New Features

When adding a new feature:

1. Create a new directory in `src/features/your-feature-name/`
2. Follow the established structure (components, utils, data, etc.)
3. Create a main entry point in `index.tsx`
4. Add tests for your feature
5. Add documentation in the `docs/feature-guides/` directory
6. Update the main README.md to mention your feature
7. Add an entry in the navigation sidebar

## Reporting Bugs

When reporting bugs, please include:

1. A clear and descriptive title
2. Steps to reproduce the issue
3. Expected behavior
4. Actual behavior
5. Screenshots if applicable
6. Browser and OS information
7. Any additional context that might be helpful

## Feature Requests

When requesting features, please include:

1. A clear and descriptive title
2. A detailed description of the proposed feature
3. The problem it solves
4. Any alternatives you've considered
5. Additional context or examples

## Documentation

All new features should include documentation:

1. Add a new guide in the `docs/feature-guides/` directory
2. Update existing documentation if necessary
3. Use clear and concise language
4. Include examples where appropriate
5. Include screenshots if helpful

## Versioning

This project follows [Semantic Versioning](https://semver.org/). When contributing, consider the impact of your changes:

- **PATCH** (1.0.x): Bug fixes and minor changes
- **MINOR** (1.x.0): New features that don't break existing functionality
- **MAJOR** (x.0.0): Changes that break backward compatibility

## License

By contributing to this project, you agree that your contributions will be licensed under the same license as the project.

## Questions?

If you have any questions about contributing, please reach out by creating an issue labeled "question" in the repository.

Thank you for your contributions!
