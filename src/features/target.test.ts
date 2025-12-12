import { expect, test } from 'vitest'
import { resolvePackageTarget } from './target.ts'

test('resolvePackageTarget', () => {
  expect(testVersion('>= 14')).toMatchInlineSnapshot(`"node14.0.0"`)
  expect(testVersion('^16')).toMatchInlineSnapshot(`"node16.0.0"`)
  expect(testVersion('>=0.10.3 <15')).toMatchInlineSnapshot(`"node0.10.3"`)
  expect(testVersion('>15')).toMatchInlineSnapshot(`"node16.0.0"`)
  expect(testVersion('<22')).toMatchInlineSnapshot(`undefined`)
  expect(testVersion('^12.22.0 || ^14.17.0 || >=16.0.0')).toMatchInlineSnapshot(
    `"node12.22.0"`,
  )

  function testVersion(version: string) {
    return resolvePackageTarget({ engines: { node: version } })
  }
})
