import { describe, expect, test } from 'vitest'
import { resolveOptions } from '../src/options/index.ts'
import { testBuild } from './utils.ts'

describe('node protocol', () => {
  test('nodeProtocol: strip (same as removeNodeProtocol: true)', async (context) => {
    const files = {
      'index.ts': `
    import fs from 'node:fs'
    import { join } from 'node:path'
    const promise = import('node:fs/promises')

    export { fs, join, promise }
    `,
    }
    const { snapshot } = await testBuild({
      context,
      files,
      options: {
        nodeProtocol: 'strip',
      },
    })
    expect(snapshot).not.contains('node:')
  })

  test('nodeProtocol: true (add node: prefix)', async (context) => {
    const files = {
      'index.ts': `
    import fs from 'fs'
    import { join } from 'path'
    import * as crypto from 'crypto'
    const promise = import('fs/promises')

    export { fs, join, crypto, promise }
    `,
    }
    const { snapshot } = await testBuild({
      context,
      files,
      options: {
        nodeProtocol: true,
      },
    })
    expect(snapshot).toMatch(/from ['"]node:fs['"]/)
    expect(snapshot).toMatch(/from ['"]node:path['"]/)
    expect(snapshot).toMatch(/from ['"]node:crypto['"]/)
    expect(snapshot).toMatch(/import\(['"]node:fs\/promises['"]\)/)
  })

  test('nodeProtocol: false (no modification)', async (context) => {
    const files = {
      'index.ts': `
    import fs from 'node:fs'
    import path from 'path'
    const promise = import('node:fs/promises')

    export { fs, path, promise }
    `,
    }
    const { snapshot } = await testBuild({
      context,
      files,
      options: {
        nodeProtocol: false,
      },
    })
    expect(snapshot).toMatch(/from ['"]node:fs['"]/)
    expect(snapshot).toMatch(/from ['"]path['"]/)
    expect(snapshot).toMatch(/import\(['"]node:fs\/promises['"]\)/)
  })

  test('nodeProtocol default (false)', async (context) => {
    const files = {
      'index.ts': `
    import fs from 'node:fs'
    import path from 'path'

    export { fs, path }
    `,
    }
    const { snapshot } = await testBuild({
      context,
      files,
      options: {},
    })
    expect(snapshot).toMatch(/from ['"]node:fs['"]/)
    expect(snapshot).toMatch(/from ['"]path['"]/)
  })

  test('removeNodeProtocol takes precedence when nodeProtocol is not set', async (context) => {
    const files = {
      'index.ts': `
    import fs from 'node:fs'
    export { fs }
    `,
    }
    const { snapshot } = await testBuild({
      context,
      files,
      options: {
        removeNodeProtocol: true,
      },
    })
    expect(snapshot).not.contains('node:')
  })

  test('nodeProtocol option takes precedence over removeNodeProtocol', async () => {
    await expect(() =>
      resolveOptions({
        nodeProtocol: true,
        removeNodeProtocol: true,
      }),
    ).rejects.toThrowError(
      `\`removeNodeProtocol\` is deprecated. Please only use \`nodeProtocol\` instead.`,
    )
  })

  test('mixed imports with nodeProtocol: true', async (context) => {
    const files = {
      'index.ts': `
    import fs from 'fs'
    import { join } from 'node:path'
    import express from 'express'

    export { fs, join, express }
    `,
    }
    const { snapshot } = await testBuild({
      context,
      files,
      options: {
        nodeProtocol: true,
        external: ['express'],
      },
    })
    expect(snapshot).toMatch(/from ['"]node:fs['"]/)
    expect(snapshot).toMatch(/from ['"]node:path['"]/)
    expect(snapshot).toMatch(/from ['"]express['"]/)
  })

  test('with require polyfill and nodeProtocol: strip', async (context) => {
    const files = {
      'index.ts': `export const fn = require.resolve`,
    }
    const { snapshot } = await testBuild({
      context,
      files,
      options: {
        nodeProtocol: 'strip',
      },
    })
    expect(snapshot).not.contains('node:')
  })

  test('dynamic imports with nodeProtocol: true', async (context) => {
    const files = {
      'index.ts': `
    export async function loadBuiltins() {
      const fs = await import('fs')
      const path = await import('path')
      return { fs, path }
    }
    `,
    }
    const { snapshot } = await testBuild({
      context,
      files,
      options: {
        nodeProtocol: true,
      },
    })
    expect(snapshot).toMatch(/import\(['"]node:fs['"]\)/)
    expect(snapshot).toMatch(/import\(['"]node:path['"]\)/)
  })

  test('subpath imports with nodeProtocol: true', async (context) => {
    const files = {
      'index.ts': `
    import { readFile } from 'fs/promises'
    import { fileURLToPath } from 'url'

    export { readFile, fileURLToPath }
    `,
    }
    const { snapshot } = await testBuild({
      context,
      files,
      options: {
        nodeProtocol: true,
      },
    })
    expect(snapshot).toMatch(/from ['"]node:fs\/promises['"]/)
    expect(snapshot).toMatch(/from ['"]node:url['"]/)
  })

  test('should not double-prefix modules that already have node: prefix', async (context) => {
    const files = {
      'index.ts': `
    import fs from 'fs'
    import { join } from 'node:path'
    import * as crypto from 'node:crypto'
    import * as nodeSqlite from 'node:sqlite'
    import * as sqlite from 'sqlite'
    export { fs, join, crypto, nodeSqlite, sqlite }
    `,
    }
    const { snapshot } = await testBuild({
      context,
      files,
      options: {
        nodeProtocol: true,
      },
    })

    expect(snapshot).toMatch(/nodeSqlite from ['"]node:sqlite['"]/)
    expect(snapshot).toMatch(/sqlite from ['"]sqlite['"]/)
    expect(snapshot).not.includes('node:node:')
  })

  test('should handle modules that require node: prefix', async (context) => {
    // Simulate modules that only exist with node: prefix
    const files = {
      'index.ts': `
    import test from 'node:test'
    import sqlite from 'node:sqlite'
    export { test, sqlite }
    `,
    }
    const { snapshot } = await testBuild({
      context,
      files,
      options: {
        nodeProtocol: 'strip',
      },
    })
    // For node:-only modules, the prefix should be preserved even in strip mode
    expect(snapshot).toMatch(/from ['"]node:test['"]/)
    expect(snapshot).toMatch(/from ['"]node:sqlite['"]/)
  })
})
