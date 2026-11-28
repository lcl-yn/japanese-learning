import { Editor } from '@tiptap/core'
import { CellSelection } from '@tiptap/pm/tables'
import StarterKit from '@tiptap/starter-kit'
import { afterEach, describe, expect, it } from 'vitest'
import { cssColorToHex, selectionCellFills, setCellFill, sharedCellFill, tableFillExtensions } from './tableCellFill'

describe('cssColorToHex', () => {
  it('keeps a six-digit color and expands a short one', () => {
    expect(cssColorToHex('#FFAF00')).toBe('#ffaf00')
    expect(cssColorToHex('#abc')).toBe('#aabbcc')
  })

  it('turns rgb() from the browser into the same hex', () => {
    expect(cssColorToHex('rgb(255, 175, 0)')).toBe('#ffaf00')
  })

  it('rejects empty, named, and out-of-range colors', () => {
    expect(cssColorToHex('')).toBeNull()
    expect(cssColorToHex('red')).toBeNull()
    expect(cssColorToHex('rgb(256, 0, 0)')).toBeNull()
  })
})

describe('sharedCellFill', () => {
  it('returns the color when every selected cell uses it', () => {
    expect(sharedCellFill(['#ffaf00', '#ffaf00'])).toEqual({ same: true, color: '#ffaf00' })
  })

  it('tells a blank selection apart from mixed colors', () => {
    expect(sharedCellFill([null, null])).toEqual({ same: true, color: '' })
    expect(sharedCellFill(['#ffaf00', null])).toEqual({ same: false, color: '' })
    expect(sharedCellFill([])).toEqual({ same: false, color: '' })
  })
})

describe('setCellFill', () => {
  let editor: Editor | null = null

  afterEach(() => {
    editor?.destroy()
    editor = null
  })

  function mount(): Editor {
    editor = new Editor({
      extensions: [StarterKit, ...tableFillExtensions(48)],
    })
    return editor
  }

  function colors(current: Editor): (string | null)[] {
    const found: (string | null)[] = []
    current.state.doc.descendants((node) => {
      if (node.type.name !== 'tableCell' && node.type.name !== 'tableHeader') return
      const raw = node.attrs.backgroundColor
      found.push(typeof raw === 'string' ? raw : null)
    })
    return found
  }

  function positions(current: Editor): number[] {
    const found: number[] = []
    current.state.doc.descendants((node, pos) => {
      if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') found.push(pos)
    })
    return found
  }

  it('paints the cell under the cursor and keeps the color in saved html', () => {
    const current = mount()
    current.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: false })
    expect(setCellFill(current.state, (tr) => current.view.dispatch(tr), '#FFAF00')).toBe(true)
    expect(colors(current)[0]).toBe('#ffaf00')
    expect(current.getHTML()).toContain('background-color:')

    const html = current.getHTML()
    current.commands.setContent(html)
    expect(colors(current)[0]).toBe('#ffaf00')
  })

  it('paints every cell in a selection, including ones that already match the anchor', () => {
    const current = mount()
    current.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: false })
    setCellFill(current.state, (tr) => current.view.dispatch(tr), '#ffaf00')
    const [first, second] = positions(current)
    current.view.dispatch(current.state.tr.setSelection(CellSelection.create(current.state.doc, first, second)))
    expect(setCellFill(current.state, (tr) => current.view.dispatch(tr), '#ffaf00')).toBe(true)
    expect(colors(current).slice(0, 2)).toEqual(['#ffaf00', '#ffaf00'])
    expect(sharedCellFill(selectionCellFills(current.state))).toEqual({ same: true, color: '#ffaf00' })
  })

  it('clears the fill and does nothing outside a table or with a bad color', () => {
    const current = mount()
    expect(setCellFill(current.state, (tr) => current.view.dispatch(tr), '#ffaf00')).toBe(false)
    current.commands.insertTable({ rows: 1, cols: 1, withHeaderRow: true })
    setCellFill(current.state, (tr) => current.view.dispatch(tr), '#96ee7d')
    expect(colors(current)).toEqual(['#96ee7d'])
    expect(setCellFill(current.state, (tr) => current.view.dispatch(tr), null)).toBe(true)
    expect(colors(current)).toEqual([null])
    expect(current.getHTML()).not.toContain('background-color')
    expect(setCellFill(current.state, (tr) => current.view.dispatch(tr), 'red')).toBe(false)
  })
})
