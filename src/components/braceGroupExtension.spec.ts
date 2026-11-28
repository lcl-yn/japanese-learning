import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { beforeAll, describe, expect, it } from 'vitest'
import { braceGroupExtensions, BRACE_GROUP, BRACE_ITEM, BRACE_LABEL, emptyBraceGroup, focusBraceLabel } from './braceGroupExtension'
import { grammarHasText, isGrammarDocument } from '@/utils/grammarDocument'

beforeAll(() => {
  const rect = {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: 0,
    height: 0,
    toJSON() {
      return {}
    },
  }
  const rects = () => {
    const list = [rect]
    return Object.assign(list, { item: (index: number) => list[index] ?? null }) as unknown as DOMRectList
  }
  for (const proto of [Range.prototype, Element.prototype, SVGElement.prototype, Text.prototype]) {
    const host = proto as Range
    if (typeof host.getClientRects !== 'function') host.getClientRects = rects
    if (typeof host.getBoundingClientRect !== 'function') host.getBoundingClientRect = () => rect as DOMRect
  }
})

function createEditor() {
  const element = document.createElement('div')
  document.body.append(element)
  return new Editor({
    element,
    extensions: [
      StarterKit.configure({
        code: false,
        codeBlock: false,
        link: false,
      }),
      ...braceGroupExtensions,
    ],
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
  })
}

/** 光标放进左边的总称。 */
function focusLabel(editor: Editor) {
  editor.commands.setTextSelection(2)
}

/** 走编辑器真实的按键处理。快捷键命令不会留下只改光标的事务。 */
function pressEnter(editor: Editor) {
  const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true })
  return editor.view.someProp('handleKeyDown', (handler) => handler(editor.view, event)) ?? false
}

describe('brace group', () => {
  it('keeps a brace document readable', () => {
    const document = {
      type: 'doc' as const,
      content: [
        {
          type: BRACE_GROUP,
          content: [
            { type: BRACE_LABEL, content: [{ type: 'text', text: '动词' }] },
            { type: BRACE_ITEM, content: [{ type: 'text', text: '一类动词' }] },
          ],
        },
      ],
    }
    expect(isGrammarDocument(document)).toBe(true)
    expect(grammarHasText(document)).toBe(true)
    expect(grammarHasText({ type: 'doc', content: [emptyBraceGroup()] })).toBe(false)
  })

  it('puts the caret in the label and adds a row with enter', () => {
    const editor = createEditor()
    editor.chain().focus().insertContentAt({ from: 0, to: 2 }, emptyBraceGroup()).run()
    focusLabel(editor)
    const inserted = editor.getJSON().content?.[0]
    expect(inserted?.type).toBe(BRACE_GROUP)
    expect(inserted?.content?.map((node) => node.type)).toEqual([
      BRACE_LABEL,
      BRACE_ITEM,
      BRACE_ITEM,
      BRACE_ITEM,
    ])

    editor.commands.insertContent('动词')
    expect(pressEnter(editor)).toBe(true)
    expect(editor.state.selection.$from.parent.type.name).toBe(BRACE_ITEM)
    editor.commands.insertContent('一类')
    expect(pressEnter(editor)).toBe(true)
    editor.commands.insertContent('二类')

    const group = editor.getJSON().content?.[0]
    expect(group?.content?.[0]?.content?.[0]?.text).toBe('动词')
    expect(group?.content?.slice(1).map((node) => node.content?.[0]?.text ?? '')).toEqual(['一类', '二类', ''])
    editor.destroy()
  })

  it('leaves the brace when enter is pressed on an empty row', () => {
    const editor = createEditor()
    editor.chain().focus().insertContentAt({ from: 0, to: 2 }, emptyBraceGroup()).run()
    focusLabel(editor)
    editor.commands.insertContent('动词')
    expect(pressEnter(editor)).toBe(true)
    expect(pressEnter(editor)).toBe(true)
    expect(editor.getJSON().content?.map((node) => node.type)).toEqual([BRACE_GROUP, 'paragraph'])
    expect(editor.getJSON().content?.[0]?.content).toHaveLength(3)
    editor.destroy()
  })

  it('puts the caret in the label when the brace is inserted beside existing text', () => {
    const editor = createEditor()
    editor.commands.setContent({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: '动词' }] }],
    })
    editor.commands.setTextSelection(3)
    editor
      .chain()
      .insertContentAt(editor.state.selection.from, emptyBraceGroup())
      .command(({ tr }) => focusBraceLabel(tr))
      .run()
    expect(editor.state.selection.$from.parent.type.name).toBe(BRACE_LABEL)
    editor.destroy()
  })
})
