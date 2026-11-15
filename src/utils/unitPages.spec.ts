import { describe, expect, it } from 'vitest'
import { isWordPage, wordPages } from './unitPages'
import type { UnitMeta } from '@/types/word'

describe('isWordPage', () => {
  it('accepts a word list on a unit page', () => {
    expect(isWordPage({ id: 'spring', name: '单元末-词语之泉', lesson: 101, file: 'beginner-upper/unit-01-spring.json' })).toBe(
      true,
    )
  })

  it('rejects a reading page and a path that leaves the folder', () => {
    expect(isWordPage({ id: 'scenes', name: '单元末-实用场景对话' })).toBe(false)
    expect(isWordPage({ id: 'spring', name: '单元末-词语之泉', lesson: 101, file: '../secret.json' })).toBe(false)
  })
})

describe('wordPages', () => {
  it('keeps only pages that carry a word list', () => {
    const unit: UnitMeta = {
      unit: 1,
      name: '第1单元',
      lessons: [],
      pages: [
        { id: 'scenes', name: '单元末-实用场景对话' },
        { id: 'spring', name: '单元末-词语之泉', lesson: 101, file: 'beginner-upper/unit-01-spring.json' },
      ],
    }
    expect(wordPages(unit).map((page) => page.id)).toEqual(['spring'])
    expect(wordPages(undefined)).toEqual([])
  })
})
