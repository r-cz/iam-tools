import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const distPath = resolve(process.cwd(), 'dist')
mkdirSync(distPath, { recursive: true })
