# CI Workflow Guide

This document explains our GitHub Actions CI workflow strategy and how it helps maintain code quality and reliability.

## Overview

Our CI (Continuous Integration) pipeline uses a streamlined, unified approach that combines linting, building, and testing into a single workflow with sequential steps. This strategy provides faster feedback and clearer error reporting while simplifying workflow management.

## Workflow Structure

The main CI workflow is defined in `.github/workflows/ci.yml` and consists of a single job with sequential steps:

```yaml
jobs:
  verify:
    name: Verify
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: bun install
      
      # Run linting first as it's usually the fastest check and can catch issues early
      - name: Lint
        run: bun run lint
      
      # Then build to make sure the application can be built successfully
      - name: Build
        run: bun run build
      
      # Finally run tests - this way we only run tests on code that builds and passes linting
      - name: Run tests
        run: bun test
      
      - name: Generate coverage report
        run: bun test --coverage
      
      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
          retention-days: 30
```

This workflow runs:
1. On every push to the `main` branch
2. On every pull request to the `main` branch

## Key Benefits

### 1. Faster Feedback

The workflow is designed to provide feedback as quickly as possible:

- **Linting First**: Lint checks run first since they're typically the fastest and can catch many issues early
- **Build Next**: Building the application ensures it can be compiled successfully before running more time-consuming tests
- **Tests Last**: Tests run only after confirming the code lints and builds correctly

This "fail-fast" approach prevents wasting time running tests on code that won't build.

### 2. Reduced Overhead

Using a single job with sequential steps provides significant advantages:

- **Reduced Setup Time**: Only one job setup and environment preparation
- **Shared Dependencies**: Installs dependencies once instead of multiple times
- **Clearer Reports**: All verification results in a single consolidated job
- **Simpler Management**: One workflow file to maintain instead of separate files

### 3. Clear Error Attribution

When the workflow fails, you can immediately see which specific step failed:

- Linting errors
- Build failures
- Test failures

This makes it much easier to identify and address issues quickly.

## Security Analysis

In addition to our main CI workflow, we maintain a separate CodeQL workflow for advanced security analysis. This workflow focuses on:

- Identifying security vulnerabilities
- Finding code quality issues
- Detecting common coding mistakes

The CodeQL workflow runs in parallel with our main CI workflow.

## Working with the CI Workflow

### Viewing Workflow Results

1. Navigate to the GitHub repository
2. Click on the "Actions" tab
3. Find the latest workflow run for your branch or pull request
4. Click on the workflow run to see detailed results
5. Expand any failing steps to see error details

### Accessing Coverage Reports

After a successful workflow run:

1. Navigate to the workflow run in GitHub Actions
2. Scroll to the bottom to find "Artifacts"
3. Download the "coverage-report" artifact
4. Extract and open `index.html` in your browser to view the coverage report

### Debugging CI Issues

If you encounter CI failures:

1. **Lint Failures**: Run `bun run lint` locally to reproduce and fix the issues
2. **Build Failures**: Run `bun run build` locally to diagnose build problems
3. **Test Failures**: Run `bun test` locally and focus on failing tests

## Adding Custom Verification Steps

If you need to add additional verification steps to the CI process:

1. Modify `.github/workflows/ci.yml`
2. Add your new step in the appropriate sequence (consider what should run before/after)
3. Use the same environment (dependencies will already be installed)
4. Commit and push your changes
5. Verify the updated workflow runs successfully

## Migration from Previous Workflows

This unified workflow replaces the previous separated workflows:

- `bun-tests.yml` - Previous testing workflow
- `test.yml` - Previous multi-job workflow with separate testing, linting, and building

The new approach maintains all the same verification steps but runs them more efficiently in a single job.
