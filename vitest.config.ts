import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

// Unit tests live next to the code (src/**/*.test.ts); tests/e2e belongs to Playwright.
export default mergeConfig(viteConfig, defineConfig({ test: { include: ['src/**/*.test.ts'] } }))
