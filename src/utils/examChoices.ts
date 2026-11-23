export interface ExamChoice {
  text: string
  correct: boolean
}

/**
 * 手写去空白后是否与假名相同。
 * 相同时看手写选假名没有区分，改成选中文。
 *
 * @param jp 假名
 * @param jpWrite 日语手写
 * @return 两者去空白后相同且不为空时为 true
 */
export function writingMatchesKana(jp: string, jpWrite: string): boolean {
  const kana = jp.trim()
  const write = jpWrite.trim()
  return kana.length > 0 && write === kana
}

/**
 * 配一道看日语选中文。一个正确释义，三个错误释义从整本词库随机抽。
 * 错误项互相不同，也不与正确答案相同。凑不齐三个时返回 null。
 *
 * @param answer 这一词的中文
 * @param glossary 整本词库里的中文
 * @param random 0 到 1 的随机数，测试时传入固定序列
 * @return 四个选项；词库不够时为空
 */
export function buildChineseChoices(
  answer: string,
  glossary: string[],
  random: () => number = Math.random,
): ExamChoice[] | null {
  const correct = answer.trim()
  if (!correct) return null

  const seen = new Set<string>([correct])
  const pool: string[] = []
  for (const item of glossary) {
    const text = item.trim()
    if (!text || seen.has(text)) continue
    seen.add(text)
    pool.push(text)
  }
  if (pool.length < 3) return null

  const wrong = shuffle(pool, random).slice(0, 3)
  return shuffle(
    [{ text: correct, correct: true }, ...wrong.map((text) => ({ text, correct: false }))],
    random,
  )
}

/** 打乱顺序，不改原来的数组。 */
function shuffle<T>(items: T[], random: () => number): T[] {
  const next = items.slice()
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapAt = Math.floor(random() * (index + 1))
    const current = next[index]
    next[index] = next[swapAt]
    next[swapAt] = current
  }
  return next
}
