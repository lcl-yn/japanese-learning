import { describe, expect, it } from 'vitest'
import {
  emptyGrammarDocument,
  grammarHasText,
  grammarRelativePath,
  lessonRelativePath,
  lessonSavePath,
  isGrammarDocument,
  isGrammarLocation,
  parseGrammarSaveBody,
} from './grammarDocument'

describe('isGrammarLocation', () => {
  it('accepts a book id and lesson numbers', () => {
    expect(isGrammarLocation('beginner-upper', 1, 2)).toBe(true)
  })

  it('rejects paths and out-of-range lesson numbers', () => {
    expect(isGrammarLocation('../secret', 1, 1)).toBe(false)
    expect(isGrammarLocation('beginner-upper/lesson', 1, 1)).toBe(false)
    expect(isGrammarLocation('Beginner', 1, 1)).toBe(false)
    expect(isGrammarLocation('beginner-upper', 0, 1)).toBe(false)
    expect(isGrammarLocation('beginner-upper', 1.5, 1)).toBe(false)
    expect(isGrammarLocation('beginner-upper', 1, 1000)).toBe(false)
  })
})

describe('grammarRelativePath', () => {
  it('pads the unit and lesson', () => {
    expect(grammarRelativePath('beginner-upper', 1, 2)).toBe(
      'data/grammar/beginner-upper/unit-01-lesson-02.json',
    )
  })
})

describe('lessonRelativePath', () => {
  it('puts a reading file in its own folder', () => {
    expect(lessonRelativePath('reading', 'beginner-upper', 1, 2)).toBe(
      'data/reading/beginner-upper/unit-01-lesson-02.json',
    )
    expect(lessonSavePath('reading')).toBe('/__reading')
  })
})

describe('grammarHasText', () => {
  it('ignores an empty paragraph and whitespace', () => {
    expect(grammarHasText(emptyGrammarDocument())).toBe(false)
    expect(
      grammarHasText({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: '  ' }] }],
      }),
    ).toBe(false)
  })

  it('sees text inside marks', () => {
    expect(
      grammarHasText({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'あります', marks: [{ type: 'bold' }] }],
          },
        ],
      }),
    ).toBe(true)
  })

  it('treats a lesson audio block as content', () => {
    expect(
      grammarHasText({
        type: 'doc',
        content: [{ type: 'lessonAudio', attrs: { src: '/data/audio/beginner-upper/第4课基本课文.m4a' } }],
      }),
    ).toBe(true)
  })
})

describe('parseGrammarSaveBody', () => {
  const document = {
    type: 'doc' as const,
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: '花があります',
            marks: [{ type: 'textStyle', attrs: { color: '#9f3d2f', fontSize: '16px' } }],
          },
        ],
      },
    ],
  }

  it('keeps a lesson document', () => {
    expect(parseGrammarSaveBody({ bookId: 'beginner-upper', unit: 1, lesson: 1, document })).toEqual({
      bookId: 'beginner-upper',
      unit: 1,
      lesson: 1,
      document,
    })
    expect(isGrammarDocument(document)).toBe(true)
  })

  it('keeps a table column width list', () => {
    expect(
      isGrammarDocument({
        type: 'doc',
        content: [
          {
            type: 'tableCell',
            attrs: { colspan: 1, rowspan: 1, colwidth: [120, 80], align: null },
            content: [{ type: 'paragraph' }],
          },
        ],
      }),
    ).toBe(true)
  })

  it('rejects an attribute list that is not numbers', () => {
    expect(
      isGrammarDocument({
        type: 'doc',
        content: [{ type: 'paragraph', attrs: { colwidth: ['wide'] } }],
      }),
    ).toBe(false)
  })

  it('rejects a document that is not a grammar tree', () => {
    expect(parseGrammarSaveBody({ bookId: 'beginner-upper', unit: 1, lesson: 1, document: { html: '<p>' } })).toBe(
      null,
    )
    expect(
      isGrammarDocument({
        type: 'doc',
        content: [{ type: 'paragraph', attrs: { style: { color: 'red' } } }],
      }),
    ).toBe(false)
  })

  it('keeps a local lesson audio node', () => {
    expect(
      isGrammarDocument({
        type: 'doc',
        content: [{ type: 'lessonAudio', attrs: { src: '/data/audio/beginner-upper/第4课基本课文.m4a' } }],
      }),
    ).toBe(true)
  })

  it('rejects audio paths that leave the audio folder', () => {
    expect(
      isGrammarDocument({
        type: 'doc',
        content: [{ type: 'lessonAudio', attrs: { src: '/data/audio/../secret.m4a' } }],
      }),
    ).toBe(false)
    expect(
      isGrammarDocument({
        type: 'doc',
        content: [{ type: 'lessonAudio', attrs: { src: 'https://example.com/a.m4a' } }],
      }),
    ).toBe(false)
    expect(
      isGrammarDocument({
        type: 'doc',
        content: [{ type: 'lessonAudio', attrs: { src: '/data/audio/第4课基本课文.m4a' } }],
      }),
    ).toBe(false)
    expect(
      isGrammarDocument({
        type: 'doc',
        content: [{ type: 'lessonAudio', attrs: { src: '/data/audio/beginner-upper/extra/第1课.m4a' } }],
      }),
    ).toBe(false)
  })
})
