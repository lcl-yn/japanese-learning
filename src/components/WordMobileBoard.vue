<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { Close, Memo, Microphone, MoreFilled } from '@element-plus/icons-vue'
import type { BookMeta, Word } from '@/types/word'
import type { VoiceOption } from '@/utils/speech'
import { unlockExamSounds } from '@/utils/examSound'
import { speakJapanese } from '@/utils/speech'
import { wordPages } from '@/utils/unitPages'
import { visibleDescribe } from '@/utils/wordDisplay'
import KanaExam from '@/components/KanaExam.vue'

/** 与单词本一致：不对应清单里的某一册。 */
const ALL_BOOKS = 'all'

/** 与单词本一致：不缩到某一个单元。 */
const ALL_UNITS = 0

/** 输入法组字时回车的 keyCode，只确认候选，不关闭搜索。 */
const IME_PROCESS_KEY = 229

/** 卡片每次多露出的条数。 */
const PAGE_SIZE = 12

/** 手机词表的列表或两列卡片，下次打开仍用上次的选择。 */
const LAYOUT_STORAGE_KEY = 'wordBoardLayout'

type BoardLayout = 'list' | 'grid'

const props = defineProps<{
  words: Word[]
  lexicon: Word[]
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
const menuOpen = ref(false)
const examOn = ref(false)
const missedOpen = ref(false)
const missedWords = ref<Word[]>([])
const examDone = ref(0)
const layout = ref<BoardLayout>(readBoardLayout())
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

/** 读上次的展示方式。缺省或无法识别时用一行一词的列表。 */
function readBoardLayout(): BoardLayout {
  try {
    return localStorage.getItem(LAYOUT_STORAGE_KEY) === 'grid' ? 'grid' : 'list'
  } catch {
    return 'list'
  }
}

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

function onMenuKey(event: KeyboardEvent) {
  if (event.key === 'Escape') menuOpen.value = false
}

watch(menuOpen, (open) => {
  if (open) window.addEventListener('keydown', onMenuKey)
  else window.removeEventListener('keydown', onMenuKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onZoomKey)
  window.removeEventListener('keydown', onMenuKey)
  moreObserver?.disconnect()
})

watch(
  () => props.scopeKey,
  () => {
    visibleCount.value = PAGE_SIZE
    revealed.value = []
  },
)

watch(examOn, (on) => {
  if (on) return
  missedOpen.value = false
  missedWords.value = []
  examDone.value = 0
})

/** 记下这一次答错的词。同一词再错一次不再重复列入。 */
function rememberMiss(word: Word) {
  const key = wordKey(word)
  if (missedWords.value.some((item) => wordKey(item) === key)) return
  missedWords.value = [...missedWords.value, word]
}

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

/** 记下展示方式并收起菜单。写不进本机时，这一次打开仍按刚选的来。 */
function chooseLayout(next: BoardLayout) {
  layout.value = next
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, next)
  } catch {
    /* 这一次打开仍然按刚选的来。 */
  }
  menuOpen.value = false
}

function openFromMenu(action: 'course' | 'filter' | 'search' | 'mask') {
  menuOpen.value = false
  if (action === 'course') openDrawer('course')
  else if (action === 'filter') openDrawer('filter')
  else if (action === 'search') openSearch()
  else maskOn.value = !maskOn.value
}

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

/** 打开考试时先唤醒音频通道，点选项才能直接播已经解码的提示音。 */
function toggleExam() {
  examOn.value = !examOn.value
  if (examOn.value) unlockExamSounds()
}

/** 朗读这一条的日文书写。 */
function speak(word: Word) {
  speakJapanese(word.jp_write.trim(), props.voiceUri)
}

function speechOf(word: Word) {
  return word.part_of_speech.trim()
}
</script>

<template>
  <div class="board">
    <Teleport to="#words-mobile-tools">
      <button
        v-if="examOn"
        type="button"
        class="icon-button"
        :class="{ 'is-on': missedOpen }"
        aria-label="错题本"
        :aria-pressed="missedOpen"
        @click="missedOpen = !missedOpen"
      >
        <el-icon :size="20"><Memo /></el-icon>
        <span v-if="missedWords.length" class="miss-count">{{ missedWords.length }}</span>
      </button>
      <button
        type="button"
        class="icon-button is-recite"
        :class="{ 'is-on': examOn }"
        aria-label="考试"
        :aria-pressed="examOn"
        @click="toggleExam"
      >
        <svg class="recite-mark" viewBox="0 0 32 32" aria-hidden="true">
          <path
            fill="#c8f3ee"
            d="M6.2 22.4c1.4 2.6 5 4 9.8 3.2 4.8.8 8.4-.6 9.8-3.2-.8 1.6-4.2 3.2-9.8 2.6-5.6.6-9-.8-9.8-2.6z"
          />
          <path
            fill="#fffdf8"
            stroke="#14b8a6"
            stroke-width="1.7"
            stroke-linejoin="round"
            d="M5.6 12.2c.3-2.4 2.5-3.6 5.4-3L15.2 10.4v12.8c-2.8.7-6.8.1-8.4-1.5-.8-.8-1.2-7.2-1.2-9.5z"
          />
          <path
            fill="#fffdf8"
            stroke="#14b8a6"
            stroke-width="1.7"
            stroke-linejoin="round"
            d="M16.8 10.4l4.4-1.2c2.8-.6 5.2.6 5.4 3 .2 2.4-.2 8.6-1.2 9.5-1.6 1.6-5.6 2.2-8.6 1.5V10.4z"
          />
          <path fill="none" stroke="#14b8a6" stroke-width="1.7" stroke-linecap="round" d="M16 10.6v12.6" />
          <path
            fill="none"
            stroke="#e6d9c8"
            stroke-width="1.35"
            stroke-linecap="round"
            d="M8.2 14h5M8.2 16.7h3.6M8.2 19.3h4.4"
          />
          <path
            fill="#f6b429"
            stroke="#f8882c"
            stroke-width="0.6"
            stroke-linejoin="round"
            d="M22.4 13.2l1 2.3 2.5.2-1.9 1.6.6 2.4-2.2-1.3-2.2 1.3.6-2.4-1.9-1.6 2.5-.2z"
          />
          <path
            fill="#f6b429"
            d="M25.8 7.4l.45 1.05 1.1.1-.85.75.28 1.1-.98-.58-.98.58.28-1.1-.85-.75 1.1-.1z"
          />
        </svg>
      </button>
      <button
        type="button"
        class="icon-button"
        :class="{ 'is-on': menuOpen }"
        aria-label="更多"
        aria-haspopup="dialog"
        :aria-expanded="menuOpen"
        @click="menuOpen = !menuOpen"
      >
        <el-icon :size="20"><MoreFilled /></el-icon>
      </button>
    </Teleport>

    <div v-if="menuOpen" class="more-layer" @click="menuOpen = false">
      <div class="more-menu" role="dialog" aria-label="更多" @click.stop>
        <div class="layout-switch" role="group" aria-label="展示方式">
          <button
            type="button"
            :class="{ 'is-on': layout === 'list' }"
            :aria-pressed="layout === 'list'"
            @click="chooseLayout('list')"
          >
            <svg class="toon" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3.4" y="4" width="17.2" height="4" rx="2" fill="#fffdf8" stroke="#14b8a6" stroke-width="1.5" />
              <rect x="3.4" y="10" width="17.2" height="4" rx="2" fill="#fff7e6" stroke="#14b8a6" stroke-width="1.5" />
              <rect x="3.4" y="16" width="17.2" height="4" rx="2" fill="#fffdf8" stroke="#14b8a6" stroke-width="1.5" />
              <circle cx="6.4" cy="12" r="1.15" fill="#f8882c" />
            </svg>
            列表
          </button>
          <button
            type="button"
            :class="{ 'is-on': layout === 'grid' }"
            :aria-pressed="layout === 'grid'"
            @click="chooseLayout('grid')"
          >
            <svg class="toon" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3.2" y="3.2" width="7.2" height="7.2" rx="2.2" fill="#fffdf8" stroke="#14b8a6" stroke-width="1.5" />
              <rect x="13.6" y="3.2" width="7.2" height="7.2" rx="2.2" fill="#f6b429" stroke="#f8882c" stroke-width="1.4" />
              <rect x="3.2" y="13.6" width="7.2" height="7.2" rx="2.2" fill="#fffdf8" stroke="#14b8a6" stroke-width="1.5" />
              <rect x="13.6" y="13.6" width="7.2" height="7.2" rx="2.2" fill="#fffdf8" stroke="#14b8a6" stroke-width="1.5" />
            </svg>
            卡片
          </button>
        </div>
        <button type="button" class="more-item" @click="openFromMenu('course')">
          <svg class="toon" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="5" y="3.2" width="14" height="17.4" rx="3" fill="#fffdf8" stroke="#14b8a6" stroke-width="1.5" />
            <path fill="none" stroke="#e6d9c8" stroke-width="1.3" stroke-linecap="round" d="M8.2 8.2h7.4M8.2 11.4h5.2" />
            <path fill="#f6b429" stroke="#f8882c" stroke-width="0.6" stroke-linejoin="round" d="M13.6 3.2h3.4v6.4l-1.7-1.3-1.7 1.3z" />
          </svg>
          <span>选课</span>
        </button>
        <button
          type="button"
          class="more-item"
          :class="{ 'is-on': maskOn }"
          :aria-pressed="maskOn"
          @click="openFromMenu('mask')"
        >
          <svg class="toon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#fffdf8"
              stroke="#14b8a6"
              stroke-width="1.5"
              stroke-linejoin="round"
              d="M3 12.2c2.4-3.5 5.2-5.2 9-5.2s6.6 1.7 9 5.2c-2.4 3.5-5.2 5.2-9 5.2s-6.6-1.7-9-5.2z"
            />
            <circle cx="12" cy="12.2" r="2.15" fill="#f6b429" stroke="#f8882c" stroke-width="0.7" />
            <path fill="#c8f3ee" stroke="#14b8a6" stroke-width="1.2" stroke-linejoin="round" d="M4.4 9.4c2-1.8 4.6-2.6 7.6-2.6s5.6.8 7.6 2.6c-.6 1.1-3.2.2-7.6.2s-7 .9-7.6-.2z" />
          </svg>
          <span>{{ maskOn ? '答案已遮住' : '遮住答案' }}</span>
        </button>
        <button type="button" class="more-item" @click="openFromMenu('search')">
          <svg class="toon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="10.4" cy="10.4" r="5.2" fill="#fffdf8" stroke="#14b8a6" stroke-width="1.6" />
            <circle cx="8.9" cy="9.1" r="1.25" fill="#f6b429" />
            <path fill="none" stroke="#14b8a6" stroke-width="1.8" stroke-linecap="round" d="M14.3 14.3 19 19" />
          </svg>
          <span>搜索</span>
        </button>
        <button type="button" class="more-item" @click="openFromMenu('filter')">
          <svg class="toon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#fffdf8"
              stroke="#14b8a6"
              stroke-width="1.5"
              stroke-linejoin="round"
              d="M4 5.2h16l-5.6 6.4v4.6l-4.8 2.1V11.6z"
            />
            <circle cx="17.4" cy="17.6" r="1.7" fill="#f8882c" />
          </svg>
          <span>筛选</span>
        </button>
      </div>
    </div>

    <p v-if="query" class="query-row">
      <span>搜索「{{ query }}」</span>
      <button type="button" @click="clearSearch">清除</button>
    </p>
    <p v-if="!hasJapaneseVoice" class="hint">未检测到本机日语语音包，朗读会使用浏览器的日语语音。</p>
    <div class="count place">
      <button v-if="!missedOpen" type="button" class="scope-mark" @click="openDrawer('course')">{{ scopeLabel }}</button>
      <span v-else class="scope-mark">{{ scopeLabel }}</span>
      <span v-if="examOn && missedOpen" class="place-count">{{ missedWords.length }} 个错词</span>
      <span
        v-else-if="examOn"
        class="place-count"
        :aria-label="`已考 ${examDone}，共 ${words.length}`"
      >{{ examDone }} / {{ words.length }}</span>
      <span v-else class="place-count">{{ words.length }} 个词</span>
    </div>

    <KanaExam
      v-if="examOn"
      v-show="!missedOpen"
      :words="words"
      :lexicon="lexicon"
      @miss="rememberMiss"
      @progress="examDone = $event"
    />
    <section v-if="examOn && missedOpen" class="missed" aria-label="错题本">
      <p v-if="missedWords.length === 0" class="empty">还没有答错的单词。</p>
      <article v-for="word in missedWords" :key="wordKey(word)" class="card">
        <p class="write as-text">{{ word.jp_write.trim() || word.jp }}</p>
        <div class="answer">
          <p class="kana">
            <span>{{ word.jp }}</span>
            <span v-if="word.scale" class="scale">{{ word.scale }}</span>
          </p>
          <p class="cn">
            {{ word.cn }}
            <span v-if="speechOf(word)" class="speech">[{{ speechOf(word) }}]</span>
          </p>
          <p v-if="visibleDescribe(word.describe)" class="describe">{{ visibleDescribe(word.describe) }}</p>
        </div>
      </article>
    </section>

    <template v-if="!examOn">
    <p v-if="words.length === 0" class="empty">这一范围没有单词。</p>

    <div class="cards" :class="{ 'is-grid': layout === 'grid' }">
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
          <p v-if="layout === 'list' && showChinese && visibleDescribe(word.describe)" class="describe">
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
    </div>

    <div v-if="visibleCount < words.length" ref="moreSentinel" class="more-sentinel" aria-hidden="true" />
    </template>

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
  position: relative;
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

.miss-count {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: #e14b4b;
  color: #fff;
  font-size: 11px;
  line-height: 16px;
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

.icon-button.is-recite.is-on {
  background: #fff;
  box-shadow: 0 0 0 2px #f8882c;
}

.recite-mark {
  display: block;
  width: 28px;
  height: 28px;
}

.toon {
  display: block;
  flex: none;
  width: 22px;
  height: 22px;
}

.more-layer {
  position: fixed;
  z-index: 54;
  inset: 0;
}

.more-menu {
  position: fixed;
  z-index: 55;
  top: 60px;
  right: 16px;
  width: 220px;
  padding: 10px;
  border-radius: 16px;
  background: #fffdf9;
  box-shadow: 0 12px 32px rgb(44 40 36 / 16%);
}

.layout-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 6px;
}

.layout-switch button,
.more-item {
  border: 0;
  background: transparent;
  color: var(--m-ink);
  font: inherit;
}

.layout-switch button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 8px;
  border: 1px solid var(--m-line);
  border-radius: 12px;
  color: var(--m-muted);
  font-size: 13px;
}

.layout-switch button.is-on {
  border-color: var(--m-orange);
  background: #fff7f0;
  color: var(--m-orange);
}

.more-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 8px;
  border-radius: 10px;
  text-align: left;
}

.more-item.is-on {
  color: var(--m-orange);
}

.missed,
.cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.missed .answer {
  margin-top: 12px;
}

.cards.is-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.cards.is-grid .card {
  min-width: 0;
  padding: 12px;
}

.cards.is-grid .card-top {
  gap: 6px;
}

.cards.is-grid .write {
  font-size: 22px;
  overflow-wrap: anywhere;
}

.cards.is-grid .speak {
  flex: none;
  width: 32px;
  height: 32px;
}

.cards.is-grid .answer-slot {
  margin-top: 8px;
}

.cards.is-grid .kana,
.cards.is-grid .cn {
  font-size: 14px;
  overflow-wrap: anywhere;
}

.cards.is-grid .kana {
  column-gap: 6px;
}

.cards.is-grid .cover span {
  padding: 6px 10px;
  font-size: 13px;
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
