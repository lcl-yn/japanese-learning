import { describe, expect, it } from 'vitest'
import { grammarOutline } from './grammarOutline'
import type { GrammarDocument } from '@/types/grammar'

function doc(content: GrammarDocument['content']): GrammarDocument {
  return { type: 'doc', content }
}

function heading(level: number, text: string) {
  return {
    type: 'heading',
    attrs: { level },
    content: [{ type: 'text', text }],
  }
}

describe('grammarOutline', () => {
  it('nests lower headings under the nearest higher one', () => {
    const outline = grammarOutline(
      doc([
        heading(1, '语法1'),
        heading(2, '动词选择'),
        heading(3, 'あります'),
        heading(4, '否定'),
        heading(2, 'います'),
        heading(1, '语法2'),
      ]),
    )

    expect(outline.map((item) => item.text)).toEqual(['语法1', '语法2'])
    expect(outline[0].children.map((item) => item.text)).toEqual(['动词选择', 'います'])
    expect(outline[0].children[0].children[0].children[0].text).toBe('否定')
    expect(outline[0].children[0].children[0].level).toBe(3)
  })

  it('hangs a skipped level under the previous higher heading', () => {
    const outline = grammarOutline(doc([heading(1, '语法1'), heading(3, '例句')]))
    expect(outline[0].children[0]).toMatchObject({ text: '例句', level: 3 })
  })

  it('skips blank headings but keeps their place in the index', () => {
    const outline = grammarOutline(
      doc([
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '  ' }] },
        heading(2, '动词选择'),
      ]),
    )
    expect(outline).toEqual([{ index: 1, level: 2, text: '动词选择', children: [] }])
  })

  it('ignores body text', () => {
    expect(
      grammarOutline(doc([{ type: 'paragraph', content: [{ type: 'text', text: 'あります' }] }])),
    ).toEqual([])
  })
})
