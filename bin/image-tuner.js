#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const scriptPath = join(__dirname, '..', 'image_tuner.py')

const child = spawn('python3', [scriptPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
})

child.on('error', (err) => {
  if (err.code === 'ENOENT') {
    console.error('Error: python3 is required to run image-tuner.')
  } else {
    console.error('Error launching image-tuner:', err)
  }
  process.exit(1)
})

child.on('exit', (code) => {
  process.exit(code ?? 0)
})
