import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  writeFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

export const repositoryRoot = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), '..'))
export const runtimeDirectory = resolve(repositoryRoot, '.logs')
export const manifestPath = resolve(runtimeDirectory, 'dev-services.json')
export const serviceDefinitions = Object.freeze({
  vite: { label: 'Vite', script: 'dev', portEnv: 'VITE_PORT', defaultPort: 5173 },
  proxy: { label: 'CORS proxy', script: 'proxy', portEnv: 'PROXY_PORT', defaultPort: 8788 },
})

export function processIdentity(pid) {
  if (process.platform === 'linux') {
    try {
      return `linux:${readFileSync(`/proc/${pid}/stat`, 'utf8').split(' ')[21]}`
    } catch {
      return null
    }
  }
  if (process.platform === 'darwin') {
    const result = spawnSync('ps', ['-p', String(pid), '-o', 'lstart='], { encoding: 'utf8' })
    return result.status === 0 && result.stdout.trim() ? `darwin:${result.stdout.trim()}` : null
  }
  return `pid:${pid}`
}

export function readManifest() {
  if (!existsSync(manifestPath)) return null
  try {
    const value = JSON.parse(readFileSync(manifestPath, 'utf8'))
    return value?.repository === repositoryRoot && value?.version === 1 ? value : null
  } catch {
    return null
  }
}

export function writeManifest(services) {
  mkdirSync(runtimeDirectory, { recursive: true })
  const temporaryPath = `${manifestPath}.${process.pid}.tmp`
  writeFileSync(
    temporaryPath,
    JSON.stringify({ version: 1, repository: repositoryRoot, services }, null, 2)
  )
  renameSync(temporaryPath, manifestPath)
}
