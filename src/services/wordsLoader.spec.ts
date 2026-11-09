import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadAllWords } from './wordsLoader'
import type { WordsManifest, Word } from '@/types/word'

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
    const lesson1: Omit<Word, 'courseId'>[] = [
      { index: 1, cn: '学生', jp: 'がくせい', jp_kanji: '学生', part_of_speech: '名词', lesson: 1 },
    ]
    const lesson2: Omit<Word, 'courseId'>[] = [
      { index: 2, cn: '车', jp: 'くるま', jp_kanji: '車', part_of_speech: '名词', lesson: 2 },
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
    expect(result.words).toHaveLength(2)
    expect(result.words[0].courseId).toBe('n5')
    expect(result.words[1].cn).toBe('车')
    expect(result.manifest.courses[0].id).toBe('n5')
  })
})
