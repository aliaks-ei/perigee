#!/usr/bin/env node
//
// Packs and pulls the observational asset trees that are not tracked in git.
//
// Why: `public/assets/objects/planets/<version>` and `.../andromeda/<version>`
// are ~216 MB across 2,037 files, and the version is a content hash over the
// generator plus every source file (see `scripts/planet-assets.py`). Adding one
// body therefore rewrites the whole tree under a new hash, and a tracked tree
// would leave the old ~136 MB in git history permanently. The trees live in R2
// instead; `scripts/asset-bundles.json` records the object key, size and
// SHA-256 of each tar, and is the only part that stays in the repository.
//
//   node scripts/assets.mjs pack   # build the tars, restamp the manifest
//   node scripts/assets.mjs pull   # download, verify and extract (npm run assets)

import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = join(root, 'scripts/asset-bundles.json')
const stage = join(root, 'tmp/asset-bundles')
// Pinned so `npx --yes` reuses one cached copy instead of prompting each run.
const wrangler = '4.86.0'

function fail(message) {
  console.error(`assets: ${message}`)
  process.exit(1)
}

async function digest(path) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest('hex')
}

async function exists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

// `tar` output is not byte-reproducible across machines, so a bundle is only
// ever verified against the digest recorded when that exact tar was packed.
function tar(args) {
  execFileSync('tar', args, { stdio: ['ignore', 'ignore', 'inherit'] })
}

async function pack(manifest) {
  await mkdir(stage, { recursive: true })
  for (const bundle of manifest.bundles) {
    const directory = join(root, bundle.directory)
    if (!await exists(directory)) fail(`cannot pack a missing tree: ${bundle.directory}`)
    const archive = join(stage, bundle.key)
    tar(['-C', dirname(directory), '-cf', archive, basename(directory)])
    bundle.sha256 = await digest(archive)
    bundle.bytes = (await stat(archive)).size
    console.log(`packed ${bundle.key} (${(bundle.bytes / 1024 ** 2).toFixed(1)} MB)`)
  }
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  // Without --remote, `wrangler r2 object put` writes to a local simulation under
  // .wrangler/state and the bucket stays empty, with no error to say so.
  console.log('\nUpload, then commit scripts/asset-bundles.json:\n')
  for (const bundle of manifest.bundles) {
    console.log(`  npx --yes wrangler@${wrangler} r2 object put ${manifest.bucket}/${bundle.key} --file=tmp/asset-bundles/${bundle.key} --content-type=application/x-tar --remote`)
  }
}

async function download(url, archive) {
  const response = await fetch(url)
  if (!response.ok) fail(`${response.status} ${response.statusText} for ${url}`)
  const partial = `${archive}.part`
  await pipeline(Readable.fromWeb(response.body), createWriteStream(partial))
  await rename(partial, archive)
}

async function pull(manifest) {
  for (const bundle of manifest.bundles) {
    const directory = join(root, bundle.directory)
    // Every generated tree carries a provenance.json, so its presence is the
    // marker for a complete extraction rather than a bare directory.
    if (await exists(join(directory, 'provenance.json'))) {
      console.log(`present ${bundle.directory}`)
      continue
    }
    const archive = join(stage, bundle.key)
    if (!await exists(archive) || await digest(archive) !== bundle.sha256) {
      if (!manifest.baseUrl) fail('asset-bundles.json has no baseUrl; set the R2 public URL first')
      await mkdir(stage, { recursive: true })
      console.log(`fetching ${bundle.key}`)
      await download(`${manifest.baseUrl}/${bundle.key}`, archive)
      if (await digest(archive) !== bundle.sha256) {
        await rm(archive, { force: true })
        fail(`${bundle.key} does not match its recorded SHA-256`)
      }
    }
    await mkdir(dirname(directory), { recursive: true })
    tar(['-C', dirname(directory), '-xf', archive])
    console.log(`extracted ${bundle.directory}`)
  }
}

const command = process.argv[2]
if (command !== 'pack' && command !== 'pull') fail('usage: assets.mjs pack|pull')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
await (command === 'pack' ? pack(manifest) : pull(manifest))
