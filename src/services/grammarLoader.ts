import type { GrammarDocument, GrammarSaveRequest } from '@/types/grammar'
import {
  GRAMMAR_SAVE_PATH,
  emptyGrammarDocument,
  grammarRelativePath,
  isGrammarDocument,
  isGrammarLocation,
  parseGrammarSaveBody,
} from '@/utils/grammarDocument'

/**
 * 读取一课的语法文档。
 * 文件不存在时返回空文档，页面据此显示「这一课还没有语法」。
 * 开发服务器对缺少的静态文件会回退成页面 HTML，这种情况同样视为没有这一课。
 *
 * @param bookId 册 id
 * @param unit 单元号
 * @param lesson 课号
 * @param baseUrl 站点公共前缀，测试时传入
 * @return 该课的语法文档
 */
export async function loadGrammarDocument(
  bookId: string,
  unit: number,
  lesson: number,
  baseUrl = import.meta.env.BASE_URL,
): Promise<GrammarDocument> {
  if (!isGrammarLocation(bookId, unit, lesson)) {
    throw new Error('找不到这一课')
  }
  const prefix = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const res = await fetch(`${prefix}${grammarRelativePath(bookId, unit, lesson)}`)
  if (res.status === 404) return emptyGrammarDocument()
  if (!res.ok) throw new Error('语法加载失败')
  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return emptyGrammarDocument()
  let raw: unknown
  try {
    raw = (await res.json()) as unknown
  } catch {
    throw new Error('语法文件格式不对')
  }
  if (!isGrammarDocument(raw)) throw new Error('语法文件格式不对')
  return raw
}

/**
 * 把当前文档交给开发服务器，写回该课的 JSON 文件。
 *
 * @param request 册、课和文档
 */
export async function saveGrammarDocument(request: GrammarSaveRequest): Promise<void> {
  const parsed = parseGrammarSaveBody(request)
  if (!parsed) throw new Error('语法保存失败')
  const res = await fetch(GRAMMAR_SAVE_PATH, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parsed),
  })
  if (!res.ok) throw new Error('语法保存失败')
}
