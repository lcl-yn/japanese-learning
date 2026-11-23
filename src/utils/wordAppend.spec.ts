import { describe, expect, it } from 'vitest'
import type { WordsManifest } from '@/types/word'
import {
  WORD_APPEND_EMPTY,
  WORD_APPEND_INDEX,
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
  prepareWordUpdate,
  replaceStoredWord,
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
        scale: '',
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

describe('prepareWordUpdate', () => {
  const fields = {
    cn: '大学生',
    jp: 'だいがくせい',
    jp_write: '大学生',
    describe: '',
    part_of_speech: '名',
  }

  it('replaces one entry and keeps its other keys', () => {
    const existing = '[{"cn":"学生","jp":"がくせい","extra":1},{"cn":"老师","jp":"せんせい"}]'
    const prepared = prepareWordUpdate(manifest, existing, { ...word, fileIndex: 0 })
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) return
    expect(JSON.parse(prepared.value.contents)).toEqual([
      { cn: '大学生', jp: 'だいがくせい', jp_write: '大学生', describe: '', part_of_speech: '名', scale: '', extra: 1 },
      { cn: '老师', jp: 'せんせい' },
    ])
  })

  it('keeps the pitch mark when the kana stays the same', () => {
    const existing = '[{"cn":"学生","jp":"がくせい","scale":"⓪"}]'
    const prepared = prepareWordUpdate(manifest, existing, { ...word, cn: '学生', jp: 'がくせい', fileIndex: 0 })
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) return
    expect(JSON.parse(prepared.value.contents)[0].scale).toBe('⓪')
  })

  it('rejects a missing file, a bad index, and a non-array', () => {
    expect(prepareWordUpdate(manifest, null, { ...word, fileIndex: 0 })).toEqual({
      ok: false,
      message: WORD_APPEND_INDEX,
    })
    expect(prepareWordUpdate(manifest, '[{"cn":"学生"}]', { ...word, fileIndex: 1 })).toEqual({
      ok: false,
      message: WORD_APPEND_INDEX,
    })
    expect(prepareWordUpdate(manifest, '{"cn":"学生"}', { ...word, fileIndex: 0 })).toEqual({
      ok: false,
      message: WORD_APPEND_SHAPE,
    })
    expect(replaceStoredWord([{ cn: '学生' }], 0, fields).ok).toBe(true)
  })
})
