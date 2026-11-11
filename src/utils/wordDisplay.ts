/**
 * 看中文写日语时附在中文下面的说明。
 * 空字符串、纯空白和 null 都不展示。
 *
 * @param describe 词条上的 describe
 * @return 需要展示的说明；没有说明时为空字符串
 */
export function visibleDescribe(describe: string | null | undefined): string {
  if (typeof describe !== 'string') return ''
  return describe.trim()
}

/**
 * 看日语写中文时，日语列的展示文案。
 * 手写与假名不同时展示「手写(假名)」；手写为空或与假名相同时只展示假名。
 *
 * @param jp 日语假名
 * @param jpWrite 日语手写
 * @return 日语列应展示的文本
 */
export function japanesePrompt(jp: string, jpWrite: string | null | undefined): string {
  const kana = jp.trim()
  const write = typeof jpWrite === 'string' ? jpWrite.trim() : ''
  if (!write || write === kana) return kana
  return `${write}(${kana})`
}
