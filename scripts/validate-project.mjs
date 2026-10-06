import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const sourceRoot = join(root, 'src')
const errors = []
const jsonFiles = ['sitemap.json', 'theme.json']
const wxssFiles = ['app.wxss']
const sourceDirectories = ['pages', 'features', 'shared']
const protectedFiles = new Map([
  ['node_modules/tdesign-miniprogram/miniprogram_dist/tabs/tabs.js', '389443da5383c35e640ad44314633e168ac4b172403be208b46db04f000bf18c'],
  ['node_modules/tdesign-miniprogram/miniprogram_dist/tabs/tabs.wxml', 'fb86f2b6035390bf19af868122ad7591b35717b7419e5dc7bb09936614105b8f'],
])

if (!existsSync(join(root, 'vite.config.ts'))) {
  errors.push('vite.config.ts is missing; it is the weapp-vite configuration source of truth')
}
if (existsSync(join(root, 'weapp-vite.config.ts'))) {
  errors.push('weapp-vite.config.ts must not coexist with vite.config.ts')
}

if (existsSync(join(sourceRoot, 'app.json'))) jsonFiles.push('app.json')

const walk = (directory) => {
  if (!existsSync(directory)) return
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) walk(path)
    else if (extname(entry.name) === '.json') jsonFiles.push(relative(sourceRoot, path))
    else if (extname(entry.name) === '.wxss') wxssFiles.push(relative(sourceRoot, path))
  }
}

sourceDirectories.forEach((directory) => walk(join(sourceRoot, directory)))

for (const [file, expectedHash] of protectedFiles) {
  const path = join(root, file)
  if (!existsSync(path)) {
    errors.push(`${file}: protected TDesign customization is missing`)
    continue
  }
  const hash = createHash('sha256').update(readFileSync(path)).digest('hex')
  if (hash !== expectedHash) errors.push(`${file}: protected TDesign customization was overwritten`)
}

const parsedFiles = new Map()
for (const file of [...new Set(jsonFiles)]) {
  try {
    const content = readFileSync(join(sourceRoot, file), 'utf8').replace(/^\uFEFF/, '')
    parsedFiles.set(file, JSON.parse(content))
  }
  catch (error) {
    errors.push(`${file}: ${error.message}`)
  }
}

for (const [file, config] of parsedFiles) {
  for (const [name, component] of Object.entries(config.usingComponents ?? {})) {
    const componentBase = component.startsWith('/')
      ? join(sourceRoot, component.slice(1))
      : component.startsWith('tdesign-miniprogram/')
        ? join(root, 'node_modules', 'tdesign-miniprogram', 'miniprogram_dist', component.slice('tdesign-miniprogram/'.length))
        : join(sourceRoot, file, '..', component)
    if (!existsSync(`${componentBase}.json`)) {
      errors.push(`${file}: component "${name}" points to missing ${component}`)
    }
  }
}

const resolveWxssImport = (file, request) => {
  const tdesignPrefix = '/miniprogram_npm/tdesign-miniprogram/'
  if (request.startsWith(tdesignPrefix)) {
    return join(
      root,
      'node_modules',
      'tdesign-miniprogram',
      'miniprogram_dist',
      request.slice(tdesignPrefix.length),
    )
  }
  if (request.startsWith('/')) return join(sourceRoot, request.slice(1))
  return resolve(dirname(join(sourceRoot, file)), request)
}

for (const file of [...new Set(wxssFiles)]) {
  const content = readFileSync(join(sourceRoot, file), 'utf8')
  for (const match of content.matchAll(/@import\s+['"]([^'"]+)['"]/g)) {
    const request = match[1]
    const target = resolveWxssImport(file, request)
    if (!existsSync(target)) {
      errors.push(`${file}: WXSS import "${request}" points to missing ${relative(root, target)}`)
    }
  }
}

let app = parsedFiles.get('app.json')
if (!app && existsSync(join(sourceRoot, 'app.vue'))) {
  const appSource = readFileSync(join(sourceRoot, 'app.vue'), 'utf8')
  const pagesBlock = appSource.match(/pages\s*:\s*\[([\s\S]*?)\]/)?.[1] ?? ''
  app = {
    pages: [...pagesBlock.matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1]),
  }
  if (!appSource.includes('defineAppJson(')) {
    errors.push('app.vue: defineAppJson is missing')
  }
}
if (!app) errors.push('src/app.vue or src/app.json is required')
for (const page of app?.pages ?? []) {
  const isVuePage = existsSync(join(sourceRoot, `${page}.vue`))
  if (!isVuePage) {
    for (const extension of ['.json', '.wxml', '.wxss']) {
      if (!existsSync(join(sourceRoot, `${page}${extension}`))) {
        errors.push(`app.json: page ${page} is missing ${extension}`)
      }
    }
    if (!existsSync(join(sourceRoot, `${page}.ts`)) && !existsSync(join(sourceRoot, `${page}.js`))) {
      errors.push(`app.json: page ${page} is missing its script`)
    }
  }
}

if (!existsSync(join(sourceRoot, 'env.js'))) {
  errors.push('src/env.js is missing; create it from src/env.example.js')
}

try {
  const project = JSON.parse(readFileSync(join(root, 'project.config.json'), 'utf8'))
  if (project.miniprogramRoot !== 'dist/') {
    errors.push('project.config.json: miniprogramRoot must point to dist/')
  }
}
catch (error) {
  errors.push(`project.config.json: ${error.message}`)
}

try {
  const privateProject = JSON.parse(
    readFileSync(join(root, 'project.private.config.json'), 'utf8'),
  )
  if (privateProject.setting?.compileHotReLoad !== false) {
    errors.push(
      'project.private.config.json: compileHotReLoad must stay false while using classic HMR',
    )
  }
}
catch (error) {
  errors.push(`project.private.config.json: ${error.message}`)
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exitCode = 1
}
else {
  console.log(`Validated ${parsedFiles.size} source JSON files and ${app?.pages?.length ?? 0} pages.`)
}
