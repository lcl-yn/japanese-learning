import { describe, it, expect } from 'vitest'
import { selectRandomWordsWithWeights, wordKey } from './weightedRandom'
import type { Word } from '@/types/word'

const w = (cn: string, jp: string, lesson = 1): Word => ({
  cn,
  jp,
  jp_write: cn,
  describe: '',
  part_of_speech: '名词',
  lesson,
  unit: 1,
  bookId: 'beginner-upper',
})

describe('wordKey', () => {
  it('joins cn and jp', () => {
    expect(wordKey(w('车', 'くるま'))).toBe('车-くるま')
  })
})

describe('selectRandomWordsWithWeights', () => {
  it('returns at most count words and never duplicates', () => {
    const list = [w('a', 'あ'), w('b', 'い'), w('c', 'う')]
    const picked = selectRandomWordsWithWeights(2, list, () => 1)
    expect(picked).toHaveLength(2)
    const keys = new Set(picked.map(wordKey))
    expect(keys.size).toBe(2)
  })

  it('returns all when count exceeds length', () => {
    const list = [w('a', 'あ'), w('b', 'い')]
    expect(selectRandomWordsWithWeights(10, list, () => 1)).toHaveLength(2)
  })
})
