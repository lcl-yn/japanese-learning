import { Extension } from '@tiptap/core'

/**
 * 引用里的空段再按回车时，仍留在这一段引用中。
 * 默认会把空段抬出引用；后面还有内容时，则会从空段处把引用拆成两段。
 */
export const quoteEnter = Extension.create({
  name: 'quoteEnter',
  priority: 1000,
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { selection } = this.editor.state
        const { $from } = selection
        if (!selection.empty || $from.parent.content.size > 0) return false
        if ($from.depth < 1 || $from.node(-1).type.name !== 'blockquote') return false
        return this.editor.commands.splitBlock()
      },
    }
  },
})
