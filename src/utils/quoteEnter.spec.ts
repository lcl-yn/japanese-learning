import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { afterEach, describe, expect, it } from 'vitest'
import { quoteEnter } from './quoteEnter'

function createEditor(content: Record<string, unknown>) {
  return new Editor({
    extensions: [StarterKit.configure({ code: false, codeBlock: false, link: false }), quoteEnter],
    content,
  })
}

function quoteNodes(editor: Editor) {
  return (editor.getJSON().content ?? []).filter((node) => node.type === 'blockquote')
}

/** 光标放到引用里的第一段空正文。文末自动补的空段不在引用中，要跳过。 */
function focusFirstEmptyParagraph(editor: Editor) {
  let pos = -1
  editor.state.doc.descendants((node, position) => {
    if (pos >= 0) return false
    if (node.type.name !== 'paragraph' || node.content.size > 0) return
    const $pos = editor.state.doc.resolve(position + 1)
    if ($pos.node(-1).type.name !== 'blockquote') return
    pos = position + 1
    return false
  })
  expect(pos).toBeGreaterThan(0)
  expect(editor.commands.setTextSelection(pos)).toBe(true)
}

function focusTextEnd(editor: Editor, text: string) {
  let pos = -1
  editor.state.doc.descendants((node, position) => {
    if (node.isText && node.text === text) pos = position + node.nodeSize
  })
  expect(pos).toBeGreaterThan(0)
  expect(editor.commands.setTextSelection(pos)).toBe(true)
}

/** 走编辑器真实的按键处理。 */
function pressEnter(editor: Editor) {
  const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true })
  return editor.view.someProp('handleKeyDown', (handler) => handler(editor.view, event)) ?? false
}

describe('quoteEnter', () => {
  let editor: Editor | undefined

  afterEach(() => {
    editor?.destroy()
  })

  it('keeps consecutive blank lines inside one quote', () => {
    editor = createEditor({
      type: 'doc',
      content: [
        {
          type: 'blockquote',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: '甲' }] }],
        },
      ],
    })
    focusTextEnd(editor, '甲')

    expect(pressEnter(editor)).toBe(true)
    focusFirstEmptyParagraph(editor)
    expect(pressEnter(editor)).toBe(true)

    expect(quoteNodes(editor)).toEqual([
      {
        type: 'blockquote',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: '甲' }] }, { type: 'paragraph' }, { type: 'paragraph' }],
      },
    ])
  })

  it('does not split a quote when Enter is pressed on a blank line between quote lines', () => {
    editor = createEditor({
      type: 'doc',
      content: [
        {
          type: 'blockquote',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: '甲' }] },
            { type: 'paragraph' },
            { type: 'paragraph', content: [{ type: 'text', text: '乙' }] },
          ],
        },
      ],
    })
    focusFirstEmptyParagraph(editor)

    expect(pressEnter(editor)).toBe(true)

    expect(quoteNodes(editor)).toEqual([
      {
        type: 'blockquote',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: '甲' }] },
          { type: 'paragraph' },
          { type: 'paragraph' },
          { type: 'paragraph', content: [{ type: 'text', text: '乙' }] },
        ],
      },
    ])
  })
})
