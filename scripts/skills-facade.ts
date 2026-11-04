// The full skills under `skills/` are too large to ship in the npm package,
// but pnpm only discovers package skills under `skills/`. While packing, swap
// in the lightweight facades from `npm-skills/`, which link to GitHub.
import { rename } from 'node:fs/promises'
import process from 'node:process'
import { fsCopy, fsExists, fsRemove } from '../src/utils/fs.ts'

const SKILLS = 'skills'
const FACADES = 'npm-skills'
const BACKUP = '.skills-backup'

async function restore() {
  if (!(await fsExists(BACKUP))) return
  await fsRemove(SKILLS)
  await rename(BACKUP, SKILLS)
}

const mode = process.argv[2]
if (mode === 'prepack') {
  // Recover from a previous pack that did not reach postpack
  await restore()
  await rename(SKILLS, BACKUP)
  await fsCopy(FACADES, SKILLS)
} else if (mode === 'postpack') {
  await restore()
} else {
  throw new Error(`Unknown mode: ${mode}`)
}
