import { describe, expect, test } from 'vitest'
import { getExtractCommand } from './download.ts'

describe('getExtractCommand', () => {
  test('uses unzip for zip archives on non-Windows hosts', () => {
    const command = getExtractCommand(
      '/tmp/node-v26.5.0-win-x64.zip',
      'node-v26.5.0-win-x64/node.exe',
      '/tmp/out',
      'linux',
    )

    expect(command).toEqual({
      command: 'unzip',
      args: [
        '-o',
        '-j',
        '/tmp/node-v26.5.0-win-x64.zip',
        'node-v26.5.0-win-x64/node.exe',
        '-d',
        '/tmp/out',
      ],
      extractedName: 'node.exe',
      requiredTool: 'unzip',
    })
  })

  test('uses tar for zip archives on Windows hosts', () => {
    const command = getExtractCommand(
      'C:/tmp/node-v26.5.0-win-x64.zip',
      'node-v26.5.0-win-x64/node.exe',
      'C:/tmp/out',
      'win32',
    )

    expect(command).toEqual({
      command: 'tar',
      args: [
        '-xf',
        'C:/tmp/node-v26.5.0-win-x64.zip',
        '-C',
        'C:/tmp/out',
        '--strip-components=1',
        'node-v26.5.0-win-x64/node.exe',
      ],
      extractedName: 'node.exe',
      requiredTool: 'tar',
    })
  })

  test('uses tar with xz flag for linux tarballs', () => {
    const command = getExtractCommand(
      '/tmp/node-v26.5.0-linux-x64.tar.xz',
      'node-v26.5.0-linux-x64/bin/node',
      '/tmp/out',
    )

    expect(command).toEqual({
      command: 'tar',
      args: [
        '-xJf',
        '/tmp/node-v26.5.0-linux-x64.tar.xz',
        '-C',
        '/tmp/out',
        '--strip-components=2',
        'node-v26.5.0-linux-x64/bin/node',
      ],
      extractedName: 'node',
      requiredTool: 'tar',
    })
  })
})
