import type { GrammarDocument, GrammarSaveRequest } from '@/types/grammar'
import {
  emptyGrammarDocument,
  isGrammarDocument,
  isGrammarLocation,
  lessonRelativePath,
  lessonSavePath,
  parseGrammarSaveBody,
  type LessonSection,
} from '@/utils/grammarDocument'

const SECTION_ERROR: Record<LessonSection, { load: string; format: string; save: string }> = {
  grammar: { load: '语法加载失败', format: '语法文件格式不对', save: '语法保存失败' },
  reading: { load: '课文加载失败', format: '课文文件格式不对', save: '课文保存失败' },
}

/**
 * 读取一课的课文或语法。
 * 文件不存在时返回空文档，页面据此显示还没有内容。
 * 开发服务器对缺少的静态文件会回退成页面 HTML，这种情况同样视为没有这一课。
 *
 * @param section 课文或语法
 * @param bookId 册 id
 * @param unit 单元号
 * @param lesson 课号
 * @param baseUrl 站点公共前缀，测试时传入
 * @return 该课的文档
 */
export async function loadLessonDocument(
  section: LessonSection,
  bookId: string,
  unit: number,
  lesson: number,
  baseUrl = import.meta.env.BASE_URL,
): Promise<GrammarDocument> {
  const error = SECTION_ERROR[section]
  if (!isGrammarLocation(bookId, unit, lesson)) {
    throw new Error('找不到这一课')
  }
  const prefix = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const res = await fetch(`${prefix}${lessonRelativePath(section, bookId, unit, lesson)}`)
  if (res.status === 404) return emptyGrammarDocument()
  if (!res.ok) throw new Error(error.load)
  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return emptyGrammarDocument()
  let raw: unknown
  try {
    raw = (await res.json()) as unknown
  } catch {
    throw new Error(error.format)
  }
  if (!isGrammarDocument(raw)) throw new Error(error.format)
  return raw
}

/**
 * 读取一课的语法文档。
 *
 * @param bookId 册 id
 * @param unit 单元号
 * @param lesson 课号
 * @param baseUrl 站点公共前缀，测试时传入
 * @return 该课的语法文档
 */
export function loadGrammarDocument(
  bookId: string,
  unit: number,
  lesson: number,
  baseUrl = import.meta.env.BASE_URL,
): Promise<GrammarDocument> {
  return loadLessonDocument('grammar', bookId, unit, lesson, baseUrl)
}

/**
 * 把当前文档交给开发服务器，写回该课的 JSON 文件。
 *
 * @param section 课文或语法
 * @param request 册、课和文档
 */
export async function saveLessonDocument(section: LessonSection, request: GrammarSaveRequest): Promise<void> {
  const parsed = parseGrammarSaveBody(request)
  if (!parsed) throw new Error(SECTION_ERROR[section].save)
  const res = await fetch(lessonSavePath(section), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parsed),
  })
  if (!res.ok) throw new Error(SECTION_ERROR[section].save)
}

/**
 * 把当前语法交给开发服务器，写回该课的 JSON 文件。
 *
 * @param request 册、课和文档
 */
export function saveGrammarDocument(request: GrammarSaveRequest): Promise<void> {
  return saveLessonDocument('grammar', request)
}
