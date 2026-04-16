#!/usr/bin/env node
import module from 'node:module'
import process from 'node:process'
import { yellow } from 'ansis'
import lt from 'semver/functions/lt.js'
import { runCLI } from './cli.ts'

if (!process.versions.bun && lt(process.version, '22.18.0')) {
  console.warn(
    yellow`[tsdown] Node.js ${process.version} is deprecated. Support will be removed in the next minor release. Please upgrade to Node.js v22.18.0 or later.`,
  )
}

try {
  module.enableCompileCache?.()
} catch {}
runCLI()
