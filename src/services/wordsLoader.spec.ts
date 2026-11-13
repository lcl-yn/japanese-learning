import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadAllWords } from './wordsLoader'
import type { WordsManifest } from '@/types/word'

/** 测试里的 fetch 入参可能是字符串、URL 或 Request，统一成地址再分支。 */
function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

describe('loadAllWords', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads manifest, fetches lessons in parallel, injects book, unit and lesson', async () => {
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
                { id: 101, lesson: 1, name: '第1课', file: 'beginner-upper/lesson-01.json' },
                { id: 102, lesson: 2, name: '第2课', file: 'beginner-upper/lesson-02.json' },
              ],
            },
          ],
        },
        {
          code: 'beginner-lower',
          name: '初级下册',
          level: 'beginner',
          volume: 'lower',
          units: [],
        },
      ],
    }
    const lesson1 = [
      {
        index: 9,
        cn: '学生',
        jp: 'がくせい',
        jp_write: '学生',
        describe: null,
        part_of_speech: '名词',
        lesson: 99,
      },
    ]
    const lesson2 = [
      {
        cn: '车',
        jp: 'くるま',
        jp_write: '車',
        describe: '交通工具',
        part_of_speech: '名词',
        lesson: 2,
      },
    ]

    const fetchMock = vi.mocked(fetch)
    fetchMock.mockImplementation(async (input) => {
      const url = requestUrl(input)
      if (url.endsWith('manifest.json')) return Response.json(manifest)
      if (url.endsWith('lesson-01.json')) return Response.json(lesson1)
      if (url.endsWith('lesson-02.json')) return Response.json(lesson2)
      throw new Error(`unexpected url ${url}`)
    })

    const result = await loadAllWords('/data/words')
    expect(result.words).toEqual([
      {
        cn: '学生',
        jp: 'がくせい',
        jp_write: '学生',
        describe: '',
        part_of_speech: '名词',
        lesson: 1,
        unit: 1,
        bookId: 'beginner-upper',
      },
      {
        cn: '车',
        jp: 'くるま',
        jp_write: '車',
        describe: '交通工具',
        part_of_speech: '名词',
        lesson: 2,
        unit: 1,
        bookId: 'beginner-upper',
      },
    ])
    expect(result.manifest.books[0].code).toBe('beginner-upper')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('skips a lesson when its file is missing or the dev server returns the page', async () => {
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
                { id: 4, lesson: 4, name: '第4课', file: 'beginner-upper/lesson-04.json' },
              ],
            },
          ],
        },
      ],
    }
    const lesson1 = [{ cn: '学生', jp: 'がくせい', jp_write: '学生', describe: '', part_of_speech: '名词' }]

    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = requestUrl(input)
      if (url.endsWith('manifest.json')) return Response.json(manifest)
      if (url.endsWith('lesson-01.json')) return Response.json(lesson1)
      if (url.endsWith('lesson-04.json')) {
        return new Response('<!doctype html>', { status: 200, headers: { 'content-type': 'text/html' } })
      }
      throw new Error(`unexpected url ${url}`)
    })

    const missingPage = await loadAllWords('/data/words')
    expect(missingPage.words).toEqual([
      {
        cn: '学生',
        jp: 'がくせい',
        jp_write: '学生',
        describe: '',
        part_of_speech: '名词',
        lesson: 1,
        unit: 1,
        bookId: 'beginner-upper',
      },
    ])
    expect(missingPage.manifest.books[0].units[0].lessons).toHaveLength(2)

    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = requestUrl(input)
      if (url.endsWith('manifest.json')) return Response.json(manifest)
      if (url.endsWith('lesson-01.json')) return Response.json(lesson1)
      return new Response('', { status: 404 })
    })

    await expect(loadAllWords('/data/words')).resolves.toEqual(missingPage)
  })
})
