import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Guard of the design contract (docs/design/tokens.md): colors, fonts and
 * shadows come from theme.css tokens. A raw value in a component is a color
 * the Figma never had, so it fails here instead of in review.
 */
const ROOT = join(__dirname, '..')

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sources(path)
    return path.endsWith('.tsx') ? [path] : []
  })
}

const RULES: { name: string; pattern: RegExp }[] = [
  // 6/8-digit hex, or 3/4-digit with a letter: token ids like "#0042" are not colors.
  { name: 'hex color', pattern: /#(?:[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?|(?=[0-9]*[a-fA-F])[0-9a-fA-F]{3,4})\b/g },
  { name: 'rgb()/hsl() color', pattern: /\b(?:rgba?|hsla?|oklch)\(/g },
  { name: 'arbitrary color utility', pattern: /\b(?:text|bg|border|ring|fill|stroke|from|to|via)-\[(?:#|rgb|hsl|oklch)/g },
  { name: 'arbitrary font family', pattern: /\bfont-\[/g },
  { name: 'arbitrary shadow', pattern: /\bshadow-\[/g },
]

describe('design tokens guard', () => {
  const files = sources(ROOT)

  it('scans the components', () => {
    expect(files.length).toBeGreaterThan(30)
  })

  for (const rule of RULES) {
    it(`no ${rule.name} in .tsx files`, () => {
      const offenders = files.flatMap((file) => {
        const code = readFileSync(file, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*$/gm, '')
        return [...code.matchAll(rule.pattern)].map((m) => `${relative(ROOT, file)}: ${m[0]}`)
      })
      expect(offenders).toEqual([])
    })
  }
})
