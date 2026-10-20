#!/usr/bin/env node
/**
 * Extracts design references and assets from the challenge Figma file.
 *
 * Outputs (all committed, so the app never needs Figma at runtime):
 *   docs/design/frames/<frame>.webp   1x render of every frame, for side-by-side review
 *   design/assets/nfts/<name>.png     original image fills (source for scripts/optimize-images.mjs)
 *   src/assets/icons/<name>.svg       icon components exported as SVG
 *   design/figma/manifest.json        file key, pinned version, frame → file map, hashes
 *
 * Needs FIGMA_TOKEN (scope file_content:read) in the environment or in .env.local.
 * The full file JSON is cached in .figma-cache/ so re-runs cost only the render calls.
 */
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import sharp from 'sharp'

const FILE_KEY = process.env.FIGMA_FILE_KEY ?? 'Ff0SksUi7UFtPWUO8kyNtw'
const VERSION = process.env.FIGMA_VERSION ?? '2397163412428844678'
const API = 'https://api.figma.com/v1'
const CACHE = `.figma-cache/file-${VERSION}.json`

// ONLY=frames,images,icons limits a re-run to some steps (each step costs API calls)
const ONLY = new Set((process.env.ONLY ?? 'frames,images,icons').split(','))
// Image fills of the pinned version, named after what they depict.
const IMAGE_NAMES = {
  '2986a7cb16d09de8970824d2dd58bf0bb021702c': 'sage',
  '8459204731e6eba9d474cbc8ebc37071360d3ba5': 'emerald',
  '87580f2def9af0ce13f4b6f6ce17bb2449bcfc16': 'golden',
  '9df2ff42dd27ba657621c304557d1a855a4be6a5': 'ivory',
}
const ICON_NAMES = /^(Iconly\/|Arrow-Down$|X$|Search$|Shop$|User$|Message$|Provider=)/

async function readToken() {
  if (process.env.FIGMA_TOKEN) return process.env.FIGMA_TOKEN.trim()
  if (!existsSync('.env.local')) throw new Error('FIGMA_TOKEN not found (env or .env.local)')
  const line = (await readFile('.env.local', 'utf8'))
    .split(/\r?\n/)
    .find((l) => /^\s*figma_token\s*=/i.test(l))
  if (!line) throw new Error('FIGMA_TOKEN not found in .env.local')
  return line.slice(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '')
}

const token = await readToken()

async function api(path) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${API}${path}`, { headers: { 'X-Figma-Token': token } })
    if (res.status === 429) {
      const wait = Number(res.headers.get('retry-after') ?? 30)
      console.warn(`rate limited, waiting ${wait}s`)
      await new Promise((r) => setTimeout(r, wait * 1000))
      continue
    }
    if (!res.ok) throw new Error(`${path} → ${res.status} ${await res.text()}`)
    return res.json()
  }
  throw new Error(`${path} → still rate limited`)
}

async function download(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`download ${url} → ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

async function save(path, data) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, data)
}

const slug = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/^Iconly\//, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')

// 1. File JSON (cached per pinned version)
let file
if (existsSync(CACHE)) {
  file = JSON.parse(await readFile(CACHE, 'utf8'))
} else {
  file = await api(`/files/${FILE_KEY}?version=${VERSION}`)
  await save(CACHE, JSON.stringify(file))
}

const page = file.document.children[0]
const frames = page.children.filter((n) => n.type === 'FRAME')

// 2. Frame renders → WebP
const frameManifest = []
if (ONLY.has('frames')) {
const frameRenders = await api(
  `/images/${FILE_KEY}?ids=${frames.map((f) => f.id).join(',')}&format=png&scale=1&version=${VERSION}`,
)
for (const frame of frames) {
  const png = await download(frameRenders.images[frame.id])
  const out = `docs/design/frames/${slug(frame.name)}.webp`
  await save(out, await sharp(png).webp({ quality: 82 }).toBuffer())
  const { width, height } = frame.absoluteBoundingBox
  frameManifest.push({ id: frame.id, name: frame.name, width, height, file: out })
  console.log('frame', out)
}
}

// 3. Image fills → original PNGs, named after the first node that uses them
const imageManifest = []
if (ONLY.has('images')) {
const fills = await api(`/files/${FILE_KEY}/images`)
const firstUse = {}
;(function walk(node) {
  for (const fill of node.fills ?? []) {
    if (fill.type === 'IMAGE' && !firstUse[fill.imageRef]) firstUse[fill.imageRef] = node.name
  }
  for (const child of node.children ?? []) walk(child)
})(page)
let index = 0
for (const [ref, url] of Object.entries(fills.meta.images)) {
  if (!firstUse[ref]) continue
  index += 1
  const buf = await download(url)
  const meta = await sharp(buf).metadata()
  const out = `design/assets/nfts/${IMAGE_NAMES[ref] ?? `nft-${index}`}.png`
  await save(out, buf)
  imageManifest.push({ ref, usedBy: firstUse[ref], file: out, width: meta.width, height: meta.height, sha256: sha256(buf) })
  console.log('image', out, meta.width, meta.height, firstUse[ref])
}
}

// 4. Icon components → SVG (deduplicated by name)
// Icons are library components: render the first instance of each one found in the page.
const icons = new Map()
;(function walk(node) {
  const name = node.type === 'INSTANCE' ? file.components[node.componentId]?.name : undefined
  if (name && ICON_NAMES.test(name) && !icons.has(name) && node.visible !== false) icons.set(name, node.id)
  for (const child of node.children ?? []) walk(child)
})(page)
// Local components without instances render by their own id.
for (const [id, component] of Object.entries(file.components)) {
  if (ICON_NAMES.test(component.name) && !icons.has(component.name)) icons.set(component.name, id)
}
const iconManifest = []
if (ONLY.has('icons')) {
const iconRenders = await api(
  `/images/${FILE_KEY}?ids=${[...icons.values()].join(',')}&format=svg&version=${VERSION}`,
)
for (const [name, id] of icons) {
  if (!iconRenders.images[id]) {
    console.warn('icon without render, skipped:', name)
    continue
  }
  const svg = await download(iconRenders.images[id])
  const out = `src/assets/icons/${slug(name)}.svg`
  await save(out, svg)
  iconManifest.push({ id, name, file: out, sha256: sha256(svg) })
  console.log('icon', out)
}
}

const previous = existsSync('design/figma/manifest.json')
  ? JSON.parse(await readFile('design/figma/manifest.json', 'utf8'))
  : {}
await save(
  'design/figma/manifest.json',
  JSON.stringify(
    {
      fileKey: FILE_KEY,
      version: VERSION,
      lastModified: file.lastModified,
      frames: ONLY.has('frames') ? frameManifest : previous.frames,
      images: ONLY.has('images') ? imageManifest : previous.images,
      icons: ONLY.has('icons') ? iconManifest : previous.icons,
    },
    null,
    2,
  ) + '\n',
)
console.log('manifest design/figma/manifest.json')
