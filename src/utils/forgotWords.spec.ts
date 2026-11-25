import { describe, expect, it } from 'vitest'
import type { Word } from '@/types/word'
import {
  FORGOT_WORDS_KEY,
  boardWordKey,
  forgotWordsInOrder,
  readForgotKeys,
  toggleForgotKey,
  writeForgotKeys,
} from './forgotWords'

function word(partial: Partial<Word> & Pick<Word, 'cn' | 'jp'>): Word {
  return {
    jp_write: partial.jp_write ?? partial.cn,
    describe: '',
    part_of_speech: '',
    scale: '',
    bookId: 'beginner-upper',
    unit: 1,
    lesson: 1,
    fileIndex: 0,
    ...partial,
  }
}

describe('toggleForgotKey', () => {
  it('点一次记入，再点一次移出，新词排在最后', () => {
    const first = toggleForgotKey([], 'a')
    const both = toggleForgotKey(first, 'b')
    expect(both).toEqual(['a', 'b'])
    expect(toggleForgotKey(both, 'a')).toEqual(['b'])
  })
})

describe('forgotWordsInOrder', () => {
  it('按记下的顺序取词，词库里没有的跳过', () => {
    const kept = word({ cn: '大学', jp: 'だいがく', fileIndex: 1 })
    const later = word({ cn: '先生', jp: 'せんせい', fileIndex: 2 })
    const keys = [boardWordKey(later), 'missing', boardWordKey(kept), boardWordKey(later)]
    expect(forgotWordsInOrder(keys, [kept, later])).toEqual([later, kept])
  })
})

describe('readForgotKeys', () => {
  it('空的、坏掉的记录都当成还没有', () => {
    localStorage.removeItem(FORGOT_WORDS_KEY)
    expect(readForgotKeys()).toEqual([])
    localStorage.setItem(FORGOT_WORDS_KEY, '{')
    expect(readForgotKeys()).toEqual([])
    localStorage.setItem(FORGOT_WORDS_KEY, '{"a":1}')
    expect(readForgotKeys()).toEqual([])
  })

  it('写进去的键下次还能读出来', () => {
    writeForgotKeys(['a', 'b'])
    expect(readForgotKeys()).toEqual(['a', 'b'])
    expect(localStorage.getItem(FORGOT_WORDS_KEY)).toBe('["a","b"]')
  })
})
