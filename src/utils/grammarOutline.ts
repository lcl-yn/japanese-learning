import type { GrammarDocument, GrammarDocumentNode } from '@/types/grammar'

export type GrammarHeadingLevel = 1 | 2 | 3 | 4

export interface GrammarOutlineItem {
  /** 编辑器里第几个标题节点，从 0 起，空标题也计入。 */
  index: number
  level: GrammarHeadingLevel
  text: string
  children: GrammarOutlineItem[]
}

/**
 * 按标题层级收成目录树。
 * 没有文字的标题不出现在树上，但仍占序号，方便和页面上的标题一一对应。
 * 跳级时挂到最近的上一级下面，例如一级后面直接写三级，三级仍算一级的子项。
 *
 * @param document 语法文档
 * @return 顶级标题列表，子标题在 children 里
 */
export function grammarOutline(document: GrammarDocument): GrammarOutlineItem[] {
  const flat: Array<Omit<GrammarOutlineItem, 'children'>> = []
  const cursor = { index: 0 }
  for (const node of document.content) collectHeadings(node, flat, cursor)
  return nestOutline(flat)
}

function collectHeadings(
  node: GrammarDocumentNode,
  flat: Array<Omit<GrammarOutlineItem, 'children'>>,
  cursor: { index: number },
): void {
  const level = headingLevel(node)
  if (level) {
    const text = nodeText(node).trim()
    const index = cursor.index
    cursor.index += 1
    if (text) flat.push({ index, level, text })
    return
  }
  for (const child of node.content ?? []) collectHeadings(child, flat, cursor)
}

function nestOutline(flat: Array<Omit<GrammarOutlineItem, 'children'>>): GrammarOutlineItem[] {
  const roots: GrammarOutlineItem[] = []
  const stack: GrammarOutlineItem[] = []
  for (const item of flat) {
    const node: GrammarOutlineItem = { ...item, children: [] }
    while (stack.length > 0 && stack[stack.length - 1].level >= node.level) stack.pop()
    const parent = stack[stack.length - 1]
    if (parent) parent.children.push(node)
    else roots.push(node)
    stack.push(node)
  }
  return roots
}

function headingLevel(node: GrammarDocumentNode): GrammarHeadingLevel | null {
  if (node.type !== 'heading') return null
  const level = node.attrs?.level
  if (level === 1 || level === 2 || level === 3 || level === 4) return level
  return null
}

function nodeText(node: GrammarDocumentNode): string {
  const nested = node.content?.map(nodeText).join('') ?? ''
  return `${node.text ?? ''}${nested}`
}
