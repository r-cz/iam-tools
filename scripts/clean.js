#!/usr/bin/env bun

import { existsSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current script and the project root
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = resolve(__dirname, '..');

// Directories and files to clean
const pathsToClean = [
  'node_modules',
  'dist',
];

// Extra paths to clean if using --deep flag
const deepCleanPaths = [
  'bun.lock',
];

// Check if deep clean flag is passed
const isDeepClean = process.argv.includes('--deep');
const isDryRun = process.argv.includes('--dry');
const isSilent = process.argv.includes('--silent');

// Colors for console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

// Function to log with timestamp
function log(message, color = colors.reset) {
  if (isSilent) return;
  console.log(`${color}${message}${colors.reset}`);
}

// Function to remove directory or file
function remove(path) {
  const fullPath = join(rootDir, path);
  
  if (!existsSync(fullPath)) {
    log(`  ${path} (not found)`, colors.yellow);
    return false;
  }
  
  try {
    if (!isDryRun) {
      rmSync(fullPath, { recursive: true, force: true });
    }
    log(`  ${path} ${isDryRun ? '(dry run)' : '✓'}`, colors.green);
    return true;
  } catch (error) {
    log(`  ${path} (failed: ${error.message})`, colors.red);
    return false;
  }
}

// Main function
function main() {
  log(`🧹 Cleaning project${isDryRun ? ' (DRY RUN)' : ''}...`, colors.blue);
  
  const allPaths = [...pathsToClean];
  if (isDeepClean) {
    allPaths.push(...deepCleanPaths);
    log('Deep clean mode enabled', colors.yellow);
  }
  
  let cleaned = 0;
  let notFound = 0;
  let failed = 0;
  
  for (const path of allPaths) {
    const result = remove(path);
    if (result === true) cleaned++;
    else if (result === false) notFound++;
    else failed++;
  }
  
  log(`\n📊 Summary:`, colors.blue);
  log(`  Cleaned: ${cleaned}`, colors.green);
  log(`  Not found: ${notFound}`, colors.yellow);
  log(`  Failed: ${failed}`, colors.red);
  
  if (!isDryRun && cleaned > 0) {
    log(`\n💡 Run 'bun install' to reinstall dependencies.`, colors.blue);
  }
}

main();
