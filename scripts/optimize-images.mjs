#!/usr/bin/env node
/**
 * Builds the responsive NFT images served by the app from the Figma originals.
 *   design/assets/nfts/<name>.png → public/images/nfts/<name>-<width>.{avif,webp}
 * Widths cover a 175px mobile card at 2x up to the ~600px detail gallery at 2x.
 */
import { mkdir, readdir } from 'node:fs/promises'
import sharp from 'sharp'

const SOURCE = 'design/assets/nfts'
const TARGET = 'public/images/nfts'
const WIDTHS = [360, 720, 1080]

await mkdir(TARGET, { recursive: true })

for (const file of await readdir(SOURCE)) {
  if (!file.endsWith('.png')) continue
  const name = file.replace(/\.png$/, '')
  for (const width of WIDTHS) {
    const image = sharp(`${SOURCE}/${file}`).resize(width, width)
    await image.clone().avif({ quality: 55 }).toFile(`${TARGET}/${name}-${width}.avif`)
    await image.clone().webp({ quality: 78 }).toFile(`${TARGET}/${name}-${width}.webp`)
  }
  console.log('optimized', name)
}
