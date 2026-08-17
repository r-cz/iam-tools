#!/usr/bin/env node

import { closeSync, mkdirSync, openSync } from 'node:fs'
import { spawn } from 'node:child_process'
import http from 'node:http'
import process from 'node:process'
import { resolve } from 'node:path'
import {
  processIdentity,
  readManifest,
  repositoryRoot,
  runtimeDirectory,
  serviceDefinitions,
  writeManifest,
} from './dev-services.js'

const args = process.argv.slice(2)
const onlyVite = args.includes('--only-vite')
const onlyProxy = args.includes('--only-proxy')
if (onlyVite && onlyProxy) throw new Error('--only-vite and --only-proxy are mutually exclusive')
const interactive = args.includes('--interactive')
const timeoutSeconds = Number(args.find((arg) => arg.startsWith('--timeout='))?.split('=')[1] ?? 30)
if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0) throw new Error('Invalid timeout')
const host = process.env.HOST || 'localhost'
const selectedKeys = onlyVite ? ['vite'] : onlyProxy ? ['proxy'] : ['vite', 'proxy']
const states = new Map(selectedKeys.map((key) => [key, 'starting']))
const children = new Map()
const manifestServices = {}
const log = (message) => console.log(`[dev] ${message}`)

function portResponds(port) {
  return new Promise((resolveResult) => {
    const request = http.get(`http://${host}:${port}`, (response) => {
      response.resume()
      resolveResult(response.statusCode >= 200 && response.statusCode < 500)
    })
    request.setTimeout(500, () => request.destroy())
    request.on('error', () => resolveResult(false))
  })
}

async function waitUntilReady(key, port) {
  const deadline = Date.now() + timeoutSeconds * 1000
  while (Date.now() < deadline && states.get(key) === 'starting') {
    if (await portResponds(port)) {
      states.set(key, 'ready')
      log(`${serviceDefinitions[key].label} is ready on http://${host}:${port}`)
      return
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250))
  }
  if (states.get(key) !== 'ready') {
    states.set(key, 'failed')
    throw new Error(`${serviceDefinitions[key].label} did not become ready`)
  }
}

function terminateOwnedChildren(signal = 'SIGTERM') {
  for (const child of children.values()) {
    if (child.exitCode !== null || !child.pid) continue
    try {
      process.kill(process.platform === 'win32' ? child.pid : -child.pid, signal)
    } catch {}
  }
}

const existingManifest = readManifest()
if (existingManifest?.services && Object.keys(existingManifest.services).length > 0) {
  throw new Error("Owned development services already exist; run 'bun run dev:stop' first")
}

mkdirSync(runtimeDirectory, { recursive: true })
for (const key of selectedKeys) {
  const definition = serviceDefinitions[key]
  const port = Number(process.env[definition.portEnv] || definition.defaultPort)
  if (await portResponds(port)) throw new Error(`Port ${port} is already serving traffic`)
  const logPath = resolve(runtimeDirectory, `${key}-${Date.now()}.log`)
  const logFd = interactive ? null : openSync(logPath, 'a')
  const child = spawn('bun', ['run', definition.script], {
    cwd: repositoryRoot,
    detached: true,
    stdio: interactive ? 'inherit' : ['ignore', logFd, logFd],
  })
  if (logFd !== null) closeSync(logFd)
  if (!child.pid) throw new Error(`Unable to start ${definition.label}`)
  children.set(key, child)
  manifestServices[key] = {
    pid: child.pid,
    processGroup: process.platform === 'win32' ? null : child.pid,
    port,
    startedAt: new Date().toISOString(),
    startIdentity: processIdentity(child.pid),
    script: definition.script,
    logPath,
  }
  child.once('exit', (code) => {
    if (states.get(key) === 'starting') states.set(key, 'failed')
    if (interactive) log(`${definition.label} exited with code ${code}`)
  })
}
writeManifest(manifestServices)

try {
  await Promise.all(selectedKeys.map((key) => waitUntilReady(key, manifestServices[key].port)))
} catch (error) {
  terminateOwnedChildren()
  writeManifest({})
  throw error
}

if (interactive) {
  log('Press Ctrl+C to stop the owned services')
  process.on('SIGINT', () => {
    terminateOwnedChildren()
    writeManifest({})
    process.exit(0)
  })
  await new Promise(() => {})
} else {
  for (const child of children.values()) child.unref()
  log("Services detached; use 'bun run dev:stop' to stop them")
}
