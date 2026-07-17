import { describe, expect, test } from 'vitest'
import { getExtractCommand } from './download.ts'
import type { ExeTarget } from './platform.ts'

const archivePath = '/cache/node.exe.download.zip'
const outDir = '/cache/node/v26.5.0/win-x64'
const binaryInArchive = 'node-v26.5.0-win-x64/node.exe'
const winTarget: ExeTarget = {
  platform: 'win',
  arch: 'x64',
  nodeVersion: '26.5.0',
}

describe('getExtractCommand', () => {
  test('uses unzip for Windows archives on Linux hosts', () => {
    expect(
      getExtractCommand(
        archivePath,
        outDir,
        binaryInArchive,
        winTarget,
        'linux',
      ),
    ).toEqual({
      command: 'unzip',
      args: ['-j', '-o', archivePath, binaryInArchive, '-d', outDir],
    })
  })

  test('uses tar for Windows archives on Windows hosts', () => {
    expect(
      getExtractCommand(
        archivePath,
        outDir,
        binaryInArchive,
        winTarget,
        'win32',
      ),
    ).toEqual({
      command: 'tar',
      args: [
        '-xf',
        archivePath,
        '-C',
        outDir,
        '--strip-components=1',
        binaryInArchive,
      ],
    })
  })

  test('uses tar with xz decompression for Linux archives', () => {
    expect(
      getExtractCommand(
        '/cache/node.download.tar.xz',
        outDir,
        'node-v26.5.0-linux-x64/bin/node',
        {
          platform: 'linux',
          arch: 'x64',
          nodeVersion: '26.5.0',
        },
      ),
    ).toEqual({
      command: 'tar',
      args: [
        '-xJf',
        '/cache/node.download.tar.xz',
        '-C',
        outDir,
        '--strip-components=2',
        'node-v26.5.0-linux-x64/bin/node',
      ],
    })
  })

  test('uses tar with gzip decompression for Darwin archives', () => {
    expect(
      getExtractCommand(
        '/cache/node.download.tar.gz',
        outDir,
        'node-v26.5.0-darwin-arm64/bin/node',
        {
          platform: 'darwin',
          arch: 'arm64',
          nodeVersion: '26.5.0',
        },
      ),
    ).toEqual({
      command: 'tar',
      args: [
        '-xzf',
        '/cache/node.download.tar.gz',
        '-C',
        outDir,
        '--strip-components=2',
        'node-v26.5.0-darwin-arm64/bin/node',
      ],
    })
  })
})
