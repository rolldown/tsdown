#!/usr/bin/env node
import module from 'node:module'
import { runCLI } from './cli'

try {
  module.enableCompileCache?.()
} catch {}
// @ts-ignore
Symbol.asyncDispose ??= Symbol('Symbol.asyncDispose')
runCLI()
