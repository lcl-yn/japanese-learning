import { mkdir, readFile, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { dirname, relative, resolve } from 'node:path'
import type { Plugin } from 'vite'
import type { WordsManifest } from '../src/types/word.ts'
import {
  WORD_APPEND_INDEX,
  WORD_APPEND_PATH,
  WORD_APPEND_WRITE,
  WORD_SAVE_PATH,
  WORD_UPDATE_PATH,
  isInsideWordsRoot,
  locateWordFile,
  prepareWordAppend,
  prepareWordUpdate,
} from '../src/utils/wordAppend.ts'

const MAX_BYTES = 32 * 1024

let writeQueue = Promise.resolve()

/**
 * 让词表写入按提交顺序进行。
 * 两次添加同时读到旧文件时，后写完的一次会盖掉先追加的那条。
 *
 * @param work 一次完整的读、追加和写回
 * @return work 的结果
 */
export function enqueueWordWrite<T>(work: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(work, work)
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

/**
 * 开发时把一条词追加进清单指向的课次 JSON。
 * 只在 vite dev 注册，打包后的静态站点没有这个接口。
 */
export function wordSavePlugin(): Plugin {
  return {
    name: 'word-save',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split('?')[0]
        const update = pathname === WORD_UPDATE_PATH
        if ((pathname !== WORD_SAVE_PATH && !update) || req.method !== 'PUT') {
          next()
          return
        }
        void enqueueWordWrite(async () => {
          const rawBody = await readBody(req)
          const result = update
            ? await persistWordUpdate(server.config.root, rawBody)
            : await persistWordAppend(server.config.root, rawBody)
          reply(res, result.status, result.body)
        }).catch(() => reply(res, 400, JSON.stringify({ message: WORD_APPEND_WRITE })))
      })
    },
  }
}

/**
 * 按清单把请求追加到词表文件。
 * 路径必须留在 public/data/words 内。文件缺失时新建；不是数组或无法解析时不改文件。
 *
 * @param root 项目根目录
 * @param rawBody 请求 JSON 文本
 * @return HTTP 状态和响应正文
 */
export async function persistWordAppend(root: string, rawBody: string): Promise<{ status: number; body: string }> {
  return persistWordFile(root, rawBody, prepareWordAppend, true)
}

/**
 * 按清单替换课次 JSON 里的一条词。
 * 文件不存在或下标越界时不新建、不改文件。
 *
 * @param root 项目根目录
 * @param rawBody 请求 JSON 文本
 * @return HTTP 状态和响应正文
 */
export async function persistWordUpdate(root: string, rawBody: string): Promise<{ status: number; body: string }> {
  return persistWordFile(root, rawBody, prepareWordUpdate, false)
}

async function persistWordFile(
  root: string,
  rawBody: string,
  prepare: typeof prepareWordAppend | typeof prepareWordUpdate,
  createMissing: boolean,
): Promise<{ status: number; body: string }> {
  let raw: unknown
  try {
    raw = JSON.parse(rawBody) as unknown
  } catch {
    return fail(WORD_APPEND_WRITE)
  }
  let manifest: WordsManifest
  try {
    manifest = JSON.parse(await readFile(resolve(root, 'public', 'data', 'words', 'manifest.json'), 'utf8')) as WordsManifest
  } catch {
    return fail(WORD_APPEND_WRITE)
  }
  const located = locateWordFile(manifest, raw)
  if (!located.ok) return fail(located.message)
  const dataRoot = resolve(root, 'public', 'data', 'words')
  const filePath = resolve(dataRoot, located.value)
  const fromRoot = relative(dataRoot, filePath)
  if (!isInsideWordsRoot(fromRoot)) return fail(WORD_APPEND_PATH)

  let existingText: string | null
  try {
    existingText = await readFile(filePath, 'utf8')
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : ''
    if (code !== 'ENOENT') return fail(WORD_APPEND_WRITE)
    if (!createMissing) return fail(WORD_APPEND_INDEX)
    existingText = null
  }
  const prepared = prepare(manifest, existingText, raw)
  if (!prepared.ok) return fail(prepared.message)
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, prepared.value.contents, 'utf8')
  return { status: 200, body: '{"ok":true}' }
}

function fail(message: string): { status: number; body: string } {
  return { status: 400, body: JSON.stringify({ message }) }
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

function reply(res: ServerResponse, status: number, body: string): void {
  if (res.writableEnded) return
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(body)
}
