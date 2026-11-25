import type { Word } from '@/types/word'

/** 手机单词本背错题本。关掉遮住答案也不清。 */
export const FORGOT_WORDS_KEY = 'wordBoardForgot'

/**
 * 一条词在背错题本里的键。册、单元、课和下标一起区分同形词。
 *
 * @param word 词条
 * @return 写入本机的键
 */
export function boardWordKey(
  word: Pick<Word, 'bookId' | 'unit' | 'lesson' | 'fileIndex' | 'jp' | 'cn'>,
): string {
  return `${word.bookId}:${word.unit}:${word.lesson}:${word.fileIndex ?? ''}:${word.jp}:${word.cn}`
}

/**
 * 读本机记下的背错词。损坏或读不到时当作还没有。
 *
 * @return 按记下顺序排列的键
 */
export function readForgotKeys(): string[] {
  try {
    const raw = localStorage.getItem(FORGOT_WORDS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0)
  } catch {
    return []
  }
}

/**
 * 把背错词写回本机。
 *
 * @param keys 按记下顺序排列的键
 */
export function writeForgotKeys(keys: readonly string[]): void {
  localStorage.setItem(FORGOT_WORDS_KEY, JSON.stringify(keys))
}

/**
 * 点一次记入，再点一次移出。已在名单里的词再点就删掉，新词排在最后。
 *
 * @param keys 当前名单
 * @param key 这一条词的键
 * @return 点过之后的名单
 */
export function toggleForgotKey(keys: readonly string[], key: string): string[] {
  if (keys.includes(key)) return keys.filter((item) => item !== key)
  return [...keys, key]
}

/**
 * 按记下的顺序从词库取出还在的词。词库里已经没有的键跳过。
 *
 * @param keys 记下的键
 * @param lexicon 当前词库
 * @return 还能对上的词
 */
export function forgotWordsInOrder(keys: readonly string[], lexicon: readonly Word[]): Word[] {
  const byKey = new Map(lexicon.map((word) => [boardWordKey(word), word]))
  const seen = new Set<string>()
  const found: Word[] = []
  for (const key of keys) {
    if (seen.has(key)) continue
    seen.add(key)
    const word = byKey.get(key)
    if (word) found.push(word)
  }
  return found
}
