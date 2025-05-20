#!/usr/bin/env bun

/**
 * Script to run Playwright tests in CI mode locally
 * This can be helpful for debugging CI test failures
 */

import { spawnSync } from 'child_process';

// Set environment to CI
process.env.CI = 'true';

console.log('🚀 Running Playwright tests in CI mode');

// Build the application
console.log('📦 Building application...');
spawnSync('bun', ['run', 'build'], { stdio: 'inherit' });

// Run the tests
console.log('🧪 Running tests...');
spawnSync('bunx', ['playwright', 'test', '--config=playwright/config/ci.config.ts'], { 
  stdio: 'inherit',
  env: { ...process.env }
});

console.log('✅ CI test run complete');