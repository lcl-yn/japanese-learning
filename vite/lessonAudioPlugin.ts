import { readdirSync, type Dirent } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import type { Plugin, ViteDevServer } from 'vite'
import {
  isLessonAudioBookId,
  isLessonAudioFileName,
  listLessonAudioPaths,
  type LessonAudioBookFiles,
} from '../src/utils/lessonAudio.ts'

const VIRTUAL_ID = 'virtual:lesson-audio'
const RESOLVED_ID = '\0virtual:lesson-audio'

/**
 * 把 public/data/audio 各册目录里的音频交给编辑器。
 * 开发时目录有增删就更新这份列表，页面仍用 /data/audio/册/文件名 播放，不把音频打进脚本。
 */
export function lessonAudioPlugin(): Plugin {
  let root = process.cwd()
  const audioDir = () => resolve(root, 'public', 'data', 'audio')

  return {
    name: 'lesson-audio',
    configResolved(config) {
      root = config.root
    },
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
    },
    load(id) {
      if (id === RESOLVED_ID) return moduleSource(audioDir())
    },
    configureServer(server) {
      watchAudioDir(server, audioDir())
    },
  }
}

function moduleSource(dir: string): string {
  return `export const lessonAudioFiles = ${JSON.stringify(readAudioNames(dir))}\n`
}

function readAudioNames(dir: string): string[] {
  let entries: Dirent[]
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }
  const books: LessonAudioBookFiles[] = []
  for (const entry of entries) {
    if (!entry.isDirectory() || !isLessonAudioBookId(entry.name)) continue
    let files: Dirent[]
    try {
      files = readdirSync(join(dir, entry.name), { withFileTypes: true })
    } catch {
      continue
    }
    books.push({
      bookId: entry.name,
      fileNames: files.filter((file) => file.isFile()).map((file) => file.name),
    })
  }
  return listLessonAudioPaths(books)
}

/**
 * 音频文件增删后让虚拟模块重新读目录。
 * 启动时扫到的已有文件不触发刷新。
 *
 * @param server 开发服务器
 * @param dir 音频目录
 */
function watchAudioDir(server: ViteDevServer, dir: string): void {
  server.watcher.add(dir)
  let known = JSON.stringify(readAudioNames(dir))
  const refresh = (file: string) => {
    const bookDir = dirname(file)
    if (resolve(dirname(bookDir)) !== resolve(dir)) return
    if (!isLessonAudioBookId(basename(bookDir)) || !isLessonAudioFileName(basename(file))) return
    const next = JSON.stringify(readAudioNames(dir))
    if (next === known) return
    known = next
    const mod = server.moduleGraph.getModuleById(RESOLVED_ID)
    if (!mod) return
    server.moduleGraph.invalidateModule(mod)
    void server.reloadModule(mod)
  }
  server.watcher.on('add', refresh)
  server.watcher.on('unlink', refresh)
}
