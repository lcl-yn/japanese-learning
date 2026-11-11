import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Word, WordsManifest } from '@/types/word'
import { emptyAnswer } from '@/utils/answerCheck'
import { wordKey } from '@/utils/weightedRandom'

vi.mock('@/services/wordsLoader', () => ({
  loadAllWords: vi.fn(),
}))

import { loadAllWords } from '@/services/wordsLoader'
import { useWordsStore } from './words'

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

const words: Word[] = [
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
    cn: '老师',
    jp: 'せんせい',
    jp_write: '先生',
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
]

describe('useWordsStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.mocked(loadAllWords).mockResolvedValue({ manifest, words })
  })

  it('keeps only lesson 1 after setScope(beginner-upper, 1, 1)', async () => {
    const store = useWordsStore()
    await store.loadWords()

    store.setScope('beginner-upper', 1, 1)

    expect(store.filteredWords.length).toBeGreaterThan(0)
    expect(store.filteredWords.every((word) => word.lesson === 1 && word.unit === 1)).toBe(true)
    expect(store.filteredWords.some((word) => word.lesson === 2)).toBe(false)
  })

  it('keeps every lesson in the unit when the lesson is not narrowed', async () => {
    const store = useWordsStore()
    await store.loadWords()

    store.setScope('beginner-upper', 1, 0)

    expect(store.filteredWords).toHaveLength(words.length)
  })

  it('lists lessons inside the selected unit', async () => {
    const store = useWordsStore()
    await store.loadWords()

    store.setScope('beginner-upper', 1, 0)

    expect(store.lessonOptions.map((option) => option.label)).toEqual(['本单元全部', '第1课', '第2课'])
  })

  it('selects two words when startTest(2)', async () => {
    const store = useWordsStore()
    await store.loadWords()

    store.startTest(2)

    expect(store.currentWords).toHaveLength(2)
  })

  it('increments errorCounts and writes wordErrorCounts for wrong answers', async () => {
    const store = useWordsStore()
    await store.loadWords()
    store.startTest(2)
    store.userAnswers = store.currentWords.map(() => ({ ...emptyAnswer(), kana: 'wrong', write: 'wrong' }))

    store.checkAnswers()

    const stored = JSON.parse(localStorage.getItem('wordErrorCounts') ?? '{}') as Record<
      string,
      number
    >
    for (const word of store.currentWords) {
      const key = wordKey(word)
      expect(store.errorCounts[key]).toBe(1)
      expect(stored[key]).toBe(1)
    }
    expect(store.correctCount).toBe(0)
    expect(store.answerTotal).toBe(4)
  })

  it('counts a blank handwriting cell as correct when jp equals jp_write and kana matches', async () => {
    const store = useWordsStore()
    await store.loadWords()
    const word: Word = {
      cn: '是',
      jp: 'はい',
      jp_write: 'はい',
      describe: '',
      part_of_speech: '感叹词',
      lesson: 1,
      unit: 1,
      bookId: 'beginner-upper',
    }
    store.currentWords = [word]
    store.userAnswers = [{ ...emptyAnswer(), kana: 'はい' }]

    store.checkAnswers()

    expect(store.answerResults[0]).toEqual({ kana: true, write: true, cn: false })
    expect(store.correctCount).toBe(2)
    expect(store.errorCounts[wordKey(word)] ?? 0).toBe(0)
  })

  it('counts one Chinese cell in jp2cn mode', async () => {
    const store = useWordsStore()
    await store.loadWords()
    store.setMode('jp2cn')
    store.currentWords = [words[0]]
    store.userAnswers = [{ ...emptyAnswer(), cn: '学生' }]
    store.answersChecked = false

    store.checkAnswers()

    expect(store.answerResults[0].cn).toBe(true)
    expect(store.correctCount).toBe(1)
    expect(store.answerTotal).toBe(1)
  })
})
