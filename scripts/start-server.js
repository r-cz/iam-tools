#!/usr/bin/env node

/**
 * Starts the preview server and verifies it's running
 * Usage: bun scripts/start-server.js
 */

import { spawn } from 'child_process';
import http from 'http';

const PORT = process.env.PORT || 5173;
const HOST = process.env.HOST || 'localhost';
const MAX_RETRIES = 30;
const RETRY_INTERVAL = 1000;

// Start the server
console.log(`Starting server on ${HOST}:${PORT}...`);
const server = spawn('bun', ['run', 'preview', '--port', PORT, '--host', HOST], {
  stdio: 'pipe',
  detached: process.env.CI ? true : false, // Detach in CI
});

let serverOutput = '';

server.stdout.on('data', (data) => {
  const output = data.toString();
  serverOutput += output;
  console.log(`[Server] ${output.trim()}`);
});

server.stderr.on('data', (data) => {
  const output = data.toString();
  serverOutput += output;
  console.error(`[Server Error] ${output.trim()}`);
});

// Check if server is running
const checkServer = (retries = 0) => {
  console.log(`Checking if server is running (attempt ${retries + 1}/${MAX_RETRIES})...`);
  
  http.get(`http://${HOST}:${PORT}`, (res) => {
    if (res.statusCode >= 200 && res.statusCode < 400) {
      console.log(`✅ Server is running! Status: ${res.statusCode}`);
      
      if (process.env.CI) {
        // In CI, keep the server running in the background
        server.unref();
      }
      
      process.exit(0);
    } else {
      retryOrFail(retries, `Server returned status code ${res.statusCode}`);
    }
  }).on('error', (err) => {
    retryOrFail(retries, `Connection error: ${err.message}`);
  });
};

const retryOrFail = (retries, reason) => {
  if (retries < MAX_RETRIES - 1) {
    console.log(`${reason}, retrying in ${RETRY_INTERVAL}ms...`);
    setTimeout(() => checkServer(retries + 1), RETRY_INTERVAL);
  } else {
    console.error(`❌ Server failed to start after ${MAX_RETRIES} attempts: ${reason}`);
    console.error('Server output:', serverOutput);
    
    // Kill the server process
    if (!server.killed) {
      server.kill();
    }
    
    process.exit(1);
  }
};

// Start checking after a short delay
setTimeout(() => checkServer(), 2000);
