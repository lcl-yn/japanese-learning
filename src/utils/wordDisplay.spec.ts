import { describe, expect, it } from 'vitest'
import { visibleDescribe } from './wordDisplay'

describe('visibleDescribe', () => {
  it('returns empty for blank or null describe', () => {
    expect(visibleDescribe('')).toBe('')
    expect(visibleDescribe('   ')).toBe('')
    expect(visibleDescribe(null)).toBe('')
    expect(visibleDescribe(undefined)).toBe('')
  })

  it('returns trimmed text when describe has content', () => {
    expect(visibleDescribe('  在校学习的人  ')).toBe('在校学习的人')
  })
})
