import { defineStore } from 'pinia'
import { loadAllWords } from '@/services/wordsLoader'
import {
  emptyAnswer,
  emptyResult,
  judgeCn2Jp,
  judgeJp2Cn,
  type PracticeAnswer,
  type PracticeResult,
} from '@/utils/answerCheck'
import { selectRandomWordsWithWeights, wordKey } from '@/utils/weightedRandom'
import type { Word, WordsManifest } from '@/types/word'

const ERROR_STORAGE_KEY = 'wordErrorCounts'

export const useWordsStore = defineStore('words', {
  state: () => ({
    manifest: { courses: [] } as WordsManifest,
    allWords: [] as Word[],
    loading: false,
    error: '' as string,
    loaded: false,
    currentCourseId: 'all' as string,
    currentLessonId: 0,
    errorCounts: {} as Record<string, number>,
    mode: 'cn2jp' as 'cn2jp' | 'jp2cn',
    currentWords: [] as Word[],
    userAnswers: [] as PracticeAnswer[],
    answerResults: [] as PracticeResult[],
    answersChecked: false,
    correctCount: 0,
  }),
  getters: {
    lessonOptions(state) {
      const options: { courseId: string; lessonId: number; label: string }[] = [
        { courseId: 'all', lessonId: 0, label: '全部' },
      ]
      for (const course of state.manifest.courses) {
        for (const lesson of course.lessons) {
          options.push({
            courseId: course.id,
            lessonId: lesson.id,
            label: `${course.name} · ${lesson.name}`,
          })
        }
      }
      return options
    },
    filteredWords(state): Word[] {
      return state.allWords.filter((w) => {
        const courseOk = state.currentCourseId === 'all' || w.courseId === state.currentCourseId
        const lessonOk = state.currentLessonId === 0 || w.lesson === state.currentLessonId
        return courseOk && lessonOk
      })
    },
    answerTotal(state): number {
      const count = state.currentWords.length
      return state.mode === 'cn2jp' ? count * 2 : count
    },
    wordPairs(state) {
      const pairs: Array<{
        word1?: Word
        index1?: number
        word2?: Word
        index2?: number
      }> = []
      for (let i = 0; i < state.currentWords.length; i += 2) {
        const pair: (typeof pairs)[number] = {
          word1: state.currentWords[i],
          index1: i,
        }
        if (i + 1 < state.currentWords.length) {
          pair.word2 = state.currentWords[i + 1]
          pair.index2 = i + 1
        }
        pairs.push(pair)
      }
      return pairs
    },
  },
  actions: {
    async loadWords() {
      if (this.loaded || this.loading) return
      this.loading = true
      this.error = ''
      try {
        const { manifest, words } = await loadAllWords()
        this.manifest = manifest
        this.allWords = words
        const stored = localStorage.getItem(ERROR_STORAGE_KEY)
        if (stored) {
          this.errorCounts = JSON.parse(stored)
        } else {
          const counts: Record<string, number> = {}
          for (const word of words) counts[wordKey(word)] = 0
          this.errorCounts = counts
          localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(counts))
        }
        this.loaded = true
        this.startTest(16)
      } catch (e) {
        this.error = e instanceof Error ? e.message : String(e)
      } finally {
        this.loading = false
      }
    },
    getWeight(word: Word) {
      return 1 + (this.errorCounts[wordKey(word)] || 0)
    },
    incrementError(word: Word) {
      const key = wordKey(word)
      this.errorCounts[key] = (this.errorCounts[key] || 0) + 1
      localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(this.errorCounts))
    },
    setLesson(courseId: string, lessonId: number) {
      this.currentCourseId = courseId
      this.currentLessonId = lessonId
      this.startTest(16)
    },
    setMode(mode: 'cn2jp' | 'jp2cn') {
      this.mode = mode
      this.startTest(16)
    },
    startTest(count = 16) {
      this.currentWords = selectRandomWordsWithWeights(count, this.filteredWords, (w) =>
        this.getWeight(w),
      )
      this.userAnswers = this.currentWords.map(() => emptyAnswer())
      this.answerResults = this.currentWords.map(() => emptyResult())
      this.answersChecked = false
      this.correctCount = 0
    },
    checkAnswers() {
      if (this.answersChecked) return
      this.correctCount = 0
      for (let i = 0; i < this.currentWords.length; i++) {
        const word = this.currentWords[i]
        const answer = this.userAnswers[i] ?? emptyAnswer()
        if (this.mode === 'cn2jp') {
          const verdict = judgeCn2Jp(word, answer.kana, answer.write)
          this.answerResults[i] = { ...verdict, cn: false }
          if (verdict.kana) this.correctCount++
          if (verdict.write) this.correctCount++
          if (!verdict.kana || !verdict.write) this.incrementError(word)
          continue
        }
        const cnOk = judgeJp2Cn(word, answer.cn)
        this.answerResults[i] = { kana: false, write: false, cn: cnOk }
        if (cnOk) this.correctCount++
        else this.incrementError(word)
      }
      this.answersChecked = true
    },
  },
})
