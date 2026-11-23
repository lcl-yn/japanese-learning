import { describe, expect, it } from 'vitest'
import { buildKanaChoices, parseMorae } from './kanaConfusion'

function fixedRandom(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

describe('parseMorae', () => {
  it('counts youon and plain kana as different mora lengths', () => {
    expect(parseMorae('きゅ').map((mora) => mora.text)).toEqual(['きゅ'])
    expect(parseMorae('きゆ').map((mora) => mora.text)).toEqual(['き', 'ゆ'])
    expect(parseMorae('きゅう').map((mora) => mora.text)).toEqual(['きゅ', 'う'])
    expect(parseMorae('きゆう').map((mora) => mora.text)).toEqual(['き', 'ゆ', 'う'])
  })
})

describe('buildKanaChoices', () => {
  it('builds four kana with one correct reading and three different confusers', () => {
    const options = buildKanaChoices('きゅ', fixedRandom(1))
    expect(options).toHaveLength(4)
    expect(options.filter((option) => option.correct).map((option) => option.kana)).toEqual(['きゅ'])
    expect(new Set(options.map((option) => option.kana)).size).toBe(4)
    const wrong = options.filter((option) => !option.correct)
    expect(wrong.every((option) => option.score >= 0.3 && option.score <= 1)).toBe(true)
    expect(new Set(wrong.map((option) => option.rule)).size).toBeGreaterThanOrEqual(2)
    expect(wrong.map((option) => option.kana)).toEqual(expect.arrayContaining(['きゅう']))
  })

  it('keeps katakana when the reading is katakana', () => {
    const options = buildKanaChoices('キシャ', fixedRandom(2))
    expect(options.every((option) => /^[ァ-ンー]+$/.test(option.kana))).toBe(true)
    expect(options.some((option) => option.correct && option.kana === 'キシャ')).toBe(true)
  })

  it('repeats the same choices for the same random sequence', () => {
    const first = buildKanaChoices('がくせい', fixedRandom(7)).map((option) => option.kana)
    const second = buildKanaChoices('がくせい', fixedRandom(7)).map((option) => option.kana)
    expect(second).toEqual(first)
  })

  it('returns nothing when the reading has no kana', () => {
    expect(buildKanaChoices('学生')).toEqual([])
    expect(buildKanaChoices('   ')).toEqual([])
  })
})
