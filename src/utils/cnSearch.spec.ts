import { describe, expect, it } from 'vitest'
import { matchesCnPrefix } from './cnSearch'

describe('matchesCnPrefix', () => {
  it('关键字为空时保留全部词', () => {
    expect(matchesCnPrefix('学生', '')).toBe(true)
    expect(matchesCnPrefix('学生', '  ')).toBe(true)
  })

  it('整条释义以前缀开头时命中', () => {
    expect(matchesCnPrefix('学生', '学')).toBe(true)
    expect(matchesCnPrefix('学生', '学生')).toBe(true)
    expect(matchesCnPrefix(' 茶 ', '茶')).toBe(true)
  })

  it('前缀不在开头时不命中', () => {
    expect(matchesCnPrefix('大学生', '学')).toBe(false)
    expect(matchesCnPrefix('留学生', '学')).toBe(false)
  })

  it('逗号、顿号、分号分开的每一义都按前缀匹配', () => {
    expect(matchesCnPrefix('是,好,知道了,对的', '好')).toBe(true)
    expect(matchesCnPrefix('是,好,知道了,对的', '知道')).toBe(true)
    expect(matchesCnPrefix('梦、理想', '理想')).toBe(true)
    expect(matchesCnPrefix('回来；回去', '回去')).toBe(true)
    expect(matchesCnPrefix('是,好,知道了,对的', '对的吗')).toBe(false)
  })
})
