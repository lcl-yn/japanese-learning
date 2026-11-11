import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadAllWords } from './wordsLoader'
import type { WordsManifest } from '@/types/word'

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
          id: 'beginner-upper',
          name: '初级上册',
          level: 'beginner',
          volume: 'upper',
          units: [
            {
              id: 201,
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
          id: 'beginner-lower',
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

    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith('manifest.json')) {
        return { ok: true, json: async () => manifest }
      }
      if (url.endsWith('lesson-01.json')) {
        return { ok: true, json: async () => lesson1 }
      }
      if (url.endsWith('lesson-02.json')) {
        return { ok: true, json: async () => lesson2 }
      }
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
    expect(result.manifest.books[0].id).toBe('beginner-upper')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
