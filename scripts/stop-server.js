#!/usr/bin/env node

import { existsSync, unlinkSync } from 'node:fs'
import process from 'node:process'
import {
  manifestPath,
  processIdentity,
  readManifest,
  serviceDefinitions,
  writeManifest,
} from './dev-services.js'

const manifest = readManifest()
if (!manifest) {
  if (existsSync(manifestPath)) throw new Error('Development service manifest is invalid')
  console.log('[dev] No owned development services found')
  process.exit(0)
}

const isAlive = (pid) => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

const remainingServices = {}
for (const [key, owned] of Object.entries(manifest.services ?? {})) {
  if (!serviceDefinitions[key] || !Number.isInteger(owned.pid) || owned.pid <= 1) continue
  if (!isAlive(owned.pid)) {
    console.log(`[dev] Removed stale ${key} manifest entry`)
    continue
  }
  if (processIdentity(owned.pid) !== owned.startIdentity) {
    console.error(`[dev] Refusing to stop ${key}: PID ${owned.pid} has been reused`)
    remainingServices[key] = owned
    continue
  }
  const target = process.platform === 'win32' ? owned.pid : -(owned.processGroup ?? owned.pid)
  try {
    process.kill(target, 'SIGTERM')
    const deadline = Date.now() + 3000
    while (isAlive(owned.pid) && Date.now() < deadline) {
      await new Promise((resolveWait) => setTimeout(resolveWait, 100))
    }
    if (isAlive(owned.pid)) process.kill(target, 'SIGKILL')
    console.log(`[dev] Stopped owned ${key} service`)
  } catch (error) {
    console.error(`[dev] Failed to stop ${key}: ${error instanceof Error ? error.message : error}`)
    remainingServices[key] = owned
  }
}

if (Object.keys(remainingServices).length > 0) writeManifest(remainingServices)
else if (existsSync(manifestPath)) unlinkSync(manifestPath)
