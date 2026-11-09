import { describe, expect, it } from 'vitest'
import { judgeCn2Jp, judgeJp2Cn } from './answerCheck'

const different = { jp: 'がくせい', jp_write: '学生' }
const same = { jp: 'はい', jp_write: 'はい' }

describe('judgeCn2Jp', () => {
  it('checks kana against jp and handwriting against jp_write', () => {
    expect(judgeCn2Jp(different, 'がくせい', '学生')).toEqual({ kana: true, write: true })
    expect(judgeCn2Jp(different, 'がくせい', '車')).toEqual({ kana: true, write: false })
    expect(judgeCn2Jp(different, 'せんせい', '学生')).toEqual({ kana: false, write: true })
  })

  it('accepts a blank handwriting cell when jp equals jp_write and kana is correct', () => {
    expect(judgeCn2Jp(same, 'はい', '')).toEqual({ kana: true, write: true })
    expect(judgeCn2Jp(same, 'はい', '   ')).toEqual({ kana: true, write: true })
  })

  it('still rejects a blank handwriting cell when kana is wrong or the fields differ', () => {
    expect(judgeCn2Jp(same, 'いいえ', '')).toEqual({ kana: false, write: false })
    expect(judgeCn2Jp(same, 'はい', '学生')).toEqual({ kana: true, write: false })
    expect(judgeCn2Jp(different, 'がくせい', '')).toEqual({ kana: true, write: false })
  })
})

describe('judgeJp2Cn', () => {
  it('checks the Chinese answer', () => {
    expect(judgeJp2Cn({ cn: '学生' }, '学生')).toBe(true)
    expect(judgeJp2Cn({ cn: '学生' }, '老师')).toBe(false)
  })
})
