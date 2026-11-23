import { describe, expect, it } from 'vitest'
import { drawExamItem, type ExamRound } from './examQueue'

function fixedRandom(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

function drawAll(pool: string[], random: () => number) {
  const seen: string[] = []
  let round: ExamRound = { pending: [], lastKey: '' }
  for (let index = 0; index < pool.length; index += 1) {
    const drawn = drawExamItem(pool, round, (item) => item, (item) => item, random)
    if (!drawn.item) break
    seen.push(drawn.item)
    round = drawn.round
  }
  return { seen, round }
}

describe('drawExamItem', () => {
  it('uses every word once before any word appears again', () => {
    const { seen } = drawAll(['あ', 'い', 'う', 'え'], fixedRandom(3))
    expect(new Set(seen).size).toBe(4)
    expect(seen).toHaveLength(4)
  })

  it('does not start the next round with the word that just appeared', () => {
    const random = fixedRandom(9)
    const first = drawAll(['あ', 'い', 'う'], random)
    const next = drawExamItem(['あ', 'い', 'う'], first.round, (item) => item, (item) => item, random)
    expect(next.restarted).toBe(true)
    expect(next.item).not.toBe(first.round.lastKey)
    const after = drawExamItem(['あ', 'い', 'う'], next.round, (item) => item, (item) => item, random)
    expect(after.restarted).toBe(false)
  })

  it('skips a word that cannot be made into a question', () => {
    const drawn = drawExamItem(
      ['あ', 'い'],
      { pending: [], lastKey: '' },
      (item) => item,
      (item) => (item === 'あ' ? null : item),
      fixedRandom(1),
    )
    expect(drawn.item).toBe('い')
  })

  it('drops words that left the current range', () => {
    const drawn = drawExamItem(
      ['い'],
      { pending: ['あ', 'い'], lastKey: '' },
      (item) => item,
      (item) => item,
      fixedRandom(1),
    )
    expect(drawn.item).toBe('い')
    expect(drawn.round.pending).not.toContain('あ')
  })

  it('returns nothing when the range is empty', () => {
    const drawn = drawExamItem([], { pending: [], lastKey: '' }, (item: string) => item, (item) => item)
    expect(drawn.item).toBeNull()
  })
})
