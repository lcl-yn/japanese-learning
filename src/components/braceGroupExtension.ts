import { Node } from '@tiptap/core'
import type { Editor } from '@tiptap/core'
import { TextSelection, type Transaction } from '@tiptap/pm/state'
import type { ResolvedPos } from '@tiptap/pm/model'

/** 一对多大括号。左边一个总称，右边多行。 */
export const BRACE_GROUP = 'braceGroup'

/** 大括号左边的总称。 */
export const BRACE_LABEL = 'braceLabel'

/** 大括号右边的一行。 */
export const BRACE_ITEM = 'braceItem'

const BRACE_ITEM_COUNT = 3

/**
 * 新插入的大括号：空的总称，右边先放三行。
 *
 * @return 编辑器可插入的节点
 */
export function emptyBraceGroup() {
  return {
    type: BRACE_GROUP,
    content: [
      { type: BRACE_LABEL },
      ...Array.from({ length: BRACE_ITEM_COUNT }, () => ({ type: BRACE_ITEM })),
    ],
  }
}

/** 光标所在的大括号层。不在括号里时没有。 */
function braceDepth($from: ResolvedPos): number | null {
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === BRACE_GROUP) return depth
  }
  return null
}

/** 把光标放进右边第一行。 */
function moveToFirstItem(editor: Editor): boolean {
  const depth = braceDepth(editor.state.selection.$from)
  if (depth === null) return false
  const group = editor.state.selection.$from.node(depth)
  const inside = editor.state.selection.$from.start(depth) + group.child(0).nodeSize + 1
  return editor.commands.setTextSelection(inside)
}

/**
 * 插入后光标常常停在括号后面。找到这组括号，把光标放进左边的总称。
 */
export function focusBraceLabel(tr: Transaction): boolean {
  const $pos = tr.doc.resolve(tr.selection.from)
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    if ($pos.node(depth).type.name !== BRACE_GROUP) continue
    tr.setSelection(TextSelection.create(tr.doc, $pos.start(depth) + 1))
    return true
  }
  const blockStart = $pos.depth > 0 ? $pos.before(1) : $pos.pos
  const before = tr.doc.resolve(blockStart).nodeBefore
  if (before?.type.name === BRACE_GROUP) {
    tr.setSelection(TextSelection.create(tr.doc, blockStart - before.nodeSize + 2))
    return true
  }
  let placed = false
  tr.doc.descendants((node, pos) => {
    if (placed || node.type.name !== BRACE_GROUP) return
    tr.setSelection(TextSelection.create(tr.doc, pos + 2))
    placed = true
    return false
  })
  return true
}

/**
 * 空行再按回车时离开这组括号。
 * 右边不止一行时，把这个空行去掉。
 * 后面已经是空段时只把光标移过去，避免文末再多出一段。
 */
function leaveEmptyItem(editor: Editor): boolean {
  const { state } = editor
  const { $from } = state.selection
  const depth = braceDepth($from)
  if (depth === null) return false
  const group = $from.node(depth)
  const after = $from.after(depth)
  const tr = state.tr
  if (group.childCount > 2) {
    const itemPos = $from.before()
    tr.delete(itemPos, itemPos + $from.parent.nodeSize)
  }
  const paragraph = state.schema.nodes.paragraph
  if (!paragraph) return false
  const insertAt = tr.mapping.map(after)
  const next = tr.doc.resolve(insertAt).nodeAfter
  if (next?.type === paragraph && next.content.size === 0) {
    tr.setSelection(TextSelection.create(tr.doc, insertAt + 1))
  } else {
    tr.insert(insertAt, paragraph.create())
    tr.setSelection(TextSelection.create(tr.doc, insertAt + 1))
  }
  editor.view.dispatch(tr)
  return true
}

/** 整组都空着时，按退格换成一个空段。后面已有空段就不再补。 */
function replaceGroupWithParagraph(editor: Editor, from: number, size: number): boolean {
  const paragraph = editor.state.schema.nodes.paragraph
  if (!paragraph) return false
  const tr = editor.state.tr
  const next = tr.doc.resolve(from + size).nodeAfter
  if (next?.type === paragraph && next.content.size === 0) {
    tr.delete(from, from + size)
  } else {
    tr.replaceWith(from, from + size, paragraph.create())
  }
  tr.setSelection(TextSelection.create(tr.doc, from + 1))
  editor.view.dispatch(tr)
  return true
}

/** 删掉右边第一行的空行，光标落到下一行开头。 */
function deleteFirstEmptyItem(editor: Editor): boolean {
  const { $from } = editor.state.selection
  const from = $from.before()
  const tr = editor.state.tr.delete(from, from + $from.parent.nodeSize)
  tr.setSelection(TextSelection.create(tr.doc, from + 1))
  editor.view.dispatch(tr)
  return true
}

/** 画出跟着右侧行高拉伸的大括号。 */
function createBraceMark(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('class', 'brace-mark')
  svg.setAttribute('viewBox', '0 0 20 100')
  svg.setAttribute('width', '100%')
  svg.setAttribute('height', '100%')
  svg.setAttribute('preserveAspectRatio', 'none')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('contenteditable', 'false')
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', 'M18 1C10 1 10 42 2 50C10 58 10 99 18 99')
  svg.append(path)
  return svg
}

const braceGroup = Node.create({
  name: BRACE_GROUP,
  priority: 1000,
  group: 'block',
  content: `${BRACE_LABEL} ${BRACE_ITEM}+`,
  defining: true,
  selectable: true,

  parseHTML() {
    return [{ tag: 'div[data-brace-group]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, 'data-brace-group': '', class: 'brace-group' }, 0]
  },

  addNodeView() {
    return ({ editor, getPos }) => {
      const dom = document.createElement('div')
      dom.className = 'brace-group'
      dom.setAttribute('data-brace-group', '')
      const contentDOM = document.createElement('div')
      contentDOM.className = 'brace-content'
      const svg = createBraceMark()
      svg.addEventListener('mousedown', (event) => {
        event.preventDefault()
        const pos = getPos()
        if (typeof pos !== 'number') return
        editor.chain().focus().setNodeSelection(pos).run()
      })
      dom.append(contentDOM, svg)
      return {
        dom,
        contentDOM,
        stopEvent(event) {
          const target = event.target
          return target instanceof Element && Boolean(target.closest('.brace-mark'))
        },
        ignoreMutation(mutation) {
          return !contentDOM.contains(mutation.target)
        },
        update(node) {
          return node.type.name === BRACE_GROUP
        },
      }
    }
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { selection } = this.editor.state
        const { $from } = selection
        if (!selection.empty) return false
        if ($from.parent.type.name === BRACE_LABEL) return moveToFirstItem(this.editor)
        if ($from.parent.type.name !== BRACE_ITEM) return false
        if ($from.parent.content.size === 0) return leaveEmptyItem(this.editor)
        const depth = braceDepth($from)
        if (depth === null) return false
        const group = $from.node(depth)
        // 下面还有一行时，回车移到下一行；最后一行再回车才新开一行。
        if ($from.index(depth) < group.childCount - 1) {
          return this.editor.commands.setTextSelection($from.after() + 1)
        }
        return this.editor.commands.splitBlock()
      },
      Backspace: () => {
        const { selection } = this.editor.state
        const { $from } = selection
        if (!selection.empty || $from.parentOffset !== 0) return false
        const name = $from.parent.type.name
        if (name !== BRACE_LABEL && name !== BRACE_ITEM) return false
        const depth = braceDepth($from)
        if (depth === null) return false
        const group = $from.node(depth)
        if (name === BRACE_LABEL) {
          if ($from.parent.content.size > 0) return false
          for (let index = 1; index < group.childCount; index += 1) {
            if (group.child(index).content.size > 0) return true
          }
          return replaceGroupWithParagraph(this.editor, $from.before(depth), group.nodeSize)
        }
        const index = $from.index(depth)
        if (index > 1) return false
        if ($from.parent.content.size > 0) return true
        if (group.childCount > 2) return deleteFirstEmptyItem(this.editor)
        return true
      },
    }
  },
})

const braceLabel = Node.create({
  name: BRACE_LABEL,
  content: 'inline*',

  parseHTML() {
    return [{ tag: 'div[data-brace-label]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, 'data-brace-label': '', class: 'brace-label' }, 0]
  },
})

const braceItem = Node.create({
  name: BRACE_ITEM,
  content: 'inline*',

  parseHTML() {
    return [{ tag: 'div[data-brace-item]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, 'data-brace-item': '', class: 'brace-item' }, 0]
  },
})

/** 大括号用到的三个节点。组的优先级更高，回车才能抢在默认拆段之前。 */
export const braceGroupExtensions = [braceGroup, braceLabel, braceItem]
