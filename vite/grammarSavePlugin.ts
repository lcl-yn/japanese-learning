import { mkdir, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import type { Plugin } from 'vite'
import {
  lessonRelativePath,
  lessonSavePath,
  parseGrammarSaveBody,
  type LessonSection,
} from '../src/utils/grammarDocument.ts'

const SECTIONS: LessonSection[] = ['grammar', 'reading']

const MAX_BYTES = 512 * 1024

/**
 * 开发时把课文和语法编辑器的保存写进 public/data/reading 或 public/data/grammar。
 * 只在 vite dev 注册，打包后的静态站点没有这个接口。
 */
export function grammarSavePlugin(): Plugin {
  return {
    name: 'grammar-save',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split('?')[0]
        const section = SECTIONS.find((item) => lessonSavePath(item) === pathname)
        if (!section || req.method !== 'PUT') {
          next()
          return
        }
        void persist(server.config.root, section, req, res)
      })
    },
  }
}

async function persist(
  root: string,
  section: LessonSection,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    const parsed = parseGrammarSaveBody(parseJson(await readBody(req)))
    if (!parsed) {
      reply(res, 400)
      return
    }
    const dataRoot = resolve(root, 'public', 'data', section)
    const filePath = resolve(root, 'public', lessonRelativePath(section, parsed.bookId, parsed.unit, parsed.lesson))
    const fromRoot = relative(dataRoot, filePath)
    if (fromRoot.startsWith('..') || isAbsolute(fromRoot)) {
      reply(res, 400)
      return
    }
    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(filePath, `${JSON.stringify(parsed.document, null, 2)}\n`, 'utf8')
    reply(res, 200, '{"ok":true}')
  } catch {
    reply(res, 400)
  }
}

function parseJson(text: string): unknown {
  return JSON.parse(text) as unknown
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolveBody, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    let failed = false
    req.on('data', (chunk: Buffer) => {
      if (failed) return
      size += chunk.length
      if (size > MAX_BYTES) {
        failed = true
        reject(new Error('too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (!failed) resolveBody(Buffer.concat(chunks).toString('utf8'))
    })
    req.on('error', (error: Error) => {
      if (!failed) reject(error)
    })
  })
}

function reply(res: ServerResponse, status: number, body = ''): void {
  if (res.writableEnded) return
  res.statusCode = status
  if (body) res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(body)
}
