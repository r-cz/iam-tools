#!/usr/bin/env bun

import { existsSync, rmSync, statSync, readdirSync } from 'fs'
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

// Function to recursively get directory size
function getDirectorySize(dirPath) {
  let totalSize = 0
  try {
    const files = readdirSync(dirPath)
    for (const file of files) {
      const filePath = join(dirPath, file)
      try {
        const stats = statSync(filePath)
        if (stats.isDirectory()) {
          totalSize += getDirectorySize(filePath)
        } else {
          totalSize += stats.size
        }
      } catch (err) {
        // Ignore errors for individual files/subdirs (e.g., permission denied)
        log(`  Could not read size for ${filePath}: ${err.message}`, colors.yellow)
      }
    }
  } catch (err) {
    // Ignore errors for the main directory (e.g., doesn't exist)
    log(`  Could not read directory ${dirPath}: ${err.message}`, colors.yellow)
  }
  return totalSize
}

// Function to remove directory or file and return its size
function remove(path) {
  const fullPath = join(rootDir, path)
  let size = 0
  if (!existsSync(fullPath)) {
    log(`  ${path} (not found)`, colors.yellow)
    return { success: false, size: 0 } // Indicate not found
  }

  // Get size before removing
  try {
    const stats = statSync(fullPath)
    if (stats.isDirectory()) {
      size = getDirectorySize(fullPath)
    } else {
      size = stats.size
    }
  } catch (error) {
    log(`  Could not get size for ${path}: ${error.message}`, colors.red)
    // Proceed with removal attempt anyway
  }

  try {
    if (!isDryRun) {
      rmSync(fullPath, { recursive: true, force: true })
    }
    log(`  ${path} ${isDryRun ? '(dry run)' : '✓'}`, colors.green)
    return { success: true, size }
  } catch (error) {
    log(`  ${path} (failed: ${error.message})`, colors.red)
    return { success: null, size: 0 } // Indicate failure
  }
}

// Helper function to format bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
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
  let totalSizeCleaned = 0

  for (const path of allPaths) {
    const result = remove(path)
    if (result.success === true) {
      cleanedCount++
      totalSizeCleaned += result.size
    } else if (result.success === false) {
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
  if (cleanedCount > 0 && !isDryRun) {
    log(`  Total space cleaned: ${formatBytes(totalSizeCleaned)}`, colors.green)
  } else if (cleanedCount > 0 && isDryRun) {
    log(`  Total space (dry run): ${formatBytes(totalSizeCleaned)}`, colors.yellow)
  }

  if (!isDryRun && cleanedCount > 0) {
    log(`\n💡 Run 'bun install' to reinstall dependencies.`, colors.blue)
  }
}

main()
