import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const distRoot = join(root, 'dist')
const errors = []
const jsonFiles = []
const wxssFiles = []

const walk = (directory) => {
  if (!existsSync(directory)) return
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) walk(path)
    else if (extname(entry.name) === '.json') jsonFiles.push(path)
    else if (extname(entry.name) === '.wxss') wxssFiles.push(path)
  }
}

walk(distRoot)

if (!existsSync(join(distRoot, 'app.json'))) {
  errors.push('dist/app.json is missing; run the production build first')
}

const parsedJson = new Map()
for (const file of jsonFiles) {
  try {
    parsedJson.set(file, JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, '')))
  }
  catch (error) {
    errors.push(`${relative(root, file)}: ${error.message}`)
  }
}

const app = parsedJson.get(join(distRoot, 'app.json'))
for (const page of app?.pages ?? []) {
  for (const extension of ['.js', '.json', '.wxml', '.wxss']) {
    if (!existsSync(join(distRoot, `${page}${extension}`))) {
      errors.push(`dist/app.json: page ${page} is missing ${extension}`)
    }
  }
}

for (const [file, config] of parsedJson) {
  for (const [name, request] of Object.entries(config.usingComponents ?? {})) {
    if (typeof request !== 'string' || /^(plugin|dynamicLib|ext):\/\//.test(request)) continue
    const componentBase = request.startsWith('/')
      ? join(distRoot, request.slice(1))
      : resolve(dirname(file), request)
    if (!existsSync(`${componentBase}.json`)) {
      errors.push(`${relative(root, file)}: component "${name}" points to missing ${request}`)
    }
  }
}

for (const file of wxssFiles) {
  const content = readFileSync(file, 'utf8')
  for (const match of content.matchAll(/@import\s+['"]([^'"]+)['"]/g)) {
    const request = match[1]
    if (/^(https?:)?\/\//.test(request)) continue
    const target = request.startsWith('/')
      ? join(distRoot, request.slice(1))
      : resolve(dirname(file), request)
    if (!existsSync(target)) {
      errors.push(`${relative(root, file)}: WXSS import "${request}" points to missing ${relative(root, target)}`)
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exitCode = 1
}
else {
  console.log(`Validated ${jsonFiles.length} built JSON files, ${wxssFiles.length} WXSS files, and ${app?.pages?.length ?? 0} routes.`)
}
