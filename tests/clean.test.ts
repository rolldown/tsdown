import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { fsExists } from '../src/utils/fs.ts'
import { getTestDir, testBuild } from './utils.ts'

describe('clean', () => {
  test('should clean dist directory by default', async (context) => {
    const files = {
      'index.ts': 'export const hello = "world"',
    }

    // Create test directories and files first
    const testDir = getTestDir(context.task)
    const distPath = path.join(testDir, 'dist')
    await mkdir(distPath, { recursive: true })
    await writeFile(path.join(distPath, 'old-file.js'), 'old content')
    await writeFile(path.join(distPath, 'old-file.d.ts'), 'old types')

    // Run build with cleanup enabled
    await testBuild({
      context,
      files,
      options: {
        clean: true,
      },
    })

    // Verify dist directory is cleaned (should be recreated after build)
    const distExists = await fsExists(distPath)
    expect(distExists).toBe(true)

    // Verify old files are cleaned
    const oldFileExists = await fsExists(path.join(distPath, 'old-file.js'))
    const oldTypesExists = await fsExists(path.join(distPath, 'old-file.d.ts'))
    expect(oldFileExists).toBe(false)
    expect(oldTypesExists).toBe(false)
  })

  test('should not clean when clean is false', async (context) => {
    const files = {
      'index.ts': 'export const hello = "world"',
    }

    // Create test directories and files first
    const testDir = getTestDir(context.task)
    const distPath = path.join(testDir, 'dist')
    await mkdir(distPath, { recursive: true })
    await writeFile(path.join(distPath, 'old-file.js'), 'old content')

    // Run build with cleanup disabled
    await testBuild({
      context,
      files,
      options: {
        clean: false,
      },
    })

    // Verify dist directory exists
    const distExists = await fsExists(distPath)
    expect(distExists).toBe(true)

    // Verify old files are not cleaned
    const oldFileExists = await fsExists(path.join(distPath, 'old-file.js'))
    expect(oldFileExists).toBe(true)
  })

  test('should clean custom directories', async (context) => {
    const files = {
      'index.ts': 'export const hello = "world"',
    }

    // Create test directories and files first
    const testDir = getTestDir(context.task)
    const customOutPath = path.join(testDir, 'custom-out')
    const tempPath = path.join(testDir, 'temp')

    await mkdir(customOutPath, { recursive: true })
    await mkdir(tempPath, { recursive: true })

    await writeFile(path.join(customOutPath, 'old-file.js'), 'old content')
    await writeFile(path.join(tempPath, 'temp-file.js'), 'temp content')

    // Run build with custom directory cleanup
    await testBuild({
      context,
      files,
      options: {
        clean: ['custom-out', 'temp'],
        outDir: 'custom-out',
      },
    })

    // Verify custom directories are cleaned
    const customOutExists = await fsExists(customOutPath)
    const tempExists = await fsExists(tempPath)

    expect(customOutExists).toBe(true) // Output directory will be recreated
    expect(tempExists).toBe(false) // Temp directory should be cleaned

    // Verify old files are cleaned
    const oldFileExists = await fsExists(
      path.join(customOutPath, 'old-file.js'),
    )
    expect(oldFileExists).toBe(false)
  })

  test('should clean multiple patterns', async (context) => {
    const files = {
      'index.ts': 'export const hello = "world"',
    }

    // Create test directories and files first
    const testDir = getTestDir(context.task)
    const distPath = path.join(testDir, 'dist')
    const buildPath = path.join(testDir, 'build')

    await mkdir(distPath, { recursive: true })
    await mkdir(buildPath, { recursive: true })

    await writeFile(path.join(distPath, 'old-file.js'), 'old content')
    await writeFile(path.join(buildPath, 'build-file.js'), 'build content')
    await writeFile(path.join(testDir, 'app.log'), 'log content')

    // Run build with multiple pattern cleanup
    await testBuild({
      context,
      files,
      options: {
        clean: ['dist', 'build', '*.log'],
      },
    })

    // Verify multiple patterns are cleaned
    const distExists = await fsExists(distPath)
    const buildExists = await fsExists(buildPath)
    const logExists = await fsExists(path.join(testDir, 'app.log'))

    expect(distExists).toBe(true) // Dist will be recreated
    expect(buildExists).toBe(false) // Build should be cleaned
    expect(logExists).toBe(false) // Log file should be cleaned
  })

  test('should not clean current working directory', async (context) => {
    const files = {
      'index.ts': 'export const hello = "world"',
    }

    // This test should throw an error because we cannot clean the current working directory
    await expect(
      testBuild({
        context,
        files,
        options: {
          clean: ['.'],
        },
      }),
    ).rejects.toThrow('Cannot clean the current working directory')
  })

  test('should clean nested directories', async (context) => {
    const files = {
      'index.ts': 'export const hello = "world"',
    }

    // Create test directories and files first
    const testDir = getTestDir(context.task)
    const distPath = path.join(testDir, 'dist')
    const nestedPath = path.join(distPath, 'nested', 'deep')

    await mkdir(nestedPath, { recursive: true })
    await writeFile(path.join(nestedPath, 'deep-file.js'), 'deep content')
    await writeFile(path.join(distPath, 'root-file.js'), 'root content')

    // Run build with nested directory cleanup
    await testBuild({
      context,
      files,
      options: {
        clean: ['dist/**/*'],
      },
    })

    // Verify nested directories are cleaned
    const distExists = await fsExists(distPath)
    const nestedExists = await fsExists(nestedPath)

    expect(distExists).toBe(true) // Dist will be recreated
    expect(nestedExists).toBe(false) // Nested directory should be cleaned
  })

  test('should handle clean with custom outDir', async (context) => {
    const files = {
      'index.ts': 'export const hello = "world"',
    }

    // Create test directories and files first
    const testDir = getTestDir(context.task)
    const outputPath = path.join(testDir, 'output')
    await mkdir(outputPath, { recursive: true })
    await writeFile(path.join(outputPath, 'old-file.js'), 'old content')

    // Run build with custom output directory cleanup
    await testBuild({
      context,
      files,
      options: {
        clean: true,
        outDir: 'output',
      },
    })

    // Verify custom output directory is cleaned
    const outputExists = await fsExists(outputPath)
    expect(outputExists).toBe(true) // Output directory will be recreated

    // Verify old files are cleaned
    const oldFileExists = await fsExists(path.join(outputPath, 'old-file.js'))
    expect(oldFileExists).toBe(false)
  })

  test('should clean files with specific extensions', async (context) => {
    const files = {
      'index.ts': 'export const hello = "world"',
    }

    // Create test directories and files first
    const testDir = getTestDir(context.task)
    await mkdir(testDir, { recursive: true })

    await writeFile(path.join(testDir, 'test.tmp'), 'temporary file')
    await writeFile(path.join(testDir, 'app.log'), 'log file')
    await writeFile(path.join(testDir, 'keep.js'), 'keep this file')

    // Run build with specific extension cleanup
    await testBuild({
      context,
      files,
      options: {
        clean: ['*.tmp', '*.log'],
      },
    })

    // Verify files with specific extensions are cleaned
    const tmpExists = await fsExists(path.join(testDir, 'test.tmp'))
    const logExists = await fsExists(path.join(testDir, 'app.log'))
    const keepExists = await fsExists(path.join(testDir, 'keep.js'))

    expect(tmpExists).toBe(false)
    expect(logExists).toBe(false)
    expect(keepExists).toBe(true) // This file should be preserved
  })
})
