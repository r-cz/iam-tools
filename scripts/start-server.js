#!/usr/bin/env node

/**
 * Starts the development server and CORS proxy in the background
 * Usage: bun scripts/start-server.js
 * 
 * This script starts both the Vite dev server and the CORS proxy
 * without blocking the terminal, allowing for continued interaction.
 * 
 * Options:
 *   --only-vite    Start only the Vite dev server (no CORS proxy)
 *   --only-proxy   Start only the CORS proxy
 *   --timeout NUM  Maximum time in seconds to wait for services (default: 30)
 *   --exit-on-fail Exit the script if any service fails to start
 */

import { spawn } from 'child_process';
import http from 'http';
import process from 'process';

// Configuration
const VITE_PORT = process.env.VITE_PORT || 5173;
const PROXY_PORT = process.env.PROXY_PORT || 8788;
const HOST = process.env.HOST || 'localhost';
const DEFAULT_TIMEOUT = 30; // 30 seconds default timeout

// Parse arguments
const args = process.argv.slice(2);
const onlyVite = args.includes('--only-vite');
const onlyProxy = args.includes('--only-proxy');
const exitOnFail = args.includes('--exit-on-fail');

// Get timeout value if specified
const timeoutArg = args.find(arg => arg.startsWith('--timeout='));
const MAX_RETRIES = timeoutArg 
  ? parseInt(timeoutArg.split('=')[1], 10) 
  : DEFAULT_TIMEOUT;
const RETRY_INTERVAL = 1000;

// Process management
const processes = [];
let readyCount = 0;
const expectedReady = onlyVite || onlyProxy ? 1 : 2;

// Log with timestamp
const log = (message, type = 'info') => {
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const prefix = type === 'error' ? '❌ ' : type === 'success' ? '✅ ' : '🔄 ';
  console[type === 'error' ? 'error' : 'log'](`${prefix}[${now}] ${message}`);
};

// Start Vite dev server
const startVite = () => {
  log('Starting Vite development server...');
  
  const vite = spawn('bun', ['run', 'dev'], {
    stdio: 'pipe',
    detached: true,
  });
  
  processes.push(vite);
  
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
  
  vite.on('close', (code) => {
    log(`Vite server exited with code ${code}`, code !== 0 ? 'error' : 'info');
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
  
  const proxy = spawn('bun', ['run', 'dev:proxy'], {
    stdio: 'pipe',
    detached: true,
  });
  
  processes.push(proxy);
  
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
  
  proxy.on('close', (code) => {
    log(`CORS proxy exited with code ${code}`, code !== 0 ? 'error' : 'info');
    if (code !== 0 && exitOnFail) {
      log('Exiting due to CORS proxy failure', 'error');
      cleanupAndExit(1);
    }
  });
  
  return proxy;
};

// Check if a server is running on the specified port
const checkServer = (port, serverName, retries = 0) => {
  log(`Checking if ${serverName} is running on port ${port} (attempt ${retries + 1}/${MAX_RETRIES})...`);
  
  // For the CORS proxy, rely on the "Ready on" message instead of making a request
  if (serverName === 'CORS Proxy') {
    // The proxy has its own check via the stdout "Ready on" message
    return;
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
    log(`${reason}, retrying ${serverName} in ${RETRY_INTERVAL}ms...`);
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
    log(`Press Ctrl+C to stop the servers`);
    
    // Detach processes so they continue running after this script exits
    processes.forEach(proc => {
      if (!proc.killed) {
        proc.unref();
      }
    });
    
    // Keep the script running until Ctrl+C
    process.stdin.resume();
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

log(`Starting servers in background mode. You can continue using this terminal.`);
log(`Server output will be displayed here. Press Ctrl+C to stop all servers.`);