#!/usr/bin/env node

/**
 * Stops development servers that were started with start-server.js
 * Usage: bun scripts/stop-server.js
 * 
 * This script finds and terminates Vite and Wrangler processes that were
 * started by the dev scripts.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import process from 'process';

const execAsync = promisify(exec);

// Log with timestamp
const log = (message, type = 'info') => {
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const prefix = type === 'error' ? '❌ ' : type === 'success' ? '✅ ' : '🔄 ';
  console[type === 'error' ? 'error' : 'log'](`${prefix}[${now}] ${message}`);
};

// Find and kill processes
const killProcesses = async () => {
  log('Looking for development server processes...');
  
  try {
    // Find all vite, wrangler, and bun dev processes
    const findCmd = process.platform === 'darwin' || process.platform === 'linux'
      ? `ps aux | grep -E '(vite|wrangler|bun run dev)' | grep -v grep | awk '{print $2}'`
      : `tasklist /fi "imagename eq node.exe" /fo csv | findstr /i "vite wrangler"`;
    
    const { stdout } = await execAsync(findCmd);
    const pids = stdout.trim().split('\n').filter(Boolean);
    
    if (pids.length === 0) {
      log('No development server processes found.', 'info');
      return;
    }
    
    log(`Found ${pids.length} development server process(es) to terminate.`);
    
    // Kill each process
    for (const pid of pids) {
      if (!pid.trim()) continue;
      
      try {
        const killCmd = process.platform === 'win32'
          ? `taskkill /F /PID ${pid}`
          : `kill -9 ${pid}`;
        
        await execAsync(killCmd);
        log(`Terminated process ${pid}`, 'success');
      } catch (err) {
        log(`Failed to terminate process ${pid}: ${err.message}`, 'error');
      }
    }
    
    log('All development server processes terminated.', 'success');
  } catch (error) {
    log(`Error: ${error.message}`, 'error');
    process.exit(1);
  }
};

// Main function
const main = async () => {
  await killProcesses();
};

main().catch(err => {
  log(`Unhandled error: ${err.message}`, 'error');
  process.exit(1);
});