import { readFileSync, readdirSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const sourceRoot = resolve(import.meta.dirname, '../src')
const eventSourceRoots = [
  join(sourceRoot, 'features'),
  join(sourceRoot, 'pages'),
  join(sourceRoot, 'shared'),
]

const collectEventSources = (directory: string): string[] => readdirSync(
  directory,
  { withFileTypes: true },
).flatMap((entry) => {
  const path = join(directory, entry.name)
  if (entry.isDirectory()) return collectEventSources(path)
  return ['.ts', '.vue'].includes(extname(entry.name)) ? [path] : []
})

describe('wevu event payload contract', () => {
  for (const file of eventSourceRoots.flatMap(collectEventSources)) {
    it(`${relative(sourceRoot, file)} consumes the compiler-unwrapped payload`, () => {
      const source = readFileSync(file, 'utf8')
      expect(source).not.toContain('WechatMiniprogram.CustomEvent')
      expect(source).not.toMatch(/\b(?:event|e)\.detail\b/)
    })
  }
})
