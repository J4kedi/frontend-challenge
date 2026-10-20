#!/usr/bin/env node
/**
 * Lighthouse audit of the demo build (the published bundle, mocks enabled).
 *   pages:    home and NFT detail
 *   profiles: mobile (Lighthouse default: Moto G Power, simulated 4G + 4x CPU)
 *             and desktop (lighthouse/core/config/desktop-config.js)
 *   runs:     3 per page and profile; the median of each category is reported
 *
 * Output: reports/lighthouse/<page>-<profile>-<run>.report.{html,json},
 *         reports/lighthouse/summary.{json,md} (medians, LCP/CLS/TBT, environment).
 * Usage: pnpm lighthouse            (builds first unless --no-build)
 *        LH_RUNS=1 pnpm lighthouse  (quick check)
 */
import { execSync, spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import * as chromeLauncher from 'chrome-launcher'
import lighthouse from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'

const PORT = 4173
const ORIGIN = `http://localhost:${PORT}`
const OUT = 'reports/lighthouse'
const RUNS = Number(process.env.LH_RUNS ?? 3)
const PAGES = [
  { name: 'inicio', path: '/' },
  { name: 'detalhe', path: '/nft/emerald-ape-042' },
]
const PROFILES = [
  { name: 'mobile', config: undefined },
  { name: 'desktop', config: desktopConfig },
]
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

async function waitForServer(url, timeoutMs = 30_000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      if ((await fetch(url)).ok) return
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(`server at ${url} did not start`)
}

if (!process.argv.includes('--no-build')) execSync('pnpm build', { stdio: 'inherit' })
await mkdir(OUT, { recursive: true })

const preview = spawn('pnpm', ['preview'], { shell: true, stdio: 'ignore' })
const results = []
let chromeVersion = 'unknown'

try {
  await waitForServer(ORIGIN)
  for (const page of PAGES) {
    for (const profile of PROFILES) {
      for (let run = 1; run <= RUNS; run++) {
        // Fresh browser per run: empty cache, storage and service worker, like a first visit.
        const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox'] })
        try {
          const result = await lighthouse(
            `${ORIGIN}${page.path}`,
            { port: chrome.port, output: ['html', 'json'], logLevel: 'error' },
            profile.config,
          )
          const lhr = result.lhr
          chromeVersion = lhr.environment.hostUserAgent.match(/Chrome\/[\d.]+/)?.[0] ?? chromeVersion
          const base = `${OUT}/${page.name}-${profile.name}-${run}`
          await writeFile(`${base}.report.html`, result.report[0])
          await writeFile(`${base}.report.json`, result.report[1])
          const entry = {
            page: page.name,
            profile: profile.name,
            run,
            scores: Object.fromEntries(CATEGORIES.map((c) => [c, Math.round((lhr.categories[c]?.score ?? 0) * 100)])),
            lcpMs: Math.round(lhr.audits['largest-contentful-paint'].numericValue),
            cls: Number(lhr.audits['cumulative-layout-shift'].numericValue.toFixed(3)),
            tbtMs: Math.round(lhr.audits['total-blocking-time'].numericValue),
            fcpMs: Math.round(lhr.audits['first-contentful-paint'].numericValue),
          }
          results.push(entry)
          console.log(`${page.name} ${profile.name} #${run}`, entry.scores, `LCP ${entry.lcpMs} ms · CLS ${entry.cls} · TBT ${entry.tbtMs} ms`)
        } finally {
          await chrome.kill()
        }
      }
    }
  }
} finally {
  preview.kill()
  if (process.platform === 'win32' && preview.pid) {
    try {
      execSync(`taskkill /pid ${preview.pid} /t /f`, { stdio: 'ignore' })
    } catch {
      // already gone
    }
  }
}

const summary = []
for (const page of PAGES) {
  for (const profile of PROFILES) {
    const runs = results.filter((r) => r.page === page.name && r.profile === profile.name)
    summary.push({
      page: page.name,
      profile: profile.name,
      runs: runs.length,
      median: {
        ...Object.fromEntries(CATEGORIES.map((c) => [c, median(runs.map((r) => r.scores[c]))])),
        lcpMs: median(runs.map((r) => r.lcpMs)),
        cls: median(runs.map((r) => r.cls)),
        tbtMs: median(runs.map((r) => r.tbtMs)),
        fcpMs: median(runs.map((r) => r.fcpMs)),
      },
    })
  }
}

const lighthouseVersion = JSON.parse(execSync('npm ls lighthouse --json --depth=0', { encoding: 'utf8' })).dependencies?.lighthouse?.version
const environment = {
  date: new Date().toISOString(),
  lighthouse: lighthouseVersion,
  chrome: chromeVersion,
  node: process.version,
  os: `${os.type()} ${os.release()} (${os.arch()})`,
  cpu: os.cpus()[0]?.model,
  memoryGb: Math.round(os.totalmem() / 1024 ** 3),
  throttling: 'Lighthouse defaults: mobile = simulated slow 4G + 4x CPU slowdown; desktop = desktop-config (simulated, 1x CPU)',
  build: 'pnpm build (demo build, mocks enabled), served by vite preview',
}
await writeFile(`${OUT}/summary.json`, JSON.stringify({ environment, summary, results }, null, 2) + '\n')

const rows = summary
  .map(
    (s) =>
      `| ${s.page} | ${s.profile} | ${s.median.performance} | ${s.median.accessibility} | ${s.median['best-practices']} | ${s.median.seo} | ${s.median.lcpMs} ms | ${s.median.cls} | ${s.median.tbtMs} ms |`,
  )
  .join('\n')
await writeFile(
  `${OUT}/summary.md`,
  `# Lighthouse — mediana de ${RUNS} execuções\n\n| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |\n| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n${rows}\n\nAmbiente: Lighthouse ${environment.lighthouse} · ${environment.chrome} · Node ${environment.node} · ${environment.os} · ${environment.cpu} · ${environment.memoryGb} GB · ${environment.date}\n\n${environment.throttling}. ${environment.build}.\n`,
)
console.log(`\nsummary → ${OUT}/summary.md`)
