#!/usr/bin/env node

/**
 * Starts the development server and CORS proxy in the background
 * Usage: bun scripts/start-server.js
 * 
 * This script starts both the Vite dev server and the CORS proxy
 * and detaches them from the terminal, allowing for continued interaction.
 * 
 * Options:
 *   --only-vite      Start only the Vite dev server (no CORS proxy)
 *   --only-proxy     Start only the CORS proxy
 *   --timeout=NUM    Maximum time in seconds to wait for services (default: 30)
 *   --exit-on-fail   Exit the script if any service fails to start
 *   --interactive    Keep the process running and show server output (default: false)
 */

import { spawn } from 'child_process';
import http from 'http';
import process from 'process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get script directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const VITE_PORT = process.env.VITE_PORT || 5173;
const PROXY_PORT = process.env.PROXY_PORT || 8788;
const HOST = process.env.HOST || 'localhost';
const DEFAULT_TIMEOUT = 30; // 30 seconds default timeout
const LOG_DIR = path.join(__dirname, '..', '.logs');

// Parse arguments
const args = process.argv.slice(2);
const onlyVite = args.includes('--only-vite');
const onlyProxy = args.includes('--only-proxy');
const exitOnFail = args.includes('--exit-on-fail');
const interactive = args.includes('--interactive');

// Get timeout value if specified
const timeoutArg = args.find(arg => arg.startsWith('--timeout='));
const MAX_RETRIES = timeoutArg 
  ? parseInt(timeoutArg.split('=')[1], 10) 
  : DEFAULT_TIMEOUT;
const RETRY_INTERVAL = 1000;

// Create logs directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Log file paths
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const viteLogFile = path.join(LOG_DIR, `vite-${timestamp}.log`);
const proxyLogFile = path.join(LOG_DIR, `proxy-${timestamp}.log`);

// Process management
const processes = [];
let readyCount = 0;
const expectedReady = onlyVite || onlyProxy ? 1 : 2;

// Log with timestamp
const log = (message, type = 'info') => {
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const prefix = type === 'error' ? '❌ ' : type === 'success' ? '✅ ' : '🔄 ';
  const logMessage = `${prefix}[${now}] ${message}`;
  console[type === 'error' ? 'error' : 'log'](logMessage);
};

// Start Vite dev server
const startVite = () => {
  log('Starting Vite development server...');
  
  // Create log file stream
  const viteLogStream = interactive ? 'pipe' : fs.openSync(viteLogFile, 'a');
  
  const vite = spawn('bun', ['run', 'dev'], {
    stdio: interactive ? 'pipe' : ['ignore', viteLogStream, viteLogStream],
    detached: true,
  });
  
  processes.push(vite);
  
  if (interactive) {
    vite.stdout.on('data', (data) => {
      const output = data.toString();
      process.stdout.write(`[Vite] ${output}`);
      
      // Check for ready message
      if (output.includes('Local:') && output.includes('http://localhost')) {
        checkServer(VITE_PORT, 'Vite');
      }
    });
    
    vite.stderr.on('data', (data) => {
      process.stderr.write(`[Vite Error] ${data.toString()}`);
    });
  } else {
    // We need a timer to check for server readiness
    const checkViteInterval = setInterval(() => {
      checkServer(VITE_PORT, 'Vite');
    }, 1000);
    
    // Clear interval after MAX_RETRIES seconds
    setTimeout(() => {
      clearInterval(checkViteInterval);
    }, MAX_RETRIES * 1000);
  }
  
  vite.on('close', (code) => {
    if (interactive) {
      log(`Vite server exited with code ${code}`, code !== 0 ? 'error' : 'info');
    }
    if (code !== 0 && exitOnFail) {
      log('Exiting due to Vite server failure', 'error');
      cleanupAndExit(1);
    }
  });
  
  return vite;
};

// Start CORS proxy
const startProxy = () => {
  log('Starting CORS proxy server...');
  
  // Create log file stream
  const proxyLogStream = interactive ? 'pipe' : fs.openSync(proxyLogFile, 'a');
  
  const proxy = spawn('bun', ['run', 'dev:proxy'], {
    stdio: interactive ? 'pipe' : ['ignore', proxyLogStream, proxyLogStream],
    detached: true,
  });
  
  processes.push(proxy);
  
  if (interactive) {
    proxy.stdout.on('data', (data) => {
      const output = data.toString();
      process.stdout.write(`[Proxy] ${output}`);
      
      // Check for ready message directly
      if (output.includes('Ready on http://localhost:8788')) {
        log(`CORS Proxy is running successfully on port ${PROXY_PORT}!`, 'success');
        serverReady();
      }
    });
    
    proxy.stderr.on('data', (data) => {
      process.stderr.write(`[Proxy Error] ${data.toString()}`);
    });
  } else {
    // We need a timer to check for server readiness when in non-interactive mode
    const checkProxyInterval = setInterval(() => {
      checkServer(PROXY_PORT, 'CORS Proxy');
    }, 1000);
    
    // Clear interval after MAX_RETRIES seconds
    setTimeout(() => {
      clearInterval(checkProxyInterval);
    }, MAX_RETRIES * 1000);
  }
  
  proxy.on('close', (code) => {
    if (interactive) {
      log(`CORS proxy exited with code ${code}`, code !== 0 ? 'error' : 'info');
    }
    if (code !== 0 && exitOnFail) {
      log('Exiting due to CORS proxy failure', 'error');
      cleanupAndExit(1);
    }
  });
  
  return proxy;
};

// Check if a server is running on the specified port
const checkServer = (port, serverName, retries = 0) => {
  if (interactive) {
    log(`Checking if ${serverName} is running on port ${port} (attempt ${retries + 1}/${MAX_RETRIES})...`);
  }
  
  http.get(`http://${HOST}:${port}`, (res) => {
    if (res.statusCode >= 200 && res.statusCode < 400) {
      log(`${serverName} is running successfully on port ${port}!`, 'success');
      serverReady();
    } else {
      retryOrFail(port, serverName, retries, `Server returned status code ${res.statusCode}`);
    }
  }).on('error', (err) => {
    retryOrFail(port, serverName, retries, `Connection error: ${err.message}`);
  });
};

// Retry connection or fail after MAX_RETRIES
const retryOrFail = (port, serverName, retries, reason) => {
  if (retries < MAX_RETRIES - 1) {
    if (interactive) {
      log(`${reason}, retrying ${serverName} in ${RETRY_INTERVAL}ms...`);
    }
    setTimeout(() => checkServer(port, serverName, retries + 1), RETRY_INTERVAL);
  } else {
    log(`${serverName} failed to start after ${MAX_RETRIES} attempts: ${reason}`, 'error');
    if (exitOnFail) {
      cleanupAndExit(1);
    }
  }
};

// Track when servers are ready
const serverReady = () => {
  readyCount++;
  
  if (readyCount === expectedReady) {
    log(`All servers are running!`, 'success');
    if (!onlyVite) log(`CORS proxy: http://${HOST}:${PROXY_PORT}`);
    if (!onlyProxy) log(`Vite dev server: http://${HOST}:${VITE_PORT}`);
    
    if (interactive) {
      log(`Press Ctrl+C to stop the servers`);
      // Keep the script running until Ctrl+C
      process.stdin.resume();
    } else {
      // In non-interactive mode, log file locations and exit
      if (!onlyProxy) log(`Vite logs: ${viteLogFile}`);
      if (!onlyVite) log(`Proxy logs: ${proxyLogFile}`);
      log(`Servers are detached. Use 'killall -9 vite wrangler' to stop them.`);
      
      // Detach processes so they continue running after this script exits
      processes.forEach(proc => {
        if (!proc.killed) {
          proc.unref();
        }
      });
      
      // Exit the script
      process.exit(0);
    }
  }
};

// Clean up on exit
const cleanupAndExit = (code = 0) => {
  log(`Shutting down servers...`);
  
  processes.forEach(proc => {
    if (!proc.killed) {
      proc.kill();
    }
  });
  
  process.exit(code);
};

// Handle termination signals
process.on('SIGINT', () => cleanupAndExit());
process.on('SIGTERM', () => cleanupAndExit());

// Start the requested servers
if (!onlyProxy) {
  startVite();
}

if (!onlyVite) {
  startProxy();
}

if (interactive) {
  log(`Starting servers in interactive mode. You can continue using this terminal.`);
  log(`Server output will be displayed here. Press Ctrl+C to stop all servers.`);
} else {
  log(`Starting servers in background mode. Logs will be written to ${LOG_DIR}`);
}