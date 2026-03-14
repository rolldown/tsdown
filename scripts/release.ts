import { versionBump } from 'bumpp'
import { x } from 'tinyexec'

const result = await versionBump({
  recursive: true,
  commit: true,
  push: true,
  tag: true,
  confirm: true,
})

if (!result.newVersion.includes('beta')) {
  console.log('Pushing to release branch')
  await x('git', ['update-ref', 'refs/heads/release', 'refs/heads/main'], {
    nodeOptions: { stdio: 'inherit' },
    throwOnError: true,
  })
  await x('git', ['push', 'origin', 'release'], {
    nodeOptions: { stdio: 'inherit' },
    throwOnError: true,
  })
}

console.log(
  'New release is ready, waiting for confirmation at https://github.com/rolldown/tsdown/actions',
)
