import type { WordsManifest } from '../types/word.ts'
import { wordPages } from './unitPages.ts'

/** 开发服务器追加单词的地址。打包后的页面没有这个接口。 */
export const WORD_SAVE_PATH = '/__words'

export const WORD_APPEND_EMPTY = '必填为空'
export const WORD_APPEND_MISSING = '清单里没有这一课'
export const WORD_APPEND_PATH = '路径不合法'
export const WORD_APPEND_PARSE = '词表无法解析'
export const WORD_APPEND_SHAPE = '词表不是数组'
export const WORD_APPEND_WRITE = '写入失败'
export const WORD_APPEND_FAILED = '添加失败'

const MAX_LESSON_NUMBER = 999

export interface StoredWordFields {
  cn: string
  jp: string
  jp_write: string
  describe: string
  part_of_speech: string
}

export interface WordAppendBody extends StoredWordFields {
  bookId: string
  unit: number
  lesson: number
}

export type WordAppendResult<T> = { ok: true; value: T } | { ok: false; message: string }

/**
 * 校验添加单词的请求。
 * 五个文本字段必须是字符串；中文、假名、手写去空白后不能为空。说明和词性空白写成空字符串。
 *
 * @param raw 请求体
 * @return 去过空白的请求；字段不合法时带失败原因
 */
export function parseWordAppendBody(raw: unknown): WordAppendResult<WordAppendBody> {
  if (!raw || typeof raw !== 'object') return fail(WORD_APPEND_EMPTY)
  const body = raw as Record<string, unknown>
  const cn = trimmed(body.cn)
  const jp = trimmed(body.jp)
  const jpWrite = trimmed(body.jp_write)
  const describe = trimmed(body.describe)
  const partOfSpeech = trimmed(body.part_of_speech)
  if (!cn || !jp || !jpWrite || describe === null || partOfSpeech === null) return fail(WORD_APPEND_EMPTY)
  if (!isLessonNumber(body.unit) || !isLessonNumber(body.lesson) || typeof body.bookId !== 'string' || !body.bookId) {
    return fail(WORD_APPEND_MISSING)
  }
  return {
    ok: true,
    value: {
      bookId: body.bookId,
      unit: body.unit,
      lesson: body.lesson,
      cn,
      jp,
      jp_write: jpWrite,
      describe,
      part_of_speech: partOfSpeech,
    },
  }
}

/**
 * 判断清单里的 file 能不能作为词库相对路径。
 * 拒绝绝对路径、空段和 `..`，避免写到词库目录外面。
 *
 * @param file 清单中的 file
 * @return 可以拼到 public/data/words 下面时为 true
 */
export function isSafeManifestFile(file: string): boolean {
  if (!file || file.startsWith('/') || file.startsWith('\\') || /^[A-Za-z]:/.test(file)) return false
  const parts = file.split(/[/\\]/)
  return parts.every((part) => part.length > 0 && part !== '.' && part !== '..')
}

/**
 * 判断 path.relative 的结果是否仍在词库目录内。
 * 开发服务器算出相对路径后调用，拦住解析后跑出 public/data/words 的位置。
 *
 * @param fromRoot path.relative 得到的路径
 * @return 仍在词库目录内时为 true
 */
export function isInsideWordsRoot(fromRoot: string): boolean {
  if (!fromRoot || fromRoot.startsWith('/') || fromRoot.startsWith('\\') || /^[A-Za-z]:/.test(fromRoot)) return false
  return !fromRoot.split(/[/\\]/).includes('..')
}

/**
 * 按册、单元、课号找到清单里的词表文件。
 * 先匹配课，没有再匹配带词表的单元页。课和页课号相同时用课的文件。
 *
 * @param manifest 词库清单
 * @param bookId 册代号
 * @param unit 单元号
 * @param lesson 课号
 * @return 相对 public/data/words 的 file；找不到或路径不合法时带失败原因
 */
export function resolveWordFile(
  manifest: WordsManifest,
  bookId: string,
  unit: number,
  lesson: number,
): WordAppendResult<string> {
  const book = manifest.books.find((item) => item.code === bookId)
  const unitMeta = book?.units.find((item) => item.unit === unit)
  if (!unitMeta) return fail(WORD_APPEND_MISSING)
  const lessonFile = unitMeta.lessons.find((item) => item.lesson === lesson)?.file
  const pageFile = wordPages(unitMeta).find((item) => item.lesson === lesson)?.file
  const file = lessonFile ?? pageFile
  if (!file) return fail(WORD_APPEND_MISSING)
  if (!isSafeManifestFile(file)) return fail(WORD_APPEND_PATH)
  return { ok: true, value: file }
}

/**
 * 把一条词加到词表数组末尾。
 * 已有条目原样保留。新对象只有五个字段。
 *
 * @param existing 课次 JSON 解析结果
 * @param word 去过空白的新词
 * @return 追加后的数组；现有内容不是数组时失败
 */
export function appendStoredWord(existing: unknown, word: StoredWordFields): WordAppendResult<unknown[]> {
  if (!Array.isArray(existing)) return fail(WORD_APPEND_SHAPE)
  return {
    ok: true,
    value: [
      ...existing,
      {
        cn: word.cn,
        jp: word.jp,
        jp_write: word.jp_write,
        describe: word.describe,
        part_of_speech: word.part_of_speech,
      },
    ],
  }
}

/**
 * 把词表格式化成和现有课次文件一样的 JSON。
 *
 * @param words 追加后的数组
 * @return 4 空格缩进、末尾换行的文本
 */
export function formatWordFile(words: unknown[]): string {
  return `${JSON.stringify(words, null, 4)}\n`
}

/**
 * 从清单和课次文本算出要写回的文件。
 * 文件不存在时从空数组开始。文本不是 JSON 或不为数组时不产生写入内容。
 *
 * @param manifest 词库清单
 * @param existingText 现有文件文本；文件不存在时为 null
 * @param raw 请求体
 * @return 相对路径和完整文件内容
 */
export function prepareWordAppend(
  manifest: WordsManifest,
  existingText: string | null,
  raw: unknown,
): WordAppendResult<{ relativeFile: string; contents: string }> {
  const parsed = parseWordAppendBody(raw)
  if (!parsed.ok) return parsed
  const located = resolveWordFile(manifest, parsed.value.bookId, parsed.value.unit, parsed.value.lesson)
  if (!located.ok) return located
  let existing: unknown = []
  if (existingText !== null) {
    try {
      existing = JSON.parse(existingText) as unknown
    } catch {
      return fail(WORD_APPEND_PARSE)
    }
  }
  const appended = appendStoredWord(existing, parsed.value)
  if (!appended.ok) return appended
  return { ok: true, value: { relativeFile: located.value, contents: formatWordFile(appended.value) } }
}

function fail(message: string): WordAppendResult<never> {
  return { ok: false, message }
}

function trimmed(value: unknown): string | null {
  if (typeof value !== 'string') return null
  return value.trim()
}

function isLessonNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_LESSON_NUMBER
}
