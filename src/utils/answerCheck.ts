import type { Word } from '@/types/word'

export interface PracticeAnswer {
  kana: string
  write: string
  cn: string
}

export interface PracticeResult {
  kana: boolean
  write: boolean
  cn: boolean
}

export function emptyAnswer(): PracticeAnswer {
  return { kana: '', write: '', cn: '' }
}

export function emptyResult(): PracticeResult {
  return { kana: false, write: false, cn: false }
}

/**
 * 判看中文写日语的两格。
 * 假名对 jp，手写对 jp_write。两者相同时，假名填对且手写留空，手写也算对。
 *
 * @param word 当前词
 * @param kanaInput 日语假名输入
 * @param writeInput 日语手写输入
 * @return 两格是否答对
 */
export function judgeCn2Jp(
  word: Pick<Word, 'jp' | 'jp_write'>,
  kanaInput: string,
  writeInput: string,
): Pick<PracticeResult, 'kana' | 'write'> {
  const kana = kanaInput.trim()
  const write = writeInput.trim()
  const expectedKana = word.jp.trim()
  const expectedWrite = word.jp_write.trim()
  const kanaOk = kana === expectedKana
  const sameTarget = expectedKana === expectedWrite
  const writeOk = write === expectedWrite || (sameTarget && kanaOk && write === '')
  return { kana: kanaOk, write: writeOk }
}

/**
 * 判看日语写中文。
 *
 * @param word 当前词
 * @param cnInput 中文输入
 * @return 中文是否答对
 */
export function judgeJp2Cn(word: Pick<Word, 'cn'>, cnInput: string): boolean {
  return cnInput.trim() === word.cn.trim()
}
