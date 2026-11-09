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

  it('reads manifest, fetches lessons in parallel, injects courseId', async () => {
    const manifest: WordsManifest = {
      courses: [
        {
          id: 'n5',
          name: 'N5 基础',
          lessons: [
            { id: 1, name: '第一课', file: 'course-n5/lesson-01.json' },
            { id: 2, name: '第二课', file: 'course-n5/lesson-02.json' },
          ],
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
        lesson: 1,
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
        courseId: 'n5',
      },
      {
        cn: '车',
        jp: 'くるま',
        jp_write: '車',
        describe: '交通工具',
        part_of_speech: '名词',
        lesson: 2,
        courseId: 'n5',
      },
    ])
    expect(result.manifest.courses[0].id).toBe('n5')
  })
})
