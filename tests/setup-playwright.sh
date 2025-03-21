#!/bin/bash

# Install Playwright and its dependencies
bunx playwright@latest install --with-deps

# Verify installation
bunx playwright --version

echo "Playwright has been installed successfully!"
echo "You can run tests with:"
echo "  bun test        - Run all tests"
echo "  bun test:ui     - Run tests with UI mode"
echo "  bun test:headed - Run tests in headed mode"
echo "  bun test:debug  - Run tests in debug mode"
