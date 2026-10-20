import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    svgr({
      // Figma icons are monochrome in the palette: render them with currentColor.
      svgrOptions: {
        replaceAttrValues: Object.fromEntries(
          ['#B39463', '#140D0A', '#D28A4C', '#F5F1EB', '#CFB28C', '#E89B55', '#F0805F', '#3F2319', 'white'].map((c) => [c, 'currentColor']),
        ),
        svgProps: { 'aria-hidden': 'true', focusable: 'false' },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // MSW only needs tough-cookie for Set-Cookie on mocked responses; this API has no cookies.
      'tough-cookie': fileURLToPath(new URL('./src/mocks/shims/tough-cookie.ts', import.meta.url)),
    },
  },
})
