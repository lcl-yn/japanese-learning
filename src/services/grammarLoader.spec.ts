import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadGrammarDocument, loadLessonDocument, saveGrammarDocument, saveLessonDocument } from './grammarLoader'
import { GRAMMAR_SAVE_PATH, READING_SAVE_PATH, emptyGrammarDocument } from '@/utils/grammarDocument'

describe('loadGrammarDocument', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns an empty document when the dev server falls back to the page', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('<!doctype html>', { status: 200, headers: { 'content-type': 'text/html' } }),
    )

    await expect(loadGrammarDocument('beginner-upper', 1, 1, '/')).resolves.toEqual(emptyGrammarDocument())
  })

  it('returns an empty document when the lesson file is missing', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('', { status: 404 }))

    await expect(loadGrammarDocument('beginner-upper', 1, 1, '/')).resolves.toEqual(emptyGrammarDocument())
    expect(fetch).toHaveBeenCalledWith('/data/grammar/beginner-upper/unit-01-lesson-01.json')
  })

  it('returns the document from the lesson file', async () => {
    const document = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'あります' }] }],
    }
    vi.mocked(fetch).mockResolvedValue(Response.json(document))

    await expect(loadGrammarDocument('beginner-upper', 1, 2, '/app/')).resolves.toEqual(document)
    expect(fetch).toHaveBeenCalledWith('/app/data/grammar/beginner-upper/unit-01-lesson-02.json')
  })

  it('rejects a bad file and a failed response', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ html: '<p>' }))
    await expect(loadGrammarDocument('beginner-upper', 1, 1, '/')).rejects.toThrow('语法文件格式不对')

    vi.mocked(fetch).mockResolvedValue(new Response('', { status: 500 }))
    await expect(loadGrammarDocument('beginner-upper', 1, 1, '/')).rejects.toThrow('语法加载失败')
  })

  it('does not fetch an invalid lesson', async () => {
    await expect(loadGrammarDocument('../secret', 1, 1, '/')).rejects.toThrow('找不到这一课')
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('loadLessonDocument', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads a reading file and reports reading errors', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('', { status: 404 }))
    await expect(loadLessonDocument('reading', 'beginner-upper', 1, 1, '/')).resolves.toEqual(emptyGrammarDocument())
    expect(fetch).toHaveBeenCalledWith('/data/reading/beginner-upper/unit-01-lesson-01.json')

    vi.mocked(fetch).mockResolvedValue(new Response('', { status: 500 }))
    await expect(loadLessonDocument('reading', 'beginner-upper', 1, 1, '/')).rejects.toThrow('课文加载失败')
  })
})

describe('saveGrammarDocument', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('puts the document to the dev save endpoint', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ ok: true }))
    const document = emptyGrammarDocument()

    await saveGrammarDocument({ bookId: 'beginner-upper', unit: 1, lesson: 1, document })

    expect(fetch).toHaveBeenCalledWith(GRAMMAR_SAVE_PATH, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId: 'beginner-upper', unit: 1, lesson: 1, document }),
    })
  })

  it('rejects an invalid request before sending it', async () => {
    await expect(
      saveGrammarDocument({
        bookId: '../secret',
        unit: 1,
        lesson: 1,
        document: emptyGrammarDocument(),
      }),
    ).rejects.toThrow('语法保存失败')
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('saveLessonDocument', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('puts a reading document on the reading endpoint', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ ok: true }))
    const document = emptyGrammarDocument()

    await saveLessonDocument('reading', { bookId: 'beginner-upper', unit: 1, lesson: 1, document })

    expect(fetch).toHaveBeenCalledWith(READING_SAVE_PATH, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId: 'beginner-upper', unit: 1, lesson: 1, document }),
    })
  })
})
