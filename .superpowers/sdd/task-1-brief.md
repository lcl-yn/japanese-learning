## Task 1: 追加词的纯函数

**Files:**
- Create: `src/utils/wordAppend.ts`
- Modify: `src/utils/unitPages.ts`（只改类型导入，让 Vite 的 node 工程能跟着插件解析到这个文件）
- Test: `src/utils/wordAppend.spec.ts`

**Interfaces:**
- Consumes: `WordsManifest`、`wordPages`（`src/utils/unitPages.ts`）
- Produces:
  - `WORD_SAVE_PATH = '/__words'`
  - `WORD_APPEND_EMPTY = '必填为空'`
  - `WORD_APPEND_MISSING = '清单里没有这一课'`
  - `WORD_APPEND_PATH = '路径不合法'`
  - `WORD_APPEND_PARSE = '词表无法解析'`
  - `WORD_APPEND_SHAPE = '词表不是数组'`
  - `WORD_APPEND_WRITE = '写入失败'`
  - `WORD_APPEND_FAILED = '添加失败'`
  - `StoredWordFields`: `{ cn, jp, jp_write, describe, part_of_speech }` 五个 `string`
  - `WordAppendBody`: `StoredWordFields` 加上 `bookId: string`、`unit: number`、`lesson: number`
  - `WordAppendResult<T> = { ok: true; value: T } | { ok: false; message: string }`
  - `parseWordAppendBody(raw: unknown): WordAppendResult<WordAppendBody>`
  - `isSafeManifestFile(file: string): boolean`
  - `isInsideWordsRoot(fromRoot: string): boolean`
  - `resolveWordFile(manifest: WordsManifest, bookId: string, unit: number, lesson: number): WordAppendResult<string>`
  - `appendStoredWord(existing: unknown, word: StoredWordFields): WordAppendResult<unknown[]>`
  - `formatWordFile(words: unknown[]): string`
  - `prepareWordAppend(manifest: WordsManifest, existingText: string | null, raw: unknown): WordAppendResult<{ relativeFile: string; contents: string }>`

- [ ] **Step 1: Write the failing test**

Create `src/utils/wordAppend.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { WordsManifest } from '@/types/word'
import {
  WORD_APPEND_EMPTY,
  WORD_APPEND_MISSING,
  WORD_APPEND_PARSE,
  WORD_APPEND_PATH,
  WORD_APPEND_SHAPE,
  appendStoredWord,
  formatWordFile,
  isInsideWordsRoot,
  isSafeManifestFile,
  parseWordAppendBody,
  prepareWordAppend,
  resolveWordFile,
} from './wordAppend'

const manifest: WordsManifest = {
  books: [
    {
      code: 'beginner-upper',
      name: '初级上册',
      level: 'beginner',
      volume: 'upper',
      units: [
        {
          unit: 1,
          name: '第1单元',
          lessons: [
            { id: 1, lesson: 1, name: '第1课', file: 'beginner-upper/lesson-01.json' },
          ],
          pages: [
            { id: 'spring', name: '单元末-词语之泉', lesson: 101, file: 'beginner-upper/unit-01-spring.json' },
            { id: 'clash', name: '重复课号', lesson: 1, file: 'beginner-upper/clash.json' },
          ],
        },
      ],
    },
  ],
}

const word = {
  bookId: 'beginner-upper',
  unit: 1,
  lesson: 1,
  cn: ' 大学生 ',
  jp: ' だいがくせい ',
  jp_write: ' 大学生 ',
  describe: '  ',
  part_of_speech: ' 名 ',
}

describe('parseWordAppendBody', () => {
  it('trims fields and keeps an empty description', () => {
    expect(parseWordAppendBody(word)).toEqual({
      ok: true,
      value: {
        bookId: 'beginner-upper',
        unit: 1,
        lesson: 1,
        cn: '大学生',
        jp: 'だいがくせい',
        jp_write: '大学生',
        describe: '',
        part_of_speech: '名',
      },
    })
  })

  it('rejects a blank required field', () => {
    expect(parseWordAppendBody({ ...word, jp_write: '  ' })).toEqual({
      ok: false,
      message: WORD_APPEND_EMPTY,
    })
    expect(parseWordAppendBody({ ...word, cn: 1 })).toEqual({
      ok: false,
      message: WORD_APPEND_EMPTY,
    })
  })

  it('rejects a location that is not a lesson number', () => {
    expect(parseWordAppendBody({ ...word, lesson: 0 })).toEqual({
      ok: false,
      message: WORD_APPEND_MISSING,
    })
  })
})

describe('resolveWordFile', () => {
  it('prefers the lesson file when a page reuses the lesson number', () => {
    expect(resolveWordFile(manifest, 'beginner-upper', 1, 1)).toEqual({
      ok: true,
      value: 'beginner-upper/lesson-01.json',
    })
  })

  it('finds a word-list page', () => {
    expect(resolveWordFile(manifest, 'beginner-upper', 1, 101)).toEqual({
      ok: true,
      value: 'beginner-upper/unit-01-spring.json',
    })
  })

  it('rejects an unknown lesson and an unsafe file', () => {
    expect(resolveWordFile(manifest, 'beginner-upper', 1, 2)).toEqual({
      ok: false,
      message: WORD_APPEND_MISSING,
    })
    expect(isSafeManifestFile('../secret.json')).toBe(false)
    expect(isSafeManifestFile('/tmp/secret.json')).toBe(false)
    expect(isInsideWordsRoot('../secret.json')).toBe(false)
    expect(isInsideWordsRoot('C:/secret.json')).toBe(false)
    expect(isInsideWordsRoot('beginner-upper/lesson-01.json')).toBe(true)
    expect(isInsideWordsRoot('beginner-upper\\lesson-01.json')).toBe(true)
  })
})

describe('prepareWordAppend', () => {
  it('appends five fields and leaves existing entries untouched', () => {
    const existing = '[{"cn":"学生","jp":"がくせい","extra":1}]'
    const prepared = prepareWordAppend(manifest, existing, word)
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) return
    expect(prepared.value.relativeFile).toBe('beginner-upper/lesson-01.json')
    expect(JSON.parse(prepared.value.contents)).toEqual([
      { cn: '学生', jp: 'がくせい', extra: 1 },
      {
        cn: '大学生',
        jp: 'だいがくせい',
        jp_write: '大学生',
        describe: '',
        part_of_speech: '名',
      },
    ])
    expect(prepared.value.contents.endsWith('\n')).toBe(true)
    expect(prepared.value.contents).toContain('\n    {\n')
  })

  it('starts from an empty array when the file is missing', () => {
    const prepared = prepareWordAppend(manifest, null, { ...word, lesson: 101 })
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) return
    expect(JSON.parse(prepared.value.contents)).toHaveLength(1)
    expect(prepared.value.relativeFile).toBe('beginner-upper/unit-01-spring.json')
  })

  it('rejects text that is not a JSON array and does not build contents', () => {
    expect(prepareWordAppend(manifest, '{"cn":"学生"}', word)).toEqual({
      ok: false,
      message: WORD_APPEND_SHAPE,
    })
    expect(prepareWordAppend(manifest, '{', word)).toEqual({
      ok: false,
      message: WORD_APPEND_PARSE,
    })
  })

  it('rejects a manifest file that leaves the words directory', () => {
    const escaped: WordsManifest = {
      books: [
        {
          ...manifest.books[0],
          units: [
            {
              unit: 1,
              name: '第1单元',
              lessons: [{ id: 1, lesson: 1, name: '第1课', file: '../secret.json' }],
            },
          ],
        },
      ],
    }
    expect(prepareWordAppend(escaped, null, word)).toEqual({
      ok: false,
      message: WORD_APPEND_PATH,
    })
    expect(appendStoredWord([{ cn: '学生' }], {
      cn: '大学生',
      jp: 'だいがくせい',
      jp_write: '大学生',
      describe: '',
      part_of_speech: '名',
    }).ok).toBe(true)
    expect(formatWordFile([]).endsWith('\n')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/wordAppend.spec.ts`

Expected: FAIL，找不到 `./wordAppend`

- [ ] **Step 3: Write minimal implementation**

Create `src/utils/wordAppend.ts`:

```ts
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
```

In `src/utils/unitPages.ts`, replace `import type { UnitMeta, UnitPageMeta } from '@/types/word'` with `import type { UnitMeta, UnitPageMeta } from '../types/word.ts'`. `tsconfig.node.json` 没有 `@/` 别名；插件一旦引用 `wordAppend.ts`，类型检查会继续读进 `unitPages.ts`。

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/wordAppend.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/wordAppend.ts src/utils/wordAppend.spec.ts src/utils/unitPages.ts
git commit -m "$(cat <<'EOF'
feat: validate and append a word in memory

EOF
)"
```

