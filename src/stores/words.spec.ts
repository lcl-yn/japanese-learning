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

const words: Word[] = [
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
    cn: '老师',
    jp: 'せんせい',
    jp_write: '先生',
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
]

describe('useWordsStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.mocked(loadAllWords).mockResolvedValue({ manifest, words })
  })

  it('keeps only lesson 1 after setLesson(n5, 1)', async () => {
    const store = useWordsStore()
    await store.loadWords()

    store.setLesson('n5', 1)

    expect(store.filteredWords.length).toBeGreaterThan(0)
    expect(store.filteredWords.every((word) => word.lesson === 1)).toBe(true)
    expect(store.filteredWords.some((word) => word.lesson === 2)).toBe(false)
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
      courseId: 'n5',
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
