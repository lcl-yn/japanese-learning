<script setup lang="ts">
import { Extension } from '@tiptap/core'
import { TableKit } from '@tiptap/extension-table'
import { liftListItem, sinkListItem } from '@tiptap/pm/schema-list'
import { TextSelection } from '@tiptap/pm/state'
import { CellSelection, columnResizing } from '@tiptap/pm/tables'
import type { EditorView } from '@tiptap/pm/view'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyleKit } from '@tiptap/extension-text-style'
import StarterKit from '@tiptap/starter-kit'
import { computed, ref, watch } from 'vue'
import type { GrammarDocument } from '@/types/grammar'
import { isGrammarDocument } from '@/utils/grammarDocument'
import { quoteEnter } from '@/utils/quoteEnter'

const props = withDefaults(
  defineProps<{
    document: GrammarDocument
    editable: boolean
    placeholder?: string
    label?: string
    toolbarLabel?: string
  }>(),
  {
    placeholder: '写下这一课的语法…',
    label: '语法笔记',
    toolbarLabel: '语法格式',
  },
)

const emit = defineEmits<{
  update: [document: GrammarDocument]
}>()

const blockOptions = [
  { label: '正文', value: 'paragraph' },
  { label: '一级标题', value: 'h1' },
  { label: '二级标题', value: 'h2' },
  { label: '三级标题', value: 'h3' },
  { label: '四级标题', value: 'h4' },
] as const

const fontOptions = [
  { label: '默认', value: '' },
  { label: '微软雅黑', value: '"Microsoft YaHei", "微软雅黑", sans-serif' },
  { label: '宋体', value: 'SimSun, "Songti SC", serif' },
  { label: '黑体', value: 'SimHei, "Heiti SC", sans-serif' },
  { label: '楷体', value: 'KaiTi, "Kaiti SC", serif' },
  { label: '游ゴシック', value: '"Yu Gothic", YuGothic, sans-serif' },
] as const

const fontSizeOptions = [
  { label: '默认', value: '' },
  { label: '12', value: '12px' },
  { label: '14', value: '14px' },
  { label: '16', value: '16px' },
  { label: '18', value: '18px' },
  { label: '20', value: '20px' },
  { label: '24', value: '24px' },
  { label: '28', value: '28px' },
] as const

// 文字颜色预设。每一列从上到下由浅到深：灰、青、蓝、紫、品红、玫红、红、橙、黄、绿。
const colorPresets = [
  '#d6d6d6', '#5ddaff', '#81b6ff', '#ba00ff', '#e500ff', '#f14f9a', '#ff7a74', '#fbcd5f', '#f5ff7d', '#96ee7d',
  '#a8a8a8', '#1eccff', '#5898ff', '#9e00f3', '#d100ff', '#eb0073', '#ff4635', '#ffaf00', '#f3ff38', '#6be748',
  '#797979', '#1aade0', '#3665ee', '#7600d8', '#a600c4', '#bc0058', '#ff0000', '#fa7a00', '#f7ff00', '#4dce1d',
  '#464646', '#1a90b9', '#2d4fc9', '#4f009a', '#8600a4', '#9c004c', '#e30000', '#de5700', '#c6c500', '#41ad1c',
  '#000000', '#147191', '#1c3387', '#41007d', '#6a0081', '#7b003d', '#ad0000', '#a74500', '#939600', '#328712',
] as const

const tablePickerColumns = 10
const tablePickerRows = 8
const tableSizeMin = 1
const tableSizeMax = 20
const tableCells = Array.from({ length: tablePickerRows * tablePickerColumns }, (_, index) => ({
  row: Math.floor(index / tablePickerColumns) + 1,
  col: (index % tablePickerColumns) + 1,
}))

const colorOpen = ref(false)
const alignOpen = ref(false)
const moreColorInput = ref<HTMLInputElement | null>(null)
const defaultTextColor = '#1c1917'
const tableOpen = ref(false)
const tableCustomOpen = ref(false)
const tableHover = ref({ rows: 0, cols: 0 })
const customRows = ref(2)
const customCols = ref(2)

const tableCellMinWidth = 48

// 右键按下时先记下多格选区。浏览器接着可能把选区收成光标，菜单弹出前再放回去。
let pendingCells: { anchor: number; head: number } | null = null

/** 右键是否落在这块已选格子里。 */
function pointerInsideCellSelection(view: EditorView, selection: CellSelection, event: MouseEvent): boolean {
  const found = view.posAtCoords({ left: event.clientX, top: event.clientY })
  if (!found) return false
  let inside = false
  selection.forEachCell((node, pos) => {
    if (found.pos >= pos && found.pos < pos + node.nodeSize) inside = true
  })
  return inside
}

/** 选区是否盖住一个以上的格子。 */
function cellSelectionSpansMultiple(selection: CellSelection): boolean {
  let count = 0
  selection.forEachCell(() => {
    count += 1
  })
  return count > 1
}

/**
 * 多格选区上右键时保住这块选区。点在选区外面则返回 false，交给后面收成单格。
 */
function keepMultiCellSelection(view: EditorView, event: MouseEvent): boolean {
  const saved = pendingCells
  pendingCells = null
  const current = view.state.selection
  if (
    current instanceof CellSelection &&
    cellSelectionSpansMultiple(current) &&
    pointerInsideCellSelection(view, current, event)
  ) {
    return true
  }
  if (!saved) return false
  let restored: CellSelection
  try {
    restored = CellSelection.create(view.state.doc, saved.anchor, saved.head)
  } catch {
    return false
  }
  if (!cellSelectionSpansMultiple(restored) || !pointerInsideCellSelection(view, restored, event)) return false
  view.dispatch(view.state.tr.setSelection(restored))
  return true
}

// 编辑开关是点「编辑」后才打开的。表格扩展只在创建时看能不能改，列宽拖动要单独挂上。
const tableColumnResize = Extension.create({
  name: 'tableColumnResize',
  addProseMirrorPlugins() {
    return [
      columnResizing({
        handleWidth: 5,
        cellMinWidth: tableCellMinWidth,
        defaultCellMinWidth: tableCellMinWidth,
        View: null,
        lastColumnResizable: true,
      }),
    ]
  },
})

const alignOptions = [
  { value: 'left', label: '左对齐' },
  { value: 'center', label: '居中' },
  { value: 'right', label: '右对齐' },
  { value: 'justify', label: '两端对齐' },
] as const

type TextAlignValue = (typeof alignOptions)[number]['value']

type EditorActive = {
  bold: boolean
  italic: boolean
  underline: boolean
  strike: boolean
  quote: boolean
  block: string
  font: string
  size: string
  color: string
  align: TextAlignValue
}

const alignIconWidths: Record<TextAlignValue, number[]> = {
  left: [14, 8, 14, 10],
  center: [14, 8, 14, 10],
  right: [14, 8, 14, 10],
  justify: [14, 14, 14, 14],
}

/** 画出某一档对齐图标里的一条横线。 */
function alignLine(align: TextAlignValue, width: number, y: number): string {
  const start = align === 'right' ? 15 - width : align === 'center' ? (16 - width) / 2 : 1
  return `M${start} ${y}H${start + width}`
}

const tableHoverLabel = computed(() => {
  const { rows, cols } = tableHover.value
  if (!rows || !cols) return '选择表格大小'
  return `${cols}×${rows} 表格`
})

const editor = useEditor({
  content: props.document,
  editable: props.editable,
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4] },
      code: false,
      codeBlock: false,
      link: false,
    }),
    quoteEnter,
    TextStyleKit.configure({
      backgroundColor: false,
      lineHeight: false,
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
      alignments: ['left', 'center', 'right', 'justify'],
    }),
    Placeholder.configure({
      placeholder: props.placeholder,
    }),
    TableKit.configure({
      table: { resizable: false, cellMinWidth: tableCellMinWidth },
    }),
    tableColumnResize,
  ],
  editorProps: {
    attributes: {
      spellcheck: 'false',
      'aria-label': props.label,
    },
    handleDOMEvents: {
      mousedown(view, event) {
        if (!(event instanceof MouseEvent) || event.button !== 2) {
          pendingCells = null
          return false
        }
        const selection = view.state.selection
        if (
          selection instanceof CellSelection &&
          cellSelectionSpansMultiple(selection) &&
          pointerInsideCellSelection(view, selection, event)
        ) {
          pendingCells = { anchor: selection.$anchorCell.pos, head: selection.$headCell.pos }
        } else {
          pendingCells = null
        }
        return false
      },
      // 右键落在单元格里才换成本菜单，正文其他位置仍用浏览器菜单。
      contextmenu(view, event) {
        if (!view.editable || !(event instanceof MouseEvent)) return false
        const target = event.target
        const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null
        const cell = element?.closest('td, th')
        if (!cell || !view.dom.contains(cell)) return false
        event.preventDefault()
        const multiple = keepMultiCellSelection(view, event)
        if (!multiple) {
          const found = view.posAtCoords({ left: event.clientX, top: event.clientY })
          if (found) {
            const selection = TextSelection.near(view.state.doc.resolve(found.pos))
            view.dispatch(view.state.tr.setSelection(selection))
          }
        }
        openTableMenu(event.clientX, event.clientY, multiple)
        return true
      },
    },
    // 列表快捷键降不了级时会返回 false，浏览器接着把焦点移到右侧目录。
    handleKeyDown(view, event) {
      if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return false
      const itemType = view.state.schema.nodes.listItem
      if (!itemType) return false
      const { $from } = view.state.selection
      let inItem = false
      for (let depth = $from.depth; depth > 0; depth -= 1) {
        if ($from.node(depth).type === itemType) inItem = true
      }
      if (!inItem) return false
      const command = event.shiftKey ? liftListItem(itemType) : sinkListItem(itemType)
      return !command(view.state)
    },
  },
  onUpdate: ({ editor: current }) => {
    const json: unknown = current.getJSON()
    if (isGrammarDocument(json)) emit('update', json)
  },
})

const tableMenu = ref<{ x: number; y: number } | null>(null)
const tableMenuMultiple = ref(false)

const tableMenuInsert = [
  { action: 'rowBefore', label: '插入上行(A)', key: 'a' },
  { action: 'rowAfter', label: '插入下行(B)', key: 'b' },
  { action: 'columnBefore', label: '插入左列(L)', key: 'l' },
  { action: 'columnAfter', label: '插入右列(R)', key: 'r' },
] as const

const tableMenuRemove = [
  { action: 'deleteRow', label: '删除行(D)', key: 'd' },
  { action: 'deleteColumn', label: '删除列(C)', key: 'c' },
] as const

const tableMenuTable = [{ action: 'deleteTable', label: '删除表格' }] as const

type TableMenuAction =
  | (typeof tableMenuInsert)[number]['action']
  | (typeof tableMenuRemove)[number]['action']
  | (typeof tableMenuTable)[number]['action']

/**
 * 在右键位置打开表格菜单，并避开窗口边缘。
 * 框选多格时只留删行、删列。
 *
 * @param multiple 当前是不是多格选区
 */
function openTableMenu(x: number, y: number, multiple = false) {
  tableMenuMultiple.value = multiple
  const menuWidth = 168
  const menuItemHeight = 32
  const itemCount = multiple
    ? tableMenuRemove.length
    : tableMenuInsert.length + tableMenuRemove.length + tableMenuTable.length
  const separatorCount = multiple ? 0 : 2
  const menuHeight = itemCount * menuItemHeight + 12 + separatorCount * 9
  tableMenu.value = {
    x: Math.max(8, Math.min(x, window.innerWidth - menuWidth - 8)),
    y: Math.max(8, Math.min(y, window.innerHeight - menuHeight - 8)),
  }
}

function closeTableMenu() {
  tableMenu.value = null
}

/**
 * 执行右键菜单里的插行、插列、删行、删列或删表。
 *
 * @param action 菜单项
 */
function chooseTableMenu(action: TableMenuAction) {
  closeTableMenu()
  if (action === 'rowBefore' || action === 'rowAfter') {
    insertTableRow(action === 'rowBefore' ? 'before' : 'after')
    return
  }
  if (action === 'columnBefore' || action === 'columnAfter') {
    insertTableColumn(action === 'columnBefore' ? 'before' : 'after')
    return
  }
  if (action === 'deleteRow') deleteTableRow()
  else if (action === 'deleteColumn') deleteTableColumn()
  else deleteCurrentTable()
}

watch(tableMenu, (menu, _, onCleanup) => {
  if (!menu) return
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      closeTableMenu()
      return
    }
    if (event.repeat || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return
    const items = tableMenuMultiple.value ? tableMenuRemove : [...tableMenuInsert, ...tableMenuRemove]
    const item = items.find((entry) => entry.key === event.key.toLowerCase())
    if (!item) return
    event.preventDefault()
    event.stopPropagation()
    chooseTableMenu(item.action)
  }
  const onPointer = (event: Event) => {
    const target = event.target
    if (target instanceof Element && target.closest('.table-menu')) return
    closeTableMenu()
  }
  window.addEventListener('keydown', onKey, true)
  window.addEventListener('pointerdown', onPointer)
  window.addEventListener('scroll', closeTableMenu, true)
  onCleanup(() => {
    window.removeEventListener('keydown', onKey, true)
    window.removeEventListener('pointerdown', onPointer)
    window.removeEventListener('scroll', closeTableMenu, true)
  })
})

watch(
  () => props.editable,
  (editable) => {
    editor.value?.setEditable(editable)
    if (!editable) closeTableMenu()
  },
)

const active = computed((): EditorActive => {
  const current = editor.value
  if (!current) {
    return {
      bold: false,
      italic: false,
      underline: false,
      strike: false,
      quote: false,
      block: 'paragraph',
      font: '',
      size: '',
      color: '',
      align: 'left',
    }
  }
  void current.state
  const textStyle: unknown = current.getAttributes('textStyle')
  const style = isRecord(textStyle) ? textStyle : {}
  let block = 'paragraph'
  if (current.isActive('heading', { level: 1 })) block = 'h1'
  else if (current.isActive('heading', { level: 2 })) block = 'h2'
  else if (current.isActive('heading', { level: 3 })) block = 'h3'
  else if (current.isActive('heading', { level: 4 })) block = 'h4'
  let align: TextAlignValue = 'left'
  if (current.isActive({ textAlign: 'center' })) align = 'center'
  else if (current.isActive({ textAlign: 'right' })) align = 'right'
  else if (current.isActive({ textAlign: 'justify' })) align = 'justify'
  return {
    bold: current.isActive('bold'),
    italic: current.isActive('italic'),
    underline: current.isActive('underline'),
    strike: current.isActive('strike'),
    quote: current.isActive('blockquote'),
    block,
    font: typeof style.fontFamily === 'string' ? style.fontFamily : '',
    size: typeof style.fontSize === 'string' ? style.fontSize : '',
    color: typeof style.color === 'string' ? style.color : '',
    align,
  }
})

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function onBlock(value: string) {
  const current = editor.value
  if (!current) return
  const chain = current.chain().focus()
  if (value === 'h1') chain.toggleHeading({ level: 1 }).run()
  else if (value === 'h2') chain.toggleHeading({ level: 2 }).run()
  else if (value === 'h3') chain.toggleHeading({ level: 3 }).run()
  else if (value === 'h4') chain.toggleHeading({ level: 4 }).run()
  else chain.setParagraph().run()
}

function onFont(value: string) {
  const current = editor.value
  if (!current) return
  const chain = current.chain().focus()
  if (value) chain.setFontFamily(value).run()
  else chain.unsetFontFamily().run()
}

function onFontSize(value: string) {
  const current = editor.value
  if (!current) return
  const chain = current.chain().focus()
  if (value) chain.setFontSize(value).run()
  else chain.unsetFontSize().run()
}

function onColor(value: string | null) {
  const current = editor.value
  if (!current) return
  const chain = current.chain().focus()
  if (value) chain.setColor(value).run()
  else chain.unsetColor().run()
}

function sameColor(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase()
}

/**
 * 把选中文字设为预设色，空值则恢复正文默认色。
 *
 * @param value 预设色；null 表示恢复默认
 */
function pickColor(value: string | null) {
  onColor(value)
  colorOpen.value = false
}

/**
 * 打开系统取色框，确认后写入文字颜色。
 */
function openMoreColors() {
  const input = moreColorInput.value
  if (!input) return
  input.value = active.value.color || defaultTextColor
  input.click()
}

function onMoreColor(event: Event) {
  const input = event.target
  if (!(input instanceof HTMLInputElement) || !input.value) return
  pickColor(input.value)
}

function toggleBold() {
  editor.value?.chain().focus().toggleBold().run()
}

function toggleItalic() {
  editor.value?.chain().focus().toggleItalic().run()
}

function toggleUnderline() {
  editor.value?.chain().focus().toggleUnderline().run()
}

function toggleStrike() {
  editor.value?.chain().focus().toggleStrike().run()
}

function toggleBulletList() {
  editor.value?.chain().focus().toggleBulletList().run()
}

function toggleOrderedList() {
  editor.value?.chain().focus().toggleOrderedList().run()
}

function toggleQuote() {
  editor.value?.chain().focus().toggleBlockquote().run()
}

function align(value: TextAlignValue) {
  editor.value?.chain().focus().setTextAlign(value).run()
  alignOpen.value = false
}

function insertRule() {
  editor.value?.chain().focus().setHorizontalRule().run()
}

function resetTableHover() {
  tableHover.value = { rows: 0, cols: 0 }
}

function hoverTable(rows: number, cols: number) {
  tableHover.value = { rows, cols }
}

function tableCellPicked(row: number, col: number): boolean {
  return tableHover.value.rows > 0 && row <= tableHover.value.rows && col <= tableHover.value.cols
}

function clampTableSize(value: number): number {
  if (!Number.isFinite(value)) return tableSizeMin
  return Math.min(tableSizeMax, Math.max(tableSizeMin, Math.round(value)))
}

/**
 * 在光标处插入一张表格。格子点选和自定义行列都走这里。
 *
 * @param rows 行数
 * @param cols 列数
 */
function insertTable(rows: number, cols: number) {
  editor.value
    ?.chain()
    .focus()
    .insertTable({ rows: clampTableSize(rows), cols: clampTableSize(cols), withHeaderRow: false })
    .run()
  tableOpen.value = false
  tableCustomOpen.value = false
}

/**
 * 在当前行的上方或下方插入一整行。
 *
 * @param where 插在当前行上面还是下面
 */
function insertTableRow(where: 'before' | 'after') {
  const current = editor.value
  if (!current) return
  const chain = current.chain().focus()
  if (where === 'before') chain.addRowBefore().run()
  else chain.addRowAfter().run()
}

/**
 * 在当前列的左侧或右侧插入一整列。
 *
 * @param where 插在当前列左边还是右边
 */
function insertTableColumn(where: 'before' | 'after') {
  const current = editor.value
  if (!current) return
  const chain = current.chain().focus()
  if (where === 'before') chain.addColumnBefore().run()
  else chain.addColumnAfter().run()
}

/**
 * 删掉选中单元格所在的行。框选多格时删掉选区盖住的每一行；盖住全部行时，删掉这张表。
 */
function deleteTableRow() {
  const current = editor.value
  if (!current) return
  const chain = current.chain().focus()
  if (current.can().deleteRow()) chain.deleteRow().run()
  else chain.deleteTable().run()
}

/**
 * 删掉选中单元格所在的列。框选多格时删掉选区盖住的每一列；盖住全部列时，删掉这张表。
 */
function deleteTableColumn() {
  const current = editor.value
  if (!current) return
  const chain = current.chain().focus()
  if (current.can().deleteColumn()) chain.deleteColumn().run()
  else chain.deleteTable().run()
}

/** 删掉光标所在的整张表格。 */
function deleteCurrentTable() {
  editor.value?.chain().focus().deleteTable().run()
}

function openCustomTable() {
  customRows.value = tableHover.value.rows || 2
  customCols.value = tableHover.value.cols || 2
  tableOpen.value = false
  tableCustomOpen.value = true
}

function asChoice(value: string | number | boolean) {
  return String(value)
}

const headingScrollGap = 12

/**
 * 滚到第 index 个标题。序号和目录树一致，空标题也占位。
 * 格式栏吸顶时，把标题停在栏的下方。
 *
 * @param index 标题在正文里的序号
 */
function scrollToHeading(index: number): void {
  const root = editor.value?.view.dom
  const heading = root?.querySelectorAll('h1, h2, h3, h4')[index]
  if (!(heading instanceof HTMLElement)) return
  const main = document.getElementById('main')
  if (!main) {
    heading.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }
  const toolbar = root?.closest('.grammar-editor')?.querySelector('.toolbar')
  const toolbarHeight = toolbar instanceof HTMLElement ? toolbar.offsetHeight : 0
  const top =
    heading.getBoundingClientRect().top -
    main.getBoundingClientRect().top +
    main.scrollTop -
    toolbarHeight -
    headingScrollGap
  main.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
}

defineExpose({ scrollToHeading })
</script>

<template>
  <div class="grammar-editor" :class="{ 'is-editing': editable }">
    <div v-if="editable" class="toolbar" role="toolbar" :aria-label="toolbarLabel">
      <el-select
        class="choice choice-block"
        :model-value="active.block"
        aria-label="段落样式"
        @change="onBlock(asChoice($event))"
      >
        <el-option v-for="option in blockOptions" :key="option.value" :label="option.label" :value="option.value" />
      </el-select>
      <el-select
        class="choice choice-font"
        :model-value="active.font"
        aria-label="字体"
        @change="onFont(asChoice($event))"
      >
        <el-option v-for="option in fontOptions" :key="option.label" :label="option.label" :value="option.value" />
      </el-select>
      <el-select
        class="choice choice-size"
        :model-value="active.size"
        aria-label="字号"
        @change="onFontSize(asChoice($event))"
      >
        <el-option
          v-for="option in fontSizeOptions"
          :key="option.label"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
      <el-popover
        v-model:visible="colorOpen"
        trigger="click"
        placement="bottom-start"
        :width="248"
        popper-class="grammar-color-popper"
      >
        <template #reference>
          <button type="button" class="tool color-trigger" aria-label="文字颜色" :aria-expanded="colorOpen" @mousedown.prevent>
            <span class="color-chip" :style="{ background: active.color || defaultTextColor }" />
          </button>
        </template>
        <div class="color-panel" @mousedown.prevent>
          <button type="button" class="color-default" :class="{ 'is-current': active.color === '' }" @click="pickColor(null)">
            <span class="swatch swatch-default" />
            默认颜色
          </button>
          <div class="color-grid">
            <button
              v-for="color in colorPresets"
              :key="color"
              type="button"
              class="swatch"
              :class="{ 'is-current': sameColor(color, active.color) }"
              :style="{ background: color }"
              :aria-label="`文字颜色 ${color}`"
              @click="pickColor(color)"
            />
          </div>
          <button type="button" class="color-more" @click="openMoreColors">更多颜色</button>
          <input ref="moreColorInput" class="color-native" type="color" tabindex="-1" aria-hidden="true" @change="onMoreColor" />
        </div>
      </el-popover>

      <button type="button" class="tool" :class="{ 'is-active': active.bold }" aria-label="加粗" :aria-pressed="active.bold" @mousedown.prevent @click="toggleBold">B</button>
      <button type="button" class="tool tool-italic" :class="{ 'is-active': active.italic }" aria-label="斜体" :aria-pressed="active.italic" @mousedown.prevent @click="toggleItalic">I</button>
      <button type="button" class="tool tool-underline" :class="{ 'is-active': active.underline }" aria-label="下划线" :aria-pressed="active.underline" @mousedown.prevent @click="toggleUnderline">U</button>
      <button type="button" class="tool tool-strike" :class="{ 'is-active': active.strike }" aria-label="删除线" :aria-pressed="active.strike" @mousedown.prevent @click="toggleStrike">S</button>

      <button type="button" class="tool" :class="{ 'is-active': editor?.isActive('bulletList') }" aria-label="无序列表" @mousedown.prevent @click="toggleBulletList">列表</button>
      <button type="button" class="tool" :class="{ 'is-active': editor?.isActive('orderedList') }" aria-label="有序列表" @mousedown.prevent @click="toggleOrderedList">编号</button>
      <button type="button" class="tool" :class="{ 'is-active': active.quote }" aria-label="引用" :aria-pressed="active.quote" @mousedown.prevent @click="toggleQuote">引用</button>
      <el-popover
        v-model:visible="alignOpen"
        trigger="click"
        placement="bottom-start"
        :width="148"
        popper-class="grammar-align-popper"
      >
        <template #reference>
          <button type="button" class="tool align-trigger" aria-label="对齐" :aria-expanded="alignOpen" @mousedown.prevent>
            <svg class="align-icon" viewBox="0 0 16 16" aria-hidden="true">
              <path
                v-for="(width, index) in alignIconWidths[active.align]"
                :key="index"
                :d="alignLine(active.align, width, 2.5 + index * 3.6)"
                fill="none"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linecap="round"
              />
            </svg>
            <span class="align-caret" />
          </button>
        </template>
        <div class="align-menu" role="menu" @mousedown.prevent>
          <button
            v-for="option in alignOptions"
            :key="option.value"
            type="button"
            class="align-option"
            role="menuitemradio"
            :aria-checked="active.align === option.value"
            :class="{ 'is-current': active.align === option.value }"
            @click="align(option.value)"
          >
            <svg class="align-icon" viewBox="0 0 16 16" aria-hidden="true">
              <path
                v-for="(width, index) in alignIconWidths[option.value]"
                :key="index"
                :d="alignLine(option.value, width, 2.5 + index * 3.6)"
                fill="none"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linecap="round"
              />
            </svg>
            {{ option.label }}
          </button>
        </div>
      </el-popover>
      <el-popover
        v-model:visible="tableOpen"
        trigger="click"
        placement="bottom-start"
        :width="214"
        popper-class="grammar-table-popper"
        @show="resetTableHover"
      >
        <template #reference>
          <button type="button" class="tool" aria-label="表格" :aria-expanded="tableOpen" @mousedown.prevent>表格</button>
        </template>
        <div class="table-picker" @mousedown.prevent @mouseleave="resetTableHover">
          <p class="table-picker-label">{{ tableHoverLabel }}</p>
          <div class="table-grid">
            <button
              v-for="cell in tableCells"
              :key="`${cell.row}-${cell.col}`"
              type="button"
              class="table-dot"
              :class="{ 'is-picked': tableCellPicked(cell.row, cell.col) }"
              :aria-label="`${cell.col}×${cell.row} 表格`"
              @mouseenter="hoverTable(cell.row, cell.col)"
              @click="insertTable(cell.row, cell.col)"
            />
          </div>
          <button type="button" class="table-custom" @click="openCustomTable">自定义</button>
        </div>
      </el-popover>
      <button type="button" class="tool" aria-label="分割线" @mousedown.prevent @click="insertRule">分割线</button>
    </div>
    <EditorContent :editor="editor" />
    <Teleport to="body">
      <div
        v-if="tableMenu"
        class="table-menu"
        role="menu"
        :style="{ left: `${tableMenu.x}px`, top: `${tableMenu.y}px` }"
        @mousedown.prevent
      >
        <template v-if="!tableMenuMultiple">
          <button
            v-for="item in tableMenuInsert"
            :key="item.action"
            type="button"
            role="menuitem"
            @click="chooseTableMenu(item.action)"
          >
            {{ item.label }}
          </button>
          <div class="table-menu-line" role="separator" />
        </template>
        <button
          v-for="item in tableMenuRemove"
          :key="item.action"
          type="button"
          role="menuitem"
          @click="chooseTableMenu(item.action)"
        >
          {{ item.label }}
        </button>
        <template v-if="!tableMenuMultiple">
          <div class="table-menu-line" role="separator" />
          <button
            v-for="item in tableMenuTable"
            :key="item.action"
            type="button"
            role="menuitem"
            @click="chooseTableMenu(item.action)"
          >
            {{ item.label }}
          </button>
        </template>
      </div>
    </Teleport>
    <el-dialog v-model="tableCustomOpen" title="插入表格" width="360px" append-to-body class="grammar-table-dialog">
      <p class="table-size-title">表格大小</p>
      <div class="table-size-box">
        <label class="table-size-row">
          行数
          <el-input-number v-model="customRows" :min="tableSizeMin" :max="tableSizeMax" />
        </label>
        <label class="table-size-row">
          列数
          <el-input-number v-model="customCols" :min="tableSizeMin" :max="tableSizeMax" />
        </label>
      </div>
      <template #footer>
        <el-button @click="tableCustomOpen = false">取消</el-button>
        <el-button type="primary" @click="insertTable(customRows, customCols)">好</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.grammar-editor {
  background: #fbf8f3;
  border: 1px solid #e4ddd2;
  border-radius: 8px;
}

.grammar-editor.is-editing:focus-within {
  border-color: #9f3d2f;
}

.toolbar {
  position: sticky;
  /* 主区上内边距是 20px。顶到 0 时正文会从这条缝里露出来。 */
  top: -20px;
  z-index: 4;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #fbf8f3;
  border-bottom: 1px solid #e4ddd2;
  box-shadow: 0 8px 12px -12px rgb(28 25 23 / 45%);
}

.choice {
  width: 108px;
}

.choice-block {
  width: 124px;
}

.choice-font {
  width: 132px;
}

.choice-size {
  width: 88px;
}

.color-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  padding: 0;
}

.color-chip {
  width: 16px;
  height: 16px;
  border: 1px solid #d6d3d1;
  border-radius: 2px;
}

.color-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.color-default,
.color-more {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 28px;
  padding: 0 6px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: #1c1917;
  font: inherit;
  font-size: 13px;
  line-height: 1;
  text-align: left;
  cursor: pointer;
}

.color-more {
  border-color: #e4ddd2;
}

.color-default:hover,
.color-more:hover,
.color-default.is-current {
  background: #f3f4f6;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(10, 18px);
  gap: 4px;
}

.swatch {
  width: 18px;
  height: 18px;
  padding: 0;
  border: 1px solid rgb(0 0 0 / 12%);
  border-radius: 2px;
  cursor: pointer;
}

.swatch-default {
  background: #000;
}

.swatch.is-current,
.color-default.is-current .swatch-default {
  outline: 2px solid #1c1917;
  outline-offset: 1px;
}

.color-native {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.tool {
  height: 32px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: #1c1917;
  font: inherit;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}

.tool-italic {
  font-style: italic;
}

.tool-underline {
  text-decoration: underline;
}

.tool-strike {
  text-decoration: line-through;
}

.align-trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
}

.align-icon {
  width: 16px;
  height: 16px;
  display: block;
}

.align-caret {
  width: 0;
  height: 0;
  border-top: 4px solid currentColor;
  border-right: 3px solid transparent;
  border-left: 3px solid transparent;
}

.align-menu {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.align-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: #1c1917;
  font: inherit;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
}

.align-option:hover,
.align-option.is-current {
  border-color: #9f3d2f;
  background: #f7eeeb;
}

:global(.grammar-align-popper.el-popover.el-popper) {
  padding: 4px;
}

.tool.is-active {
  background: #f7eeeb;
  color: #9f3d2f;
}

.tool:disabled {
  color: #a8a29e;
  cursor: default;
}

.tool:focus-visible {
  outline: 2px solid #9f3d2f;
  outline-offset: 2px;
}

.grammar-editor :deep(.tiptap) {
  min-height: 120px;
  padding: 18px 22px 28px;
  outline: none;
  color: #1c1917;
  font-family: 'Microsoft YaHei', '微软雅黑', 'PingFang SC', 'Yu Gothic', YuGothic, sans-serif;
  font-size: 16px;
  line-height: 1.8;
  word-break: break-word;
}

.grammar-editor.is-editing :deep(.tiptap) {
  min-height: 320px;
}

.grammar-editor :deep(.tiptap p) {
  margin: 0.35em 0;
}

.grammar-editor :deep(.tiptap h1),
.grammar-editor :deep(.tiptap h2),
.grammar-editor :deep(.tiptap h3),
.grammar-editor :deep(.tiptap h4) {
  font-weight: 700;
  line-height: 1.4;
}

.grammar-editor :deep(.tiptap h1) {
  margin: 1.2em 0 0.4em;
  font-size: 26px;
}

.grammar-editor :deep(.tiptap h2) {
  margin: 1.1em 0 0.35em;
  font-size: 22px;
}

.grammar-editor :deep(.tiptap h3) {
  margin: 0.95em 0 0.3em;
  font-size: 18px;
}

.grammar-editor :deep(.tiptap h4) {
  margin: 0.8em 0 0.25em;
  font-size: 16px;
}

.grammar-editor :deep(.tiptap ul),
.grammar-editor :deep(.tiptap ol) {
  margin: 0.4em 0;
  padding-left: 1.4em;
}

.grammar-editor :deep(.tiptap blockquote) {
  margin: 0.7em 0;
  padding: 0.05em 0 0.05em 0.9em;
  border-left: 3px solid #d4d4d4;
  color: #6b6b6b;
}

.table-picker-label {
  margin: 0 0 8px;
  color: #1c1917;
  font-size: 13px;
  line-height: 1.4;
}

.table-grid {
  display: grid;
  grid-template-columns: repeat(10, 16px);
  gap: 3px;
}

.table-dot {
  width: 16px;
  height: 16px;
  padding: 0;
  border: 1px solid #d6d3d1;
  border-radius: 2px;
  background: #fff;
  cursor: pointer;
}

.table-dot.is-picked {
  border-color: #9f3d2f;
  background: #f7eeeb;
}

.table-custom {
  width: 100%;
  height: 28px;
  margin-top: 8px;
  border: 1px solid #e4ddd2;
  border-radius: 4px;
  background: transparent;
  color: #1c1917;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.table-custom:hover {
  background: #f3f4f6;
}

.table-size-title {
  margin: 0 0 8px;
  color: #1c1917;
  font-size: 14px;
}

.table-size-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid #e4ddd2;
  border-radius: 8px;
}

.table-size-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #1c1917;
  font-size: 14px;
}

.grammar-editor :deep(.tiptap .tableWrapper) {
  margin: 0.8em 0;
  overflow-x: auto;
}

.grammar-editor :deep(.tiptap table) {
  width: 100%;
  margin: 0.8em 0;
  border-collapse: collapse;
  table-layout: fixed;
  overflow: hidden;
}

.grammar-editor :deep(.tiptap .tableWrapper table) {
  margin: 0;
}

.grammar-editor :deep(.tiptap th),
.grammar-editor :deep(.tiptap td) {
  position: relative;
  min-width: 48px;
  border: 1px solid #d6d3d1;
  padding: 6px 8px;
  vertical-align: top;
  box-sizing: border-box;
}

.grammar-editor :deep(.tiptap .column-resize-handle) {
  position: absolute;
  top: 0;
  right: -2px;
  bottom: -2px;
  z-index: 2;
  width: 4px;
  background: #9f3d2f;
  pointer-events: none;
}

.grammar-editor :deep(.tiptap.resize-cursor) {
  cursor: col-resize;
}

.table-menu {
  position: fixed;
  z-index: 20;
  min-width: 168px;
  padding: 4px;
  border: 1px solid #e4ddd2;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 24px rgb(28 25 23 / 12%);
}

.table-menu button {
  display: block;
  width: 100%;
  padding: 6px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #1c1917;
  font: inherit;
  font-size: 14px;
  line-height: 20px;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}

.table-menu-line {
  height: 1px;
  margin: 4px 6px;
  background: #e4ddd2;
}

.table-menu button:hover {
  background: #f7eeeb;
}

.grammar-editor :deep(.tiptap th p),
.grammar-editor :deep(.tiptap td p) {
  margin: 0;
}

.grammar-editor :deep(.tiptap .selectedCell) {
  background: #f7eeeb;
}

.grammar-editor :deep(.tiptap hr) {
  margin: 1.1em 0;
  border: none;
  border-top: 1px solid #e4ddd2;
}

:global(.grammar-color-popper.el-popover.el-popper) {
  padding: 8px 10px 10px;
}

:global(.grammar-table-popper.el-popover.el-popper) {
  padding: 10px;
}

.grammar-editor :deep(.tiptap p.is-editor-empty:first-child::before) {
  float: left;
  height: 0;
  color: #a8a29e;
  content: attr(data-placeholder);
  pointer-events: none;
}
</style>
