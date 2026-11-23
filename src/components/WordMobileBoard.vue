<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { Close, Filter, Hide, Microphone, Notebook, Search } from '@element-plus/icons-vue'
import type { BookMeta, Word } from '@/types/word'
import type { VoiceOption } from '@/utils/speech'
import { speakJapanese } from '@/utils/speech'
import { wordPages } from '@/utils/unitPages'
import { visibleDescribe } from '@/utils/wordDisplay'

/** 与单词本一致：不对应清单里的某一册。 */
const ALL_BOOKS = 'all'

/** 与单词本一致：不缩到某一个单元。 */
const ALL_UNITS = 0

/** 输入法组字时回车的 keyCode，只确认候选，不关闭搜索。 */
const IME_PROCESS_KEY = 229

/** 卡片每次多露出的条数。 */
const PAGE_SIZE = 12

const props = defineProps<{
  words: Word[]
  scopeKey: string
  books: BookMeta[]
  bookId: string
  unitId: number
  lessonId: number
  showChinese: boolean
  showJpWrite: boolean
  showJapanese: boolean
  voiceUri: string
  voiceOptions: VoiceOption[]
  hasJapaneseVoice: boolean
  query: string
}>()

const emit = defineEmits<{
  'apply-filter': [
    value: {
      bookId: string
      unitId: number
      lessonId: number
      showChinese: boolean
      showJpWrite: boolean
      showJapanese: boolean
      voiceUri: string
    },
  ]
  search: [query: string]
}>()

const visibleCount = ref(PAGE_SIZE)
const maskOn = ref(false)
const revealed = ref<string[]>([])
const searchOpen = ref(false)
const searchDraft = ref('')
const filterOpen = ref(false)
const drawerMode = ref<'course' | 'filter'>('course')
const zoomedWrite = ref('')
const moreSentinel = ref<HTMLElement | null>(null)
let moreObserver: IntersectionObserver | null = null

const draftBookId = ref(ALL_BOOKS)
const draftUnitId = ref(ALL_UNITS)
const draftLessonId = ref(0)
const draftShowChinese = ref(true)
const draftShowJpWrite = ref(true)
const draftShowJapanese = ref(true)
const draftVoiceUri = ref('')

const shownWords = computed(() => props.words.slice(0, visibleCount.value))

const scopeLabel = computed(() => {
  const book = props.books.find((item) => item.code === props.bookId)
  const unit = book?.units.find((item) => item.unit === props.unitId)
  const lessonName =
    unit?.lessons.find((item) => item.lesson === props.lessonId)?.name ??
    wordPages(unit).find((item) => item.lesson === props.lessonId)?.name
  const parts = [book?.name ?? '全部册']
  if (props.bookId !== ALL_BOOKS) parts.push(unit?.name ?? '全部单元')
  if (props.bookId !== ALL_BOOKS && props.unitId !== ALL_UNITS) parts.push(lessonName ?? '全部课')
  return parts.join(' · ')
})

const draftUnits = computed(
  () => props.books.find((item) => item.code === draftBookId.value)?.units ?? [],
)

const draftLessons = computed(() => {
  const unit = draftUnits.value.find((item) => item.unit === draftUnitId.value)
  const choices = (unit?.lessons ?? []).map((lesson) => ({
    key: `lesson-${lesson.id}`,
    lesson: lesson.lesson,
    name: lesson.name,
  }))
  for (const page of wordPages(unit)) {
    choices.push({ key: `page-${page.id}`, lesson: page.lesson, name: page.name })
  }
  return choices
})

function closeZoom() {
  zoomedWrite.value = ''
}

function onZoomKey(event: KeyboardEvent) {
  if (event.key === 'Escape') closeZoom()
}

watch(zoomedWrite, (value) => {
  if (value) window.addEventListener('keydown', onZoomKey)
  else window.removeEventListener('keydown', onZoomKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onZoomKey)
  moreObserver?.disconnect()
})

watch(
  () => props.scopeKey,
  () => {
    visibleCount.value = PAGE_SIZE
    revealed.value = []
  },
)

function wordKey(word: Word) {
  return `${word.bookId}:${word.unit}:${word.lesson}:${word.fileIndex ?? ''}:${word.jp}:${word.cn}`
}

function isRevealed(word: Word) {
  return revealed.value.includes(wordKey(word))
}

/** 在遮住答案时切换这一条：点释义区露出，再点一次重新盖住。 */
function toggleReveal(word: Word) {
  const key = wordKey(word)
  if (revealed.value.includes(key)) {
    revealed.value = revealed.value.filter((item) => item !== key)
    return
  }
  revealed.value = [...revealed.value, key]
}

function showMore() {
  if (visibleCount.value >= props.words.length) return
  visibleCount.value = Math.min(props.words.length, visibleCount.value + PAGE_SIZE)
}

/** 哨兵还在主区可视范围里就再露出一批，直到它落到列表下面。 */
async function loadUntilBelowFold() {
  const el = moreSentinel.value
  if (!el || visibleCount.value >= props.words.length) return
  const root = document.getElementById('main')
  const rootBottom = root ? root.getBoundingClientRect().bottom : window.innerHeight
  if (el.getBoundingClientRect().top > rootBottom + 160) return
  const before = visibleCount.value
  showMore()
  if (visibleCount.value === before) return
  await nextTick()
  await loadUntilBelowFold()
}

function bindMoreObserver() {
  moreObserver?.disconnect()
  const el = moreSentinel.value
  if (!el) return
  moreObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadUntilBelowFold()
    },
    { root: document.getElementById('main'), rootMargin: '160px' },
  )
  moreObserver.observe(el)
}

watch(moreSentinel, () => bindMoreObserver())

function openSearch() {
  searchDraft.value = props.query
  searchOpen.value = true
}

function onSearchInput(event: Event) {
  const value = event.target instanceof HTMLInputElement ? event.target.value : ''
  searchDraft.value = value
  emit('search', value.trim())
}

function onSearchEnter(event: KeyboardEvent) {
  if (event.isComposing || event.key === 'Process' || event.keyCode === IME_PROCESS_KEY) return
  searchOpen.value = false
}

function clearSearch() {
  searchDraft.value = ''
  emit('search', '')
}

/** 顶栏选课只改册、单元、课；筛选只改显示和语音。打开时先抄上当前值，避免确定时把另一组清掉。 */
function openDrawer(mode: 'course' | 'filter') {
  drawerMode.value = mode
  draftBookId.value = props.bookId
  draftUnitId.value = props.unitId
  draftLessonId.value = props.lessonId
  draftShowChinese.value = props.showChinese
  draftShowJpWrite.value = props.showJpWrite
  draftShowJapanese.value = props.showJapanese
  draftVoiceUri.value = props.voiceUri
  filterOpen.value = true
}

function onDraftBook(nextBookId: string) {
  draftBookId.value = nextBookId
  if (nextBookId === ALL_BOOKS) {
    draftUnitId.value = ALL_UNITS
    draftLessonId.value = 0
    return
  }
  const book = props.books.find((item) => item.code === nextBookId)
  draftUnitId.value = book?.units[0]?.unit ?? ALL_UNITS
  draftLessonId.value = 0
}

function onDraftUnit(nextUnitId: number) {
  draftUnitId.value = nextUnitId
  draftLessonId.value = 0
}

function onDraftLesson(nextLessonId: number) {
  draftLessonId.value = nextLessonId
}

function resetDraft() {
  if (drawerMode.value === 'course') {
    draftBookId.value = ALL_BOOKS
    draftUnitId.value = ALL_UNITS
    draftLessonId.value = 0
    return
  }
  draftShowChinese.value = true
  draftShowJpWrite.value = true
  draftShowJapanese.value = true
}

function confirmFilter() {
  emit('apply-filter', {
    bookId: draftBookId.value,
    unitId: draftBookId.value === ALL_BOOKS ? ALL_UNITS : draftUnitId.value,
    lessonId: draftBookId.value === ALL_BOOKS || draftUnitId.value === ALL_UNITS ? 0 : draftLessonId.value,
    showChinese: draftShowChinese.value,
    showJpWrite: draftShowJpWrite.value,
    showJapanese: draftShowJapanese.value,
    voiceUri: draftVoiceUri.value,
  })
  filterOpen.value = false
}

function speak(word: Word) {
  speakJapanese(word.jp, props.voiceUri)
}

function speechOf(word: Word) {
  return word.part_of_speech.trim()
}
</script>

<template>
  <div class="board">
    <Teleport to="#words-mobile-tools">
      <button type="button" class="icon-button" :aria-label="`选课，${scopeLabel}`" @click="openDrawer('course')">
        <el-icon :size="20"><Notebook /></el-icon>
      </button>
      <button
        type="button"
        class="icon-button"
        :class="{ 'is-on': maskOn }"
        :aria-pressed="maskOn"
        :aria-label="maskOn ? '答案已遮住' : '遮住答案'"
        @click="maskOn = !maskOn"
      >
        <el-icon :size="20"><Hide /></el-icon>
      </button>
      <button type="button" class="icon-button" aria-label="搜索" @click="openSearch">
        <el-icon :size="20"><Search /></el-icon>
      </button>
      <button type="button" class="icon-button" aria-label="筛选" @click="openDrawer('filter')">
        <el-icon :size="20"><Filter /></el-icon>
      </button>
    </Teleport>

    <p v-if="query" class="query-row">
      <span>搜索「{{ query }}」</span>
      <button type="button" @click="clearSearch">清除</button>
    </p>
    <p v-if="!hasJapaneseVoice" class="hint">未检测到本机日语语音包，朗读会使用浏览器的日语语音。</p>
    <div class="count place">
      <button type="button" class="scope-mark" @click="openDrawer('course')">{{ scopeLabel }}</button>
      <span class="place-count">{{ words.length }} 个词</span>
    </div>

    <p v-if="words.length === 0" class="empty">这一范围没有单词。</p>

    <article v-for="word in shownWords" :key="wordKey(word)" class="card">
      <div class="card-top">
        <button
          v-if="showJpWrite && word.jp_write.trim()"
          type="button"
          class="write"
          :aria-label="`放大${word.jp_write}`"
          @click="zoomedWrite = word.jp_write"
        >
          {{ word.jp_write }}
        </button>
        <p v-else-if="showJpWrite" class="write as-text">{{ word.jp_write }}</p>
        <p v-else class="write as-text is-hidden">书写已隐藏</p>
        <button type="button" class="speak" aria-label="朗读" @click="speak(word)">
          <el-icon :size="18"><Microphone /></el-icon>
        </button>
      </div>

      <div class="answer-slot">
        <div class="answer" :class="{ 'is-concealed': maskOn && !isRevealed(word) }">
          <p v-if="showJapanese" class="kana">
            <span>{{ word.jp }}</span>
            <span v-if="word.scale" class="scale">{{ word.scale }}</span>
          </p>
          <p v-else class="kana is-hidden">假名已隐藏</p>
          <p v-if="showChinese" class="cn">
            {{ word.cn }}
            <span v-if="speechOf(word)" class="speech">[{{ speechOf(word) }}]</span>
          </p>
          <p v-else class="cn is-hidden">中文已隐藏</p>
          <p v-if="showChinese && visibleDescribe(word.describe)" class="describe">
            {{ visibleDescribe(word.describe) }}
          </p>
        </div>
        <button
          v-if="maskOn"
          type="button"
          class="cover"
          :class="{ 'is-clear': isRevealed(word) }"
          :aria-label="isRevealed(word) ? '再点一次遮住' : '显示答案'"
          @click="toggleReveal(word)"
        >
          <span v-if="!isRevealed(word)">显示答案</span>
        </button>
      </div>
    </article>

    <div v-if="visibleCount < words.length" ref="moreSentinel" class="more-sentinel" aria-hidden="true" />

    <div v-if="searchOpen" class="search-layer" role="dialog" aria-label="搜索中文释义">
      <div class="search-bar">
        <button type="button" class="icon-button" aria-label="关闭搜索" @click="searchOpen = false">
          <el-icon :size="20"><Close /></el-icon>
        </button>
        <input
          :value="searchDraft"
          class="search-input"
          placeholder="搜索中文释义"
          aria-label="按中文释义搜索"
          @input="onSearchInput"
          @keydown.enter="onSearchEnter"
        />
        <button v-if="searchDraft" type="button" class="text-button" @click="clearSearch">清空</button>
      </div>
      <p v-if="query" class="count">{{ words.length }} 条</p>
      <p v-else class="hint">输入释义。逗号、顿号、分号分开的每一义，以关键字开头才会出现。</p>
      <ul v-if="query" class="search-list">
        <li v-for="word in words" :key="wordKey(word)">
          <button type="button" @click="searchOpen = false">
            <span class="kana">
              <span>{{ word.jp }}</span>
              <span v-if="word.scale" class="scale">{{ word.scale }}</span>
            </span>
            <span>{{ word.cn }}</span>
          </button>
        </li>
      </ul>
    </div>

    <el-drawer
      v-model="filterOpen"
      direction="btt"
      size="86%"
      :title="drawerMode === 'course' ? '选课' : '筛选'"
      class="word-filter-drawer"
    >
      <template v-if="drawerMode === 'course'">
      <label class="field">
        <span>册</span>
        <el-select :model-value="draftBookId" @change="onDraftBook">
          <el-option label="全部" :value="ALL_BOOKS" />
          <el-option v-for="book in books" :key="book.code" :label="book.name" :value="book.code" />
        </el-select>
      </label>
      <label class="field">
        <span>单元</span>
        <el-select :model-value="draftUnitId" :disabled="draftBookId === ALL_BOOKS" @change="onDraftUnit">
          <el-option label="全部" :value="ALL_UNITS" />
          <el-option v-for="unit in draftUnits" :key="unit.unit" :label="unit.name" :value="unit.unit" />
        </el-select>
      </label>
      <label class="field">
        <span>课</span>
        <el-select
          :model-value="draftLessonId"
          :disabled="draftBookId === ALL_BOOKS || draftUnitId === ALL_UNITS"
          @change="onDraftLesson"
        >
          <el-option label="全部" :value="0" />
          <el-option v-for="lesson in draftLessons" :key="lesson.key" :label="lesson.name" :value="lesson.lesson" />
        </el-select>
      </label>
      </template>

      <template v-else>
      <div class="switch-row">
        <span>显示中文</span>
        <el-switch v-model="draftShowChinese" aria-label="显示或隐藏中文" />
      </div>
      <div class="switch-row">
        <span>显示日文</span>
        <el-switch v-model="draftShowJpWrite" aria-label="显示或隐藏日文" />
      </div>
      <div class="switch-row">
        <span>显示假名</span>
        <el-switch v-model="draftShowJapanese" aria-label="显示或隐藏假名" />
      </div>

      <label class="field">
        <span>语音</span>
        <el-select v-model="draftVoiceUri" clearable :placeholder="hasJapaneseVoice ? '选择语音' : '自动（日语）'">
          <el-option
            v-for="voice in voiceOptions"
            :key="voice.voiceURI"
            :label="`${voice.name} (${voice.lang})`"
            :value="voice.voiceURI"
          />
        </el-select>
      </label>
      </template>

      <div class="drawer-actions">
        <el-button @click="resetDraft">重置</el-button>
        <el-button type="primary" @click="confirmFilter">确定</el-button>
      </div>
    </el-drawer>

    <div
      v-if="zoomedWrite"
      class="zoom-layer"
      role="dialog"
      aria-label="放大日文书写"
      @click="closeZoom"
    >
      <p class="zoom-write">{{ zoomedWrite }}</p>
    </div>
  </div>
</template>

<style scoped>
.board {
  --m-orange: #f8882c;
  --m-green: #7cc48c;
  --m-ink: #2c2824;
  --m-muted: #8a8478;
  --m-line: #efe6d8;
  --m-cream: #f6f1e8;
  --m-mask: #5c5854;
  display: flex;
  flex-direction: column;
  gap: 12px;
  color: var(--m-ink);
}

.icon-button,
.speak,
.write,
.search-list button,
.text-button {
  font: inherit;
}

.icon-button,
.speak {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 999px;
  background: #fff;
  color: #2c2824;
  box-shadow: 0 1px 2px rgb(44 40 36 / 8%);
}

.speak {
  background: var(--m-green);
  color: #fff;
  box-shadow: none;
}

.icon-button.is-on {
  background: #f8882c;
  color: #fff;
  box-shadow: none;
}

.text-button {
  border: 0;
  border-radius: 999px;
  background: #fff;
  color: var(--m-ink);
}

.query-row,
.hint,
.count,
.empty {
  margin: 0;
  color: var(--m-muted);
  font-size: 13px;
  line-height: 1.5;
}

.place {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.place-count {
  flex: none;
  margin-left: auto;
}

.scope-mark {
  min-width: 0;
  overflow: hidden;
  margin: 0;
  padding: 2px 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: 1px solid #f8882c;
  border-radius: 999px;
  background: #fff;
  color: #f8882c;
  font: inherit;
  font-size: 13px;
  line-height: 1.5;
}

.query-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.query-row button {
  border: 0;
  background: transparent;
  color: var(--m-orange);
  font: inherit;
}

.card {
  padding: 16px;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 8px 24px rgb(92 72 40 / 6%);
}

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.write {
  flex: 1;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--m-ink);
  font-size: 32px;
  font-weight: 700;
  line-height: 1.3;
  text-align: left;
}

.write.as-text {
  cursor: default;
}

.answer-slot {
  position: relative;
  margin-top: 12px;
}

.answer.is-concealed {
  visibility: hidden;
}

.kana,
.cn,
.describe {
  display: block;
  margin: 0;
}

.kana {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  column-gap: 14px;
  color: #6f6a62;
  font-size: 16px;
}

.scale {
  color: #f8882c;
  letter-spacing: 0.08em;
}

.cn {
  margin-top: 4px;
  color: var(--m-ink);
  font-size: 16px;
  font-weight: 650;
}

.speech,
.describe,
.is-hidden {
  color: #b0a89c;
  font-weight: 400;
}

.describe {
  margin-top: 6px;
  font-size: 13px;
  white-space: pre-line;
}

.cover {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 14px;
  background: var(--m-mask);
  font: inherit;
}

.cover.is-clear {
  background: transparent;
}

.cover span {
  padding: 8px 18px;
  border-radius: 999px;
  background: #fff;
  color: #2c2824;
  font-size: 14px;
}

.more-sentinel {
  height: 1px;
}

.search-layer {
  position: fixed;
  z-index: 60;
  inset: 0;
  display: flex;
  flex-direction: column;
  padding: 12px 16px 24px;
  background: var(--m-cream);
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input {
  flex: 1;
  min-width: 0;
  height: 40px;
  padding: 0 12px;
  border: 0;
  border-radius: 12px;
  background: #fff;
  color: var(--m-ink);
  font: inherit;
  font-size: 16px;
}

.search-list {
  margin: 0;
  padding: 0;
  overflow: auto;
  list-style: none;
}

.search-list button {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  padding: 12px 4px;
  border: 0;
  border-bottom: 1px solid var(--m-line);
  background: transparent;
  color: var(--m-ink);
  text-align: left;
}

.field,
.switch-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
  color: var(--m-ink);
  font-size: 14px;
}

.switch-row {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.field :deep(.el-select) {
  width: 100%;
}

/* 手机浏览器聚焦字号小于 16px 的输入框会放大整页。下拉内部的输入框也要到 16px。 */
.field :deep(.el-select__wrapper),
.field :deep(.el-select__input) {
  font-size: 16px;
}

.drawer-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.drawer-actions :deep(.el-button) {
  flex: 1;
  height: 44px;
  border-radius: 12px;
}

.zoom-layer {
  position: fixed;
  z-index: 80;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px 20px;
  background: #f6f1e8;
}

.zoom-write {
  margin: 0;
  color: #2c2824;
  text-align: center;
  font-weight: 700;
  line-height: 1.2;
  font-size: clamp(80px, 26vw, 180px);
  overflow-wrap: anywhere;
}
</style>

<style>
.word-filter-drawer.el-drawer {
  --el-color-primary: #f8882c;
  --el-color-primary-light-3: #faa45a;
  --el-color-primary-light-5: #fbc48a;
  --el-color-primary-light-7: #fde0c4;
  --el-color-primary-light-9: #fff4ea;
  --el-color-primary-dark-2: #e06e14;
  --el-switch-on-color: #7cc48c;
  border-radius: 20px 20px 0 0;
  color: #2c2824;
  background: #fffdf9;
}

.word-filter-drawer .el-switch {
  --el-switch-on-color: #7cc48c;
}

.word-filter-drawer .el-button--primary {
  --el-button-bg-color: #f8882c;
  --el-button-border-color: #f8882c;
  --el-button-hover-bg-color: #faa45a;
  --el-button-hover-border-color: #faa45a;
  --el-button-active-bg-color: #e06e14;
  --el-button-active-border-color: #e06e14;
}

.word-filter-drawer .el-drawer__body {
  padding-top: 0;
  padding-bottom: 28px;
}
</style>
