/** 量词页随机测试的题型。五种生成互不调用。 */
export type QuestionType = 'integer' | 'fraction' | 'decimal' | 'time' | 'age'

export type NumberQuestion = {
  type: QuestionType
  /** 卡片上给学习者看的题目 */
  display: string
  /** 全部正确读音，顺序即卡片上的顺序 */
  readings: string[]
}

const INTEGER_MAX = 99_999_999
const ONES = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう']
const TENS = ['', 'じゅう', 'にじゅう', 'さんじゅう', 'よんじゅう', 'ごじゅう', 'ろくじゅう', 'ななじゅう', 'はちじゅう', 'きゅうじゅう']
const HUNDREDS = ['', 'ひゃく', 'にひゃく', 'さんびゃく', 'よんひゃく', 'ごひゃく', 'ろっぴゃく', 'ななひゃく', 'はっぴゃく', 'きゅうひゃく']
const THOUSANDS = ['', '', 'にせん', 'さんぜん', 'よんせん', 'ごせん', 'ろくせん', 'ななせん', 'はっせん', 'きゅうせん']
const DIGITS = ['れい', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう']
const HOURS = ['', 'いちじ', 'にじ', 'さんじ', 'よじ', 'ごじ', 'ろくじ', 'しちじ', 'はちじ', 'くじ', 'じゅうじ', 'じゅういちじ', 'じゅうにじ']

/**
 * 闭区间内的随机整数。生成函数里的随机都从这里来。
 *
 * @param min 下界，包含
 * @param max 上界，包含
 * @return min 到 max 之间的整数
 */
export function randomInt(min: number, max: number): number {
  if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
    throw new Error('随机整数的范围无效')
  }
  return min + Math.floor(Math.random() * (max - min + 1))
}

/**
 * 整数的一条假名。0 读れい；4、7、9 读よん、なな、きゅう。
 *
 * @param value 0 到 99999999 的整数
 * @return 不带空格的假名
 */
export function readInteger(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value > INTEGER_MAX) {
    throw new Error('整数超出可读范围')
  }
  if (value === 0) return 'れい'
  const man = Math.floor(value / 10000)
  const low = value % 10000
  const manKana = readGroup(man, 'いっせん')
  return (manKana ? `${manKana}まん` : '') + readGroup(low, 'せん')
}

/**
 * 四位一级的读音。正好是 1000 时，千位用传入的那一条。
 *
 * @param group 0 到 9999
 * @param bareThousand 这一级正好为 1000 时的千位读音
 * @return 这一级的假名；0 为空字符串
 */
function readGroup(group: number, bareThousand: 'せん' | 'いっせん'): string {
  if (group === 0) return ''
  const thousands = Math.floor(group / 1000)
  const hundreds = Math.floor(group / 100) % 10
  const tens = Math.floor(group / 10) % 10
  const ones = group % 10
  const thousandKana = thousands === 0 ? '' : thousands === 1 ? (group === 1000 ? bareThousand : 'せん') : THOUSANDS[thousands]
  return thousandKana + HUNDREDS[hundreds] + TENS[tens] + ONES[ones]
}

/**
 * 整数读音紧挨「てん」时，末尾的いち、はち收成促音。
 *
 * @param kana 整数假名
 * @return 接在てん前面的假名
 */
function beforeTen(kana: string): string {
  if (kana.endsWith('いち')) return `${kana.slice(0, -2)}いっ`
  if (kana.endsWith('はち')) return `${kana.slice(0, -2)}はっ`
  return kana
}

/**
 * 把千分整数写成去掉末尾 0 的小数，并逐位读出小数部分。
 *
 * @param milli 1 到 999999 的千分个数，且不是 1000 的倍数
 * @return 卡片文字和一条假名
 */
export function readDecimal(milli: number): { display: string; reading: string } {
  if (!Number.isInteger(milli) || milli < 1 || milli > 999_999 || milli % 1000 === 0) {
    throw new Error('小数超出可读范围')
  }
  const whole = Math.floor(milli / 1000)
  const fraction = String(milli % 1000)
    .padStart(3, '0')
    .replace(/0+$/, '')
  const display = `${whole}.${fraction}`
  const digits = [...fraction].map((digit) => DIGITS[Number(digit)]).join('')
  return { display, reading: `${beforeTen(readInteger(whole))}てん${digits}` }
}

/**
 * 分数读音：分母、ぶんの、分子。
 *
 * @param numerator 分子
 * @param denominator 分母
 * @return 一条假名
 */
export function readFraction(numerator: number, denominator: number): string {
  return `${readInteger(denominator)}ぶんの${readInteger(numerator)}`
}

/**
 * 12 小时制时间。30 分给两条：完整读法和把分换成はん。
 *
 * @param hour 1 到 12
 * @param minute 0 到 59
 * @param period am 为上午，pm 为下午
 * @return 一条或两条假名
 */
export function readTime(hour: number, minute: number, period: 'am' | 'pm'): string[] {
  if (!Number.isInteger(hour) || hour < 1 || hour > 12 || !Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new Error('时间超出可读范围')
  }
  const head = `${period === 'am' ? 'ごぜん' : 'ごご'} ${HOURS[hour]}`
  if (minute === 0) return [head]
  const full = `${head} ${readMinute(minute)}`
  if (minute === 30) return [full, `${head} はん`]
  return [full]
}

/**
 * 1 到 59 分的假名，含促音和 ふん / ぷん。
 *
 * @param minute 1 到 59
 * @return 分的假名
 */
function readMinute(minute: number): string {
  const base = readInteger(minute)
  const ones = minute % 10
  if (ones === 1) return `${base.replace(/いち$/, 'いっ')}ぷん`
  if (ones === 6) return `${base.replace(/ろく$/, 'ろっ')}ぷん`
  if (ones === 8) return `${base.replace(/はち$/, 'はっ')}ぷん`
  if (ones === 0) return `${base.replace(/じゅう$/, 'じゅっ')}ぷん`
  if (ones === 3 || ones === 4) return `${base}ぷん`
  return `${base}ふん`
}

/**
 * 0 到 100 岁。20 岁只读はたち；个位是 8 时先「はち」再「はっ」。
 *
 * @param years 岁数
 * @return 一条或两条假名
 */
export function readAge(years: number): string[] {
  if (!Number.isInteger(years) || years < 0 || years > 100) {
    throw new Error('年龄超出可读范围')
  }
  if (years === 0) return ['れいさい']
  if (years === 20) return ['はたち']
  if (years === 100) return ['ひゃくさい']
  const base = readInteger(years)
  if (years % 10 === 0) return [`${base.replace(/じゅう$/, 'じゅっ')}さい`]
  if (years % 10 === 1) return [`${base.replace(/いち$/, 'いっ')}さい`]
  if (years % 10 === 8) return [`${base}さい`, `${base.replace(/はち$/, 'はっ')}さい`]
  return [`${base}さい`]
}

/**
 * 按题型出一道题。未知题型直接失败。
 *
 * @param type 数字、分数、小数、时间或年龄
 * @return 题目和全部正确读音
 */
export function generateQuestion(type: QuestionType): NumberQuestion {
  switch (type) {
    case 'integer':
      return generateInteger()
    case 'fraction':
      return generateFraction()
    case 'decimal':
      return generateDecimal()
    case 'time':
      return generateTime()
    case 'age':
      return generateAge()
    default: {
      const unknown: never = type
      throw new Error(`未知题型: ${String(unknown)}`)
    }
  }
}

/**
 * 凑一批题目。已经出现过的题目文字会重抽，超过次数仍相同就保留。
 *
 * @param count 需要的张数
 * @param next 下一题
 * @param redrawLimit 同一题最多重抽次数
 * @return 这一批题目
 */
export function collectQuestions(
  count: number,
  next: () => NumberQuestion,
  redrawLimit = 20,
): NumberQuestion[] {
  const batch: NumberQuestion[] = []
  while (batch.length < count) {
    let question = next()
    let tries = 0
    while (batch.some((item) => item.display === question.display) && tries < redrawLimit) {
      question = next()
      tries += 1
    }
    batch.push(question)
  }
  return batch
}

/**
 * 整数题卡片上的写法。从右往左每三位加一个逗号，读音不读这个逗号。
 *
 * @param value 0 到 99999999 的整数
 * @return 带千分位的数字
 */
export function formatIntegerDisplay(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** 数字题分段抽取，避免大数占满一整批。 */
function generateInteger(): NumberQuestion {
  const roll = randomInt(1, 100)
  const value =
    roll <= 40 ? randomInt(0, 99) : roll <= 65 ? randomInt(100, 999) : roll <= 85 ? randomInt(1000, 9999) : randomInt(10000, INTEGER_MAX)
  return { type: 'integer', display: formatIntegerDisplay(value), readings: [readInteger(value)] }
}

/** 分子和分母各自抽取，分子不小于分母时整对重抽。 */
function generateFraction(): NumberQuestion {
  let numerator = randomInt(1, 1000)
  let denominator = randomInt(1, 1000)
  while (numerator >= denominator) {
    numerator = randomInt(1, 1000)
    denominator = randomInt(1, 1000)
  }
  return {
    type: 'fraction',
    display: `${numerator}/${denominator}`,
    readings: [readFraction(numerator, denominator)],
  }
}

/** 用千分整数生成小数，小数部分为 0 时重抽。 */
function generateDecimal(): NumberQuestion {
  let fraction = 0
  let whole = 0
  do {
    whole = randomInt(0, 999)
    fraction = randomInt(0, 999)
  } while (fraction === 0)
  const decimal = readDecimal(whole * 1000 + fraction)
  return { type: 'decimal', display: decimal.display, readings: [decimal.reading] }
}

/** 时、分和上午下午分开抽取。 */
function generateTime(): NumberQuestion {
  const hour = randomInt(1, 12)
  const minute = randomInt(0, 59)
  const period = randomInt(0, 1) === 0 ? 'am' : 'pm'
  const display = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`
  return { type: 'time', display, readings: readTime(hour, minute, period) }
}

/** 年龄在 0 到 100 岁之间均匀抽取。 */
function generateAge(): NumberQuestion {
  const years = randomInt(0, 100)
  return { type: 'age', display: `${years}歳`, readings: readAge(years) }
}
