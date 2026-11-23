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
          pages: [
            { id: 'scenes', name: '单元末-实用场景对话' },
            { id: 'spring', name: '单元末-词语之泉', lesson: 101, file: 'beginner-upper/unit-01-spring.json' },
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

const words: Word[] = [
  {
    cn: '学生',
    jp: 'がくせい',
    jp_write: '学生',
    describe: '',
    part_of_speech: '名词',
    scale: '⓪',
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
    scale: '③',
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
    scale: '⓪',
    lesson: 2,
    unit: 1,
    bookId: 'beginner-upper',
  },
  {
    cn: '玄关',
    jp: 'げんかん',
    jp_write: '玄関',
    describe: '',
    part_of_speech: '名',
    scale: '①',
    lesson: 101,
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

    expect(store.lessonOptions.map((option) => option.label)).toEqual([
      '本单元全部',
      '第1课',
      '第2课',
      '单元末-词语之泉',
    ])
  })

  it('keeps the unit word page when that lesson is selected', async () => {
    const store = useWordsStore()
    await store.loadWords()

    store.setScope('beginner-upper', 1, 101)

    expect(store.filteredWords.map((word) => word.cn)).toEqual(['玄关'])
  })

  it('redraws the new lesson when practice opens after another lesson only changed the scope', async () => {
    const store = useWordsStore()
    await store.loadWords()

    store.applyRouteScope('beginner-upper', 1, 1, 'practice')
    expect(store.currentWords.every((word) => word.lesson === 1)).toBe(true)
    const lesson1Deck = store.currentWords.map((word) => word.cn)

    store.applyRouteScope('beginner-upper', 1, 2, 'reading')
    expect(store.currentLessonId).toBe(2)
    expect(store.currentWords.map((word) => word.cn)).toEqual(lesson1Deck)

    store.applyRouteScope('beginner-upper', 1, 2, 'practice')
    expect(store.currentWords.length).toBeGreaterThan(0)
    expect(store.currentWords.every((word) => word.lesson === 2)).toBe(true)
  })

  it('drops the previous lesson when practice opens on a lesson with no words', async () => {
    const store = useWordsStore()
    await store.loadWords()

    store.applyRouteScope('beginner-upper', 1, 1, 'practice')
    store.applyRouteScope('beginner-upper', 1, 4, 'reading')
    store.applyRouteScope('beginner-upper', 1, 4, 'practice')

    expect(store.currentWords).toEqual([])
  })

  it('keeps practice answers when leaving and returning to the same lesson', async () => {
    const store = useWordsStore()
    await store.loadWords()

    store.applyRouteScope('beginner-upper', 1, 1, 'practice')
    store.userAnswers[0].kana = 'がくせい'

    store.applyRouteScope('beginner-upper', 1, 1, 'reading')
    store.applyRouteScope('beginner-upper', 1, 1, 'practice')

    expect(store.userAnswers[0].kana).toBe('がくせい')
    expect(store.currentWords.every((word) => word.lesson === 1)).toBe(true)
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

  it('clears error counts in memory and localStorage', async () => {
    const store = useWordsStore()
    await store.loadWords()
    store.startTest(2)
    store.userAnswers = store.currentWords.map(() => ({ ...emptyAnswer(), kana: 'wrong', write: 'wrong' }))
    store.checkAnswers()

    store.clearErrorCounts()

    expect(store.errorCounts).toEqual({})
    expect(JSON.parse(localStorage.getItem('wordErrorCounts') ?? '{}')).toEqual({})
    expect(store.getWeight(store.currentWords[0])).toBe(1)
  })

  it('draws the word-book list without changing the remembered lesson', async () => {
    const store = useWordsStore()
    await store.loadWords()
    store.setScope('beginner-upper', 1, 1)
    const pool = store.allWords.filter((word) => word.lesson === 2)

    store.startExam(pool)
    store.setMode('jp2cn')

    expect(store.currentBookId).toBe('beginner-upper')
    expect(store.currentUnitId).toBe(1)
    expect(store.currentLessonId).toBe(1)
    expect(store.currentWords.length).toBeGreaterThan(0)
    expect(store.currentWords.every((word) => word.lesson === 2)).toBe(true)

    store.applyRouteScope('beginner-upper', 1, 1, 'practice')

    expect(store.examPool).toBeNull()
    expect(store.currentWords.every((word) => word.lesson === 1)).toBe(true)
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
      scale: '①',
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
