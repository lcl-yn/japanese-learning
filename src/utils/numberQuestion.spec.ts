import { describe, expect, it } from 'vitest'
import {
  collectQuestions,
  formatIntegerDisplay,
  generateQuestion,
  randomInt,
  readAge,
  readDecimal,
  readFraction,
  readInteger,
  readTime,
  splitReading,
  type NumberQuestion,
} from './numberQuestion'

describe('randomInt', () => {
  it('rejects an inverted range', () => {
    expect(() => randomInt(2, 1)).toThrow()
  })

  it('returns integers inside the inclusive range', () => {
    const seen = new Set<number>()
    for (let i = 0; i < 80; i += 1) seen.add(randomInt(1, 3))
    expect([...seen].every((value) => value === 1 || value === 2 || value === 3)).toBe(true)
    expect(seen.has(1)).toBe(true)
    expect(seen.has(3)).toBe(true)
  })
})

describe('readInteger', () => {
  it('reads the counter-page examples', () => {
    const cases: [number, string][] = [
      [0, 'れい'],
      [4, 'よん'],
      [7, 'なな'],
      [9, 'きゅう'],
      [10, 'じゅう'],
      [14, 'じゅうよん'],
      [100, 'ひゃく'],
      [101, 'ひゃくいち'],
      [300, 'さんびゃく'],
      [600, 'ろっぴゃく'],
      [800, 'はっぴゃく'],
      [1000, 'せん'],
      [3000, 'さんぜん'],
      [6000, 'ろくせん'],
      [8000, 'はっせん'],
      [9002, 'きゅうせんに'],
      [9020, 'きゅうせんにじゅう'],
      [9200, 'きゅうせんにひゃく'],
      [10000, 'いちまん'],
      [10001, 'いちまんいち'],
      [11000, 'いちまんせん'],
      [100000, 'じゅうまん'],
      [3000000, 'さんびゃくまん'],
      [6000000, 'ろっぴゃくまん'],
      [8000000, 'はっぴゃくまん'],
      [10000000, 'いっせんまん'],
      [10000001, 'いっせんまんいち'],
      [10010000, 'せんいちまん'],
      [11000000, 'せんひゃくまん'],
      [15000000, 'せんごひゃくまん'],
      [30000000, 'さんぜんまん'],
      [80000000, 'はっせんまん'],
    ]
    for (const [value, kana] of cases) {
      expect(readInteger(value), String(value)).toBe(kana)
    }
  })

  it('rejects values outside 0 to 99999999', () => {
    expect(() => readInteger(-1)).toThrow()
    expect(() => readInteger(100000000)).toThrow()
  })
})

describe('readDecimal', () => {
  it('strips trailing zeros and reads each remaining digit', () => {
    expect(readDecimal(1100)).toEqual({ display: '1.1', reading: 'いってんいち' })
    expect(readDecimal(1010)).toEqual({ display: '1.01', reading: 'いってんれいいち' })
    expect(readDecimal(10050)).toEqual({ display: '10.05', reading: 'じゅうてんれいご' })
    expect(readDecimal(1)).toEqual({ display: '0.001', reading: 'れいてんれいれいいち' })
    expect(readDecimal(100)).toEqual({ display: '0.1', reading: 'れいてんいち' })
    expect(readDecimal(300500)).toEqual({ display: '300.5', reading: 'さんびゃくてんご' })
    expect(readDecimal(8100)).toEqual({ display: '8.1', reading: 'はってんいち' })
    expect(readDecimal(11200)).toEqual({ display: '11.2', reading: 'じゅういってんに' })
    expect(readDecimal(999999)).toEqual({
      display: '999.999',
      reading: 'きゅうひゃくきゅうじゅうきゅうてんきゅうきゅうきゅう',
    })
  })
})

describe('readFraction', () => {
  it('reads the denominator before ぶんの', () => {
    expect(readFraction(2, 3)).toBe('さんぶんのに')
    expect(readFraction(1, 2)).toBe('にぶんのいち')
    expect(readFraction(2, 4)).toBe('よんぶんのに')
    expect(readFraction(1, 300)).toBe('さんびゃくぶんのいち')
    expect(readFraction(1, 800)).toBe('はっぴゃくぶんのいち')
    expect(readFraction(1, 1000)).toBe('せんぶんのいち')
    expect(readFraction(999, 1000)).toBe('せんぶんのきゅうひゃくきゅうじゅうきゅう')
  })
})

describe('readTime', () => {
  it('reads hours with the counter-page exceptions and spaces the parts', () => {
    expect(readTime(1, 24, 'am')).toEqual(['ごぜん いちじ にじゅうよんぷん'])
    expect(readTime(11, 50, 'pm')).toEqual(['ごご じゅういちじ ごじゅっぷん'])
    expect(readTime(4, 0, 'am')).toEqual(['ごぜん よじ'])
    expect(readTime(7, 1, 'pm')).toEqual(['ごご しちじ いっぷん'])
    expect(readTime(9, 6, 'am')).toEqual(['ごぜん くじ ろっぷん'])
    expect(readTime(12, 5, 'am')).toEqual(['ごぜん じゅうにじ ごふん'])
    expect(readTime(8, 3, 'pm')).toEqual(['ごご はちじ さんぷん'])
    expect(readTime(2, 18, 'am')).toEqual(['ごぜん にじ じゅうはっぷん'])
  })

  it('gives さんじゅっぷん and はん when the minute is 30', () => {
    expect(readTime(12, 30, 'pm')).toEqual(['ごご じゅうにじ さんじゅっぷん', 'ごご じゅうにじ はん'])
    expect(readTime(4, 30, 'am')).toEqual(['ごぜん よじ さんじゅっぷん', 'ごぜん よじ はん'])
  })
})

describe('readAge', () => {
  it('reads ages from 0 through 100, with two readings when the ones digit is 8', () => {
    expect(readAge(0)).toEqual(['れいさい'])
    expect(readAge(1)).toEqual(['いっさい'])
    expect(readAge(4)).toEqual(['よんさい'])
    expect(readAge(8)).toEqual(['はちさい', 'はっさい'])
    expect(readAge(10)).toEqual(['じゅっさい'])
    expect(readAge(18)).toEqual(['じゅうはちさい', 'じゅうはっさい'])
    expect(readAge(20)).toEqual(['はたち'])
    expect(readAge(21)).toEqual(['にじゅういっさい'])
    expect(readAge(24)).toEqual(['にじゅうよんさい'])
    expect(readAge(30)).toEqual(['さんじゅっさい'])
    expect(readAge(80)).toEqual(['はちじゅっさい'])
    expect(readAge(98)).toEqual(['きゅうじゅうはちさい', 'きゅうじゅうはっさい'])
    expect(readAge(100)).toEqual(['ひゃくさい'])
  })

  it('rejects ages outside 0 to 100', () => {
    expect(() => readAge(-1)).toThrow()
    expect(() => readAge(101)).toThrow()
  })
})

describe('formatIntegerDisplay', () => {
  it('groups digits by thousands and leaves the reading unchanged', () => {
    expect(formatIntegerDisplay(0)).toBe('0')
    expect(formatIntegerDisplay(999)).toBe('999')
    expect(formatIntegerDisplay(30000)).toBe('30,000')
    expect(formatIntegerDisplay(10000000)).toBe('10,000,000')
    expect(readInteger(30000)).toBe('さんまん')
  })
})

describe('generateQuestion', () => {
  it('rejects an unknown type', () => {
    expect(() => generateQuestion('length' as 'integer')).toThrow()
  })

  it('keeps each kind inside its range and aligned with the reading', () => {
    for (let i = 0; i < 200; i += 1) {
      const integer = generateQuestion('integer')
      const value = Number(integer.display.replaceAll(',', ''))
      expect(integer.display).toBe(formatIntegerDisplay(value))
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(99999999)
      expect(integer.readings).toEqual([readInteger(value)])

      const fraction = generateQuestion('fraction')
      const [numerator, denominator] = fraction.display.split('/').map(Number)
      expect(numerator).toBeGreaterThanOrEqual(1)
      expect(denominator).toBeLessThanOrEqual(1000)
      expect(numerator).toBeLessThan(denominator)
      expect(fraction.readings).toEqual([readFraction(numerator, denominator)])

      const decimal = generateQuestion('decimal')
      expect(decimal.display).toMatch(/^\d+\.\d+$/)
      expect(decimal.display.endsWith('0')).toBe(false)
      const milli = milliOf(decimal.display)
      expect(milli % 1000).not.toBe(0)
      expect(decimal.readings).toEqual([readDecimal(milli).reading])

      const time = generateQuestion('time')
      const matched = /^(\d{2}):(\d{2}) (am|pm)$/.exec(time.display)
      expect(matched).not.toBeNull()
      const hour = Number(matched?.[1])
      const minute = Number(matched?.[2])
      const period = matched?.[3] as 'am' | 'pm'
      expect(hour).toBeGreaterThanOrEqual(1)
      expect(hour).toBeLessThanOrEqual(12)
      expect(minute).toBeGreaterThanOrEqual(0)
      expect(minute).toBeLessThanOrEqual(59)
      expect(time.readings).toEqual(readTime(hour, minute, period))

      const age = generateQuestion('age')
      const years = Number(age.display.replace('歳', ''))
      expect(age.display).toBe(`${years}歳`)
      expect(years).toBeGreaterThanOrEqual(0)
      expect(years).toBeLessThanOrEqual(100)
      expect(age.readings).toEqual(readAge(years))
    }
  })
})

describe('collectQuestions', () => {
  it('redraws a display already in the batch', () => {
    let calls = 0
    const batch = collectQuestions(2, () => {
      calls += 1
      return calls < 3 ? question('1歳') : question('2歳')
    })
    expect(batch.map((item) => item.display)).toEqual(['1歳', '2歳'])
  })

  it('keeps a duplicate after the redraw limit', () => {
    const batch = collectQuestions(2, () => question('1歳'), 2)
    expect(batch.map((item) => item.display)).toEqual(['1歳', '1歳'])
  })
})

describe('splitReading', () => {
  it('keeps the original kana when the pieces are joined', () => {
    const readings = [
      'さんびゃく',
      'ろっぴゃく',
      'ごぜん よじ さんじゅっぷん',
      'はたち',
    ]
    for (const reading of readings) {
      expect(splitReading(reading).map((piece) => piece.text).join('')).toBe(reading)
    }
  })

  it('marks a whole changed counter, and leaves regular kana black', () => {
    const changed = (reading: string) =>
      splitReading(reading)
        .filter((piece) => piece.changed)
        .map((piece) => piece.text)
        .join('')
    expect(changed('ごひゃくじゅうなな')).toBe('')
    expect(changed('ひゃく')).toBe('')
    expect(changed('さんびゃく')).toBe('さんびゃく')
    expect(changed('ろっぴゃく')).toBe('ろっぴゃく')
    expect(changed('はっぴゃくろくじゅう')).toBe('はっぴゃく')
    expect(changed('きゅうせんひゃくろくじゅうまんにせんろっぴゃくよんじゅうきゅう')).toBe('ろっぴゃく')
    expect(changed('さんぜん')).toBe('さんぜん')
    expect(changed('ごぜん')).toBe('')
    expect(changed('はっせん')).toBe('はっせん')
    expect(changed('いっせんまん')).toBe('いっせん')
    expect(changed('いってんいち')).toBe('いっ')
    expect(changed('ごぜん いちじ')).toBe('')
    expect(changed('ごぜん よじ')).toBe('よじ')
    expect(changed('ろくじ')).toBe('')
    expect(changed('しちじ')).toBe('しちじ')
    expect(changed('ごぜん くじ')).toBe('くじ')
    expect(changed('にふん')).toBe('')
    expect(changed('さんぷん')).toBe('さんぷん')
    expect(changed('じゅういっぷん')).toBe('いっぷん')
    expect(changed('にじゅっぷん')).toBe('じゅっぷん')
    expect(changed('ごご じゅうにじ はん')).toBe('はん')
    expect(changed('はちさい')).toBe('')
    expect(changed('はっさい')).toBe('はっさい')
    expect(changed('じゅっさい')).toBe('じゅっさい')
    expect(changed('はたち')).toBe('はたち')
  })
})

function question(display: string): NumberQuestion {
  return { type: 'age', display, readings: ['いっさい'] }
}

/** 把去掉末尾 0 的小数还原成千分整数。 */
function milliOf(display: string): number {
  const [whole, frac] = display.split('.')
  return Number(whole) * 1000 + Number(frac.padEnd(3, '0'))
}
