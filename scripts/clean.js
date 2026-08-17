#!/usr/bin/env bun

import { existsSync, rmSync } from 'fs'
import { join, resolve } from 'path'
import { fileURLToPath } from 'url'

// Get the directory of the current script and the project root
const __dirname = fileURLToPath(new URL('.', import.meta.url))
const rootDir = resolve(__dirname, '..')

// Directories and files to clean
const pathsToClean = [
  'node_modules',
  'dist',
  '.wrangler', // Wrangler local development directory
  'test-results', // Playwright test results
  'playwright-report', // Playwright HTML report
]

// Extra paths to clean if using --deep flag
const deepCleanPaths = [
  'bun.lock',
  '.dev.vars', // Wrangler development variables
  '.env', // Environment variables
]

// Check if deep clean flag is passed
const isDeepClean = process.argv.includes('--deep')
const isDryRun = process.argv.includes('--dry')
const isSilent = process.argv.includes('--silent')

// Colors for console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
}

// Function to log with timestamp
function log(message, color = colors.reset) {
  if (isSilent) return
  console.log(`${color}${message}${colors.reset}`)
}

// Remove one configured target. Deletion already performs the required traversal.
function remove(path) {
  const fullPath = join(rootDir, path)
  if (!existsSync(fullPath)) {
    log(`  ${path} (not found)`, colors.yellow)
    return false
  }

  try {
    if (!isDryRun) {
      rmSync(fullPath, { recursive: true, force: true })
    }
    log(`  ${path} ${isDryRun ? '(dry run)' : '✓'}`, colors.green)
    return true
  } catch (error) {
    log(`  ${path} (failed: ${error.message})`, colors.red)
    return null
  }
}

// Main function
function main() {
  log(`🧹 Cleaning project${isDryRun ? ' (DRY RUN)' : ''}...`, colors.blue)

  const allPaths = [...pathsToClean]
  if (isDeepClean) {
    allPaths.push(...deepCleanPaths)
    log('Deep clean mode enabled', colors.yellow)
  }

  let cleanedCount = 0
  let notFoundCount = 0
  let failedCount = 0

  for (const path of allPaths) {
    const result = remove(path)
    if (result === true) {
      cleanedCount++
    } else if (result === false) {
      notFoundCount++
    } else {
      // result.success === null
      failedCount++
    }
  }

  log(`\n📊 Summary:`, colors.blue)
  log(`  Items cleaned: ${cleanedCount}`, colors.green)
  log(`  Items not found: ${notFoundCount}`, colors.yellow)
  log(`  Items failed: ${failedCount}`, colors.red)

  if (!isDryRun && cleanedCount > 0) {
    log(`\n💡 Run 'bun install' to reinstall dependencies.`, colors.blue)
  }
}

main()
