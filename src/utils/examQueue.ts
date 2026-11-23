/** 这一轮还没出的词，以及上一题的键。 */
export interface ExamRound {
  pending: string[]
  lastKey: string
}

/**
 * 从当前范围抽下一题。本轮还没出过的优先，全部出完才重新洗牌。
 * 多于一个词时，新一轮的第一题不紧挨着上一题。prepare 返回 null 的词跳过，不占下一题。
 *
 * @param pool 当前册、单元、课里可以出的词
 * @param round 这一轮还没出的键，以及上一题
 * @param keyOf 词的唯一键
 * @param prepare 生成这一题的内容；返回 null 表示这个词出不了题
 * @param random 0 到 1 的随机数，测试时传入固定序列
 * @return 抽中的词和准备好的内容；范围内没有能出的题时 item 为空。restarted 表示这一轮已出完、刚重新洗牌
 */
export function drawExamItem<T, R>(
  pool: T[],
  round: ExamRound,
  keyOf: (item: T) => string,
  prepare: (item: T) => R | null,
  random: () => number = Math.random,
): { item: T | null; prepared: R | null; round: ExamRound; restarted: boolean } {
  const byKey = new Map<string, T>()
  for (const item of pool) byKey.set(keyOf(item), item)

  let pending = round.pending.filter((key) => byKey.has(key))
  let reshuffled = false
  let restarted = false

  while (true) {
    if (pending.length === 0) {
      if (reshuffled || byKey.size === 0) {
        return { item: null, prepared: null, round: { pending: [], lastKey: round.lastKey }, restarted }
      }
      reshuffled = true
      restarted = true
      pending = shuffle([...byKey.keys()], random)
      if (pending.length > 1 && pending[0] === round.lastKey) {
        const swapAt = 1 + Math.floor(random() * (pending.length - 1))
        const first = pending[0]
        pending[0] = pending[swapAt]
        pending[swapAt] = first
      }
    }

    const key = pending.shift()
    const item = key ? byKey.get(key) : undefined
    if (!key || !item) continue
    const prepared = prepare(item)
    if (prepared === null) continue
    return { item, prepared, round: { pending, lastKey: key }, restarted }
  }
}

/** 打乱键的顺序。 */
function shuffle(keys: string[], random: () => number): string[] {
  const next = keys.slice()
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapAt = Math.floor(random() * (index + 1))
    const current = next[index]
    next[index] = next[swapAt]
    next[swapAt] = current
  }
  return next
}
