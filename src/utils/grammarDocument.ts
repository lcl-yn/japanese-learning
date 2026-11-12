export type GrammarAttr = string | number | boolean | null | number[]

export interface GrammarMark {
  type: string
  attrs?: Record<string, GrammarAttr>
}

export interface GrammarDocumentNode {
  type: string
  text?: string
  attrs?: Record<string, GrammarAttr>
  marks?: GrammarMark[]
  content?: GrammarDocumentNode[]
}

export interface GrammarDocument {
  type: 'doc'
  content: GrammarDocumentNode[]
}

export interface GrammarSaveRequest {
  bookId: string
  unit: number
  lesson: number
  document: GrammarDocument
}

/** 开发服务器保存语法的地址。打包后的页面没有这个接口。 */
export const GRAMMAR_SAVE_PATH = '/__grammar'

const BOOK_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const NODE_TYPE = /^[a-zA-Z][a-zA-Z0-9]*$/
const MAX_BOOK_ID_LENGTH = 64
const MAX_LESSON_NUMBER = 999
const MAX_NODES = 5000
const MAX_DEPTH = 30
const MAX_ATTRS = 20
const MAX_ATTR_KEY = 40
const MAX_ATTR_LIST = 20

/**
 * 判断这一课能不能对应到语法文件。
 * 书籍 id 只允许小写字母、数字和连字符，单元和课号是 1 到 999 的整数。
 *
 * @param bookId 册 id
 * @param unit 单元号
 * @param lesson 课号
 * @return 可以读写这一课的语法文件时为 true
 */
export function isGrammarLocation(bookId: unknown, unit: unknown, lesson: unknown): boolean {
  return isBookId(bookId) && isLessonNumber(unit) && isLessonNumber(lesson)
}

/**
 * 一课一份语法文件的相对路径，相对于 public。
 * 调用前先用 isGrammarLocation 确认参数。
 *
 * @param bookId 册 id
 * @param unit 单元号
 * @param lesson 课号
 * @return 如 data/grammar/beginner-upper/unit-01-lesson-01.json
 */
export function grammarRelativePath(bookId: string, unit: number, lesson: number): string {
  const unitText = String(unit).padStart(2, '0')
  const lessonText = String(lesson).padStart(2, '0')
  return `data/grammar/${bookId}/unit-${unitText}-lesson-${lessonText}.json`
}

/**
 * 还没有写过的一课，用空文档占位。
 *
 * @return 只有一个空段落的文档
 */
export function emptyGrammarDocument(): GrammarDocument {
  return { type: 'doc', content: [{ type: 'paragraph' }] }
}

/**
 * 文档里是否已经有可见文字。
 * 只有空段落或空白时，页面显示「这一课还没有语法」。
 *
 * @param document 语法文档
 * @return 有非空白文字时为 true
 */
export function grammarHasText(document: GrammarDocument): boolean {
  return nodeHasText(document)
}

/**
 * 确认未知 JSON 是语法文档。
 * 开发服务器写文件前、页面读文件后都走这里，避免把任意 JSON 写进项目或交给编辑器。
 *
 * @param value 待确认的值
 * @return 符合文档结构时收窄为 GrammarDocument
 */
export function isGrammarDocument(value: unknown): value is GrammarDocument {
  if (!isRecord(value) || value.type !== 'doc' || !Array.isArray(value.content)) return false
  const budget = { count: 1 }
  return value.content.every((node) => isNode(node, budget, 1))
}

/**
 * 确认保存请求里的册、课和文档都能落成文件。
 *
 * @param value 请求体
 * @return 合法时返回请求；否则为 null
 */
export function parseGrammarSaveBody(value: unknown): GrammarSaveRequest | null {
  if (!isRecord(value)) return null
  const { bookId, unit, lesson, document } = value
  if (!isBookId(bookId) || !isLessonNumber(unit) || !isLessonNumber(lesson)) return null
  if (!isGrammarDocument(document)) return null
  return { bookId, unit, lesson, document }
}

function isBookId(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_BOOK_ID_LENGTH && BOOK_ID.test(value)
}

function isLessonNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_LESSON_NUMBER
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isAttrValue(value: unknown): value is GrammarAttr {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true
  if (typeof value === 'number') return Number.isFinite(value)
  return isColumnWidths(value)
}

/** 表格拉伸后的列宽。只接受有限数字，避免把任意数组写进语法文件。 */
function isColumnWidths(value: unknown): value is number[] {
  if (!Array.isArray(value) || value.length > MAX_ATTR_LIST) return false
  return value.every((item) => typeof item === 'number' && Number.isFinite(item))
}

function isAttrs(value: unknown): value is Record<string, GrammarAttr> {
  if (!isRecord(value)) return false
  const keys = Object.keys(value)
  if (keys.length > MAX_ATTRS) return false
  return keys.every((key) => key.length > 0 && key.length <= MAX_ATTR_KEY && isAttrValue(value[key]))
}

function isMark(value: unknown, budget: { count: number }): value is GrammarMark {
  budget.count += 1
  if (budget.count > MAX_NODES) return false
  if (!isRecord(value) || typeof value.type !== 'string' || !NODE_TYPE.test(value.type)) return false
  if (value.attrs !== undefined && !isAttrs(value.attrs)) return false
  return true
}

function isNode(value: unknown, budget: { count: number }, depth: number): value is GrammarDocumentNode {
  budget.count += 1
  if (budget.count > MAX_NODES || depth > MAX_DEPTH) return false
  if (!isRecord(value) || typeof value.type !== 'string' || !NODE_TYPE.test(value.type)) return false
  if (value.type === 'doc') return false
  if (value.attrs !== undefined && !isAttrs(value.attrs)) return false
  if (value.text !== undefined && typeof value.text !== 'string') return false
  if (typeof value.text === 'string' && value.content !== undefined) return false
  if (value.marks !== undefined) {
    if (!Array.isArray(value.marks) || !value.marks.every((mark) => isMark(mark, budget))) return false
  }
  if (value.content !== undefined) {
    if (!Array.isArray(value.content)) return false
    return value.content.every((child) => isNode(child, budget, depth + 1))
  }
  return true
}

function nodeHasText(node: { text?: string; content?: GrammarDocumentNode[] }): boolean {
  if (typeof node.text === 'string' && node.text.trim()) return true
  return node.content?.some(nodeHasText) ?? false
}
