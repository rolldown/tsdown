#!/usr/bin/env node
import module from 'node:module'
import { runCLI } from './cli.ts'

try {
  module.enableCompileCache?.()
} catch {}
runCLI()
