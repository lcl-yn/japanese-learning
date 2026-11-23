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
import type { ScopeOption, Word, WordsManifest } from '@/types/word'
import { wordPages } from '@/utils/unitPages'

const ERROR_STORAGE_KEY = 'wordErrorCounts'

export const useWordsStore = defineStore('words', {
  state: () => ({
    manifest: { books: [] } as WordsManifest,
    allWords: [] as Word[],
    loading: false,
    error: '' as string,
    loaded: false,
    currentBookId: 'all' as string,
    currentUnitId: 0,
    currentLessonId: 0,
    drawnBookId: '',
    drawnUnitId: 0,
    drawnLessonId: 0,
    /** 单词本考试用的词。为空时练习仍按记下的册、单元和课抽。 */
    examPool: null as Word[] | null,
    errorCounts: {} as Record<string, number>,
    mode: 'cn2jp' as 'cn2jp' | 'jp2cn',
    currentWords: [] as Word[],
    userAnswers: [] as PracticeAnswer[],
    answerResults: [] as PracticeResult[],
    answersChecked: false,
    correctCount: 0,
  }),
  getters: {
    lessonOptions(state): ScopeOption[] {
      const book = state.manifest.books.find((item) => item.code === state.currentBookId)
      const unit = book?.units.find((item) => item.unit === state.currentUnitId)
      if (!book || !unit) {
        return [{ bookId: 'all', unitId: 0, lessonId: 0, label: '全部' }]
      }
      const options: ScopeOption[] = [
        { bookId: book.code, unitId: unit.unit, lessonId: 0, label: '本单元全部' },
      ]
      for (const lesson of unit.lessons) {
        options.push({
          bookId: book.code,
          unitId: unit.unit,
          lessonId: lesson.lesson,
          label: lesson.name,
        })
      }
      for (const page of wordPages(unit)) {
        options.push({
          bookId: book.code,
          unitId: unit.unit,
          lessonId: page.lesson,
          label: page.name,
        })
      }
      return options
    },
    filteredWords(state): Word[] {
      return state.allWords.filter((w) => {
        const bookOk = state.currentBookId === 'all' || w.bookId === state.currentBookId
        const unitOk = state.currentUnitId === 0 || w.unit === state.currentUnitId
        const lessonOk = state.currentLessonId === 0 || w.lesson === state.currentLessonId
        return bookOk && unitOk && lessonOk
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
    /**
     * 把刚保存的词放进内存词库。不改筛选，也不重抽已经抽出的题。
     *
     * @param word 带册、单元、课号的新词
     */
    appendWord(word: Word) {
      const fileIndex = this.allWords.filter(
        (item) => item.bookId === word.bookId && item.unit === word.unit && item.lesson === word.lesson,
      ).length
      this.allWords.push({ ...word, scale: word.scale ?? '', fileIndex })
    },
    /**
     * 用保存后的字段换掉内存里的这一条。已抽出的题仍指向原来的对象。
     *
     * @param target 表格里点中的那条词
     * @param fields 去过空白的五个字段
     */
    replaceWord(target: Word, fields: Pick<Word, 'cn' | 'jp' | 'jp_write' | 'describe' | 'part_of_speech'>) {
      const index = this.allWords.indexOf(target)
      if (index < 0) return
      this.allWords.splice(index, 1, {
        ...target,
        ...fields,
        scale: target.jp === fields.jp ? target.scale : '',
      })
    },
    getWeight(word: Word) {
      return 1 + (this.errorCounts[wordKey(word)] || 0)
    },
    incrementError(word: Word) {
      const key = wordKey(word)
      this.errorCounts[key] = (this.errorCounts[key] || 0) + 1
      localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(this.errorCounts))
    },
    /**
     * 清掉全部错题次数。当前这套题不变，下次抽词按相同机会抽取。
     */
    clearErrorCounts() {
      this.errorCounts = {}
      localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(this.errorCounts))
    },
    /**
     * 记下当前册、单元和课。
     *
     * @param bookId 书籍编号，全部时为 all
     * @param unitId 单元号，0 表示不缩到某一单元
     * @param lessonId 课号，0 表示这一单元的全部课
     * @param restart 为真时按这个范围重新抽题
     */
    setScope(bookId: string, unitId: number, lessonId: number, restart = true) {
      this.currentBookId = bookId
      this.currentUnitId = unitId
      this.currentLessonId = lessonId
      if (restart) {
        this.examPool = null
        this.startTest(16)
      }
    },
    /**
     * 用单词本当前列出的词开考，不改练习记下的册、单元和课。
     *
     * @param words 这次要抽的词
     */
    startExam(words: Word[]) {
      this.examPool = words
      this.startTest(16)
    },
    /**
     * 结束单词本考试。记下的册、单元和课保持不变。
     */
    endExam() {
      this.examPool = null
    },
    /**
     * 按路由同步当前册、单元和课。
     * 课文和语法只改范围，不重新抽题。打开单词时，抽出的题若不是这一课，按这一课重新抽。
     *
     * @param bookId 书籍编号
     * @param unitId 单元号
     * @param lessonId 课号，0 表示这一单元的全部课
     * @param section 路由段落，只有 practice 会重新抽题
     */
    applyRouteScope(bookId: string, unitId: number, lessonId: number, section: string) {
      const scopeUnchanged =
        this.currentBookId === bookId &&
        this.currentUnitId === unitId &&
        this.currentLessonId === lessonId
      const drawnMatches =
        this.drawnBookId === bookId && this.drawnUnitId === unitId && this.drawnLessonId === lessonId
      if (scopeUnchanged && (section !== 'practice' || drawnMatches)) return
      this.setScope(bookId, unitId, lessonId, section === 'practice')
    },
    setMode(mode: 'cn2jp' | 'jp2cn') {
      this.mode = mode
      this.startTest(16)
    },
    startTest(count = 16) {
      const source = this.examPool ?? this.filteredWords
      this.currentWords = selectRandomWordsWithWeights(count, source, (w) => this.getWeight(w))
      this.userAnswers = this.currentWords.map(() => emptyAnswer())
      this.answerResults = this.currentWords.map(() => emptyResult())
      this.answersChecked = false
      this.correctCount = 0
      if (this.examPool) {
        this.drawnBookId = ''
        this.drawnUnitId = -1
        this.drawnLessonId = -1
        return
      }
      this.drawnBookId = this.currentBookId
      this.drawnUnitId = this.currentUnitId
      this.drawnLessonId = this.currentLessonId
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
