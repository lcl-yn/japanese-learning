import { describe, expect, it } from 'vitest'
import { japanesePrompt, visibleDescribe } from './wordDisplay'

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

describe('japanesePrompt', () => {
  it('shows handwriting with kana when they differ', () => {
    expect(japanesePrompt('だいがくせい', '大学生')).toBe('大学生(だいがくせい)')
  })

  it('shows only kana when handwriting matches kana or is blank', () => {
    expect(japanesePrompt('はい', 'はい')).toBe('はい')
    expect(japanesePrompt('  はい  ', ' はい ')).toBe('はい')
    expect(japanesePrompt('がくせい', '')).toBe('がくせい')
    expect(japanesePrompt('がくせい', '   ')).toBe('がくせい')
    expect(japanesePrompt('がくせい', null)).toBe('がくせい')
    expect(japanesePrompt('がくせい', undefined)).toBe('がくせい')
  })
})
