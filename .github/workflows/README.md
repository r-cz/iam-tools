# GitHub Actions Workflows

This directory contains GitHub Actions workflow configurations for the IAM Tools project.

## Available Workflows

### Playwright Tests (`playwright.yml`)

This workflow runs Playwright end-to-end tests in a CI environment.

**Trigger Conditions:**
- On push to the `main` branch
- On pull requests to the `main` branch

**What it does:**
1. Sets up the Bun environment
2. Installs dependencies
3. Installs Playwright browsers (only Chromium for CI)
4. Builds the application
5. Runs the Playwright tests using the CI configuration
6. Uploads test results and screenshots as artifacts

## Running CI Tests Locally

To test how the CI pipeline will run your tests locally:

```bash
bun run test:e2e:ci
```

This script will:
1. Build the application
2. Run Playwright tests using the CI configuration
3. Use the same settings as the GitHub Actions workflow

## Debugging Failed CI Tests

If tests fail in the CI environment but pass locally, you can:

1. Download the artifacts from the failed GitHub Actions run
2. Run the tests with the CI configuration locally to try to reproduce the issue
3. Check the test results and screenshots for clues about what went wrong