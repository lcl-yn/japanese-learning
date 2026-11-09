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
