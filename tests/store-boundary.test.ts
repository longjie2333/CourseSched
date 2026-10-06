import { readdirSync, readFileSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const sourceRoot = resolve(process.cwd(), 'src')
const pagesRoot = join(sourceRoot, 'pages')

const collectSourceFiles = (directory: string): string[] => readdirSync(
  directory,
  { withFileTypes: true },
).flatMap((entry) => {
  const path = join(directory, entry.name)
  if (entry.isDirectory()) return collectSourceFiles(path)
  return ['.ts', '.vue'].includes(extname(entry.name)) ? [path] : []
})

const readSources = (directory: string): string => collectSourceFiles(directory)
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n')

describe('store architecture boundary', () => {
  it('keeps repositories, services, and the composition root out of route pages', () => {
    const forbiddenImport = /from\s+['"][^'"]*(?:-repository|-service|shared\/dependencies)['"]/

    collectSourceFiles(pagesRoot).forEach((file) => {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(forbiddenImport)
    })
  })

  it('routes every page domain through at least one store', () => {
    readdirSync(pagesRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .forEach((entry) => {
        const routeSource = readSources(join(pagesRoot, entry.name))
        expect(routeSource, entry.name).toMatch(/use[A-Z][A-Za-z]+Store/)
      })
  })

  it('defines one wevu store for each stateful business domain', () => {
    const stores = [
      'features/auth/account-store.ts',
      'features/calendar/calendar-store.ts',
      'features/feedback/feedback-store.ts',
      'features/notice/notice-store.ts',
      'features/report/report-store.ts',
      'features/schedule/schedule-store.ts',
    ]

    stores.forEach((relativePath) => {
      const source = readFileSync(join(sourceRoot, relativePath), 'utf8')
      expect(source, relativePath).toContain("from 'wevu/store'")
      expect(source, relativePath).toMatch(/defineStore\(['"][^'"]+['"]/)
    })
  })
})
