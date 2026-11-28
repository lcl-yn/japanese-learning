import type { Node } from '@tiptap/core'
import { TableCell, TableHeader, TableKit } from '@tiptap/extension-table'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import { CellSelection, isInTable, selectionCell } from '@tiptap/pm/tables'

const HEX_COLOR = /^#([0-9a-fA-F]{6})$/
const SHORT_HEX_COLOR = /^#([0-9a-fA-F]{3})$/
const RGB_COLOR = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i

/**
 * 把样式里的颜色收成 #rrggbb。
 * 空值、颜色名和超出 0–255 的 rgb 都当成没有底色。
 *
 * @param value 色值，可以是 #rgb、#rrggbb 或 rgb()
 * @return 小写六位色值；认不出时为 null
 */
export function cssColorToHex(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  const hex = HEX_COLOR.exec(trimmed)
  if (hex) return `#${hex[1].toLowerCase()}`
  const short = SHORT_HEX_COLOR.exec(trimmed)
  if (short) {
    const [red, green, blue] = short[1]
    return `#${red}${red}${green}${green}${blue}${blue}`.toLowerCase()
  }
  const rgb = RGB_COLOR.exec(trimmed)
  if (!rgb) return null
  const channels = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
  if (channels.some((channel) => channel > 255)) return null
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

/**
 * 选出的格子是不是同一种底色。
 * 都没上色也算同一种；有的有、有的没有，或颜色不同，则不是。
 *
 * @param colors 每个格子的底色，没有底色时为 null
 * @return same 为 true 时 color 是共同的底色，没有底色则为空字符串
 */
export function sharedCellFill(colors: readonly (string | null)[]): { same: boolean; color: string } {
  if (colors.length === 0) return { same: false, color: '' }
  const first = colors[0] ?? ''
  for (const color of colors) {
    if ((color ?? '') !== first) return { same: false, color: '' }
  }
  return { same: true, color: first }
}

function readFill(node: ProseMirrorNode): string | null {
  const raw = node.attrs.backgroundColor
  return typeof raw === 'string' ? cssColorToHex(raw) : null
}

/**
 * 读出当前选区盖住的格子底色。
 * 光标在一个格子里时只算这一格；框选时按选区里的每一格。
 *
 * @param state 编辑器状态
 * @return 不在表格里时为空数组
 */
export function selectionCellFills(state: EditorState): (string | null)[] {
  if (!isInTable(state)) return []
  if (state.selection instanceof CellSelection) {
    const colors: (string | null)[] = []
    state.selection.forEachCell((node) => {
      colors.push(readFill(node))
    })
    return colors
  }
  const cell = selectionCell(state).nodeAfter
  return cell ? [readFill(cell)] : []
}

/**
 * 给当前格子或框选的格子铺上底色。
 * 锚点格已经是这个颜色时，其余选中的格子仍会涂上。不在表格里、颜色认不出、或没有格子需要改时返回 false。
 *
 * @param state 编辑器状态
 * @param dispatch 提交事务
 * @param color 底色；null 表示清掉
 * @return 有格子被改动时为 true
 */
export function setCellFill(state: EditorState, dispatch: (tr: Transaction) => void, color: string | null): boolean {
  const value = color === null ? null : cssColorToHex(color)
  if (color !== null && !value) return false
  if (!isInTable(state)) return false
  const tr = state.tr
  const paint = (node: ProseMirrorNode, pos: number) => {
    if (readFill(node) === value) return
    tr.setNodeMarkup(pos, null, { ...node.attrs, backgroundColor: value })
  }
  if (state.selection instanceof CellSelection) state.selection.forEachCell(paint)
  else {
    const $cell = selectionCell(state)
    if ($cell.nodeAfter) paint($cell.nodeAfter, $cell.pos)
  }
  if (!tr.docChanged) return false
  dispatch(tr)
  return true
}

function fillAttribute() {
  return {
    backgroundColor: {
      default: null as string | null,
      parseHTML: (element: HTMLElement) => cssColorToHex(element.style.backgroundColor),
      renderHTML: (attributes: { backgroundColor?: unknown }) => {
        const color = typeof attributes.backgroundColor === 'string' ? cssColorToHex(attributes.backgroundColor) : null
        if (!color) return {}
        return { style: `background-color: ${color}` }
      },
    },
  }
}

function withCellFill(node: Node) {
  return node.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        ...fillAttribute(),
      }
    },
  })
}

const filledTableCell = withCellFill(TableCell)
const filledTableHeader = withCellFill(TableHeader)

/**
 * 表格扩展加上能保存底色的单元格。
 * 自带的单元格没有背景色属性，这里换成带 backgroundColor 的格子。
 *
 * @param cellMinWidth 单元格最小宽度
 */
export function tableFillExtensions(cellMinWidth: number) {
  return [
    TableKit.configure({
      table: { resizable: false, cellMinWidth },
      tableCell: false,
      tableHeader: false,
    }),
    filledTableCell,
    filledTableHeader,
  ]
}
