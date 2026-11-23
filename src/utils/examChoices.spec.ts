import { describe, expect, it } from 'vitest'
import { buildChineseChoices, writingMatchesKana } from './examChoices'

function fixedRandom(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

describe('writingMatchesKana', () => {
  it('matches only when the writing and the kana are the same text', () => {
    expect(writingMatchesKana('はい', 'はい')).toBe(true)
    expect(writingMatchesKana('がくせい', '学生')).toBe(false)
    expect(writingMatchesKana('はい', '')).toBe(false)
  })
})

describe('buildChineseChoices', () => {
  const glossary = ['学生', '老师', '大学', '是,好', '学生', '椅子']

  it('returns one correct gloss and three different wrong glosses from the lexicon', () => {
    const options = buildChineseChoices('学生', glossary, fixedRandom(4))
    expect(options).toHaveLength(4)
    expect(options?.filter((option) => option.correct).map((option) => option.text)).toEqual(['学生'])
    const wrong = options?.filter((option) => !option.correct).map((option) => option.text) ?? []
    expect(new Set(wrong).size).toBe(3)
    expect(wrong).not.toContain('学生')
    expect(wrong.every((text) => glossary.includes(text))).toBe(true)
  })

  it('repeats the same options for the same random sequence', () => {
    const first = buildChineseChoices('学生', glossary, fixedRandom(4))?.map((option) => option.text)
    const second = buildChineseChoices('学生', glossary, fixedRandom(4))?.map((option) => option.text)
    expect(first).toEqual(second)
  })

  it('returns nothing when the lexicon cannot supply three other glosses', () => {
    expect(buildChineseChoices('学生', ['学生', '老师'])).toBeNull()
    expect(buildChineseChoices('  ', glossary)).toBeNull()
  })
})
