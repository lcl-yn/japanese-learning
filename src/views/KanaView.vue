<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Close } from '@element-plus/icons-vue'
import KanaChart from '@/components/KanaChart.vue'
import { dakuonChart, hiraganaChart, youonChart } from '@/data/kana'
import {
  collectQuestions,
  generateQuestion,
  splitReading,
  type NumberQuestion,
  type QuestionType,
} from '@/utils/numberQuestion'
import { phoneLayout } from '@/utils/phoneLayout'
import { loadVoices, type VoiceOption } from '@/utils/speech'
import { KANA_DESCRIPTION } from '@/utils/seo'

const voiceOptions = ref<VoiceOption[]>([])
const selectedVoiceUri = ref('')
const hasJapaneseVoice = ref(false)

/** 五十音页一次只显示一项。再加知识点时在这里加一条，并在模板里按 id 显示。 */
const kanaSections = [
  { id: 'chart', label: '五十音' },
  { id: 'marks', label: '符号' },
  { id: 'pitch', label: '高低音' },
  { id: 'counter', label: '量词' },
] as const

type KanaSectionId = (typeof kanaSections)[number]['id']

const route = useRoute()
const router = useRouter()

function isKanaSection(value: string): value is KanaSectionId {
  return kanaSections.some((section) => section.id === value)
}

/** 地址里的 topic 对上目录才打开；缺省或无法识别时回到五十音。 */
function sectionFromQuery(value: unknown): KanaSectionId {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' && isKanaSection(raw) ? raw : 'chart'
}

const activeSection = computed(() => sectionFromQuery(route.query.topic))

function openSection(id: KanaSectionId) {
  if (id === activeSection.value) return
  void router.push({ path: '/kana', query: id === 'chart' ? {} : { topic: id } })
}

type PitchLevel = 'low' | 'high'

const pitchPatterns: { name: string; rule: string; levels: PitchLevel[] }[] = [
  { name: '0调', rule: '第一个音低，之后都高，没有下降', levels: ['low', 'high', 'high', 'high'] },
  { name: '1调', rule: '第1个音高，之后都低', levels: ['high', 'low', 'low', 'low'] },
  { name: '2调', rule: '有且只有第二个音是高音', levels: ['low', 'high', 'low', 'low'] },
  { name: '3调', rule: '第一个音低，从2升高到3，之后下降', levels: ['low', 'high', 'high', 'low'] },
]

const PITCH_STEP = 40
const PITCH_PAD = 16

function pitchX(index: number) {
  return PITCH_PAD + index * PITCH_STEP
}

function pitchY(level: PitchLevel) {
  return level === 'high' ? 10 : 30
}

/** 把一条调型画成四个音的折线，高音在上、低音在下。 */
function pitchLine(levels: PitchLevel[]) {
  return levels.map((level, index) => `${pitchX(index)},${pitchY(level)}`).join(' ')
}

const kanaMarks = [
  {
    symbol: '゛',
    name: '浊音符号',
    effect: '加在清音右上角，变成浊音',
    example: 'か→が、た→だ、は→ば',
  },
  {
    symbol: '゜',
    name: '半浊音符号',
    effect: '加在は行右上角，变成半浊音',
    example: 'は→ぱ、ひ→ぴ、ふ→ぷ',
  },
  {
    symbol: 'ー',
    name: '长音符号',
    effect: '表示元音拉长<br>あ → 长音<br>い → 长音<br>う → 长音<br>い/え → 长音<br>う/お → 长音',
    example: 'ノート',
  },
  {
    symbol: 'ヶ',
    name: '小ケ',
    effect: '数量里读「か」，地名里常读「が」',
    example: '一ヶ月（いっかげつ）、霞ヶ関（かすみがせき）',
  },
  {
    symbol: '々',
    name: '重复符号',
    effect: '重复前一个汉字',
    example: '時々（ときどき）、先々月（せんせんげつ）',
  },
]

/** 量词表的一格。irregular 是课本里标出的特殊读音，页面上用橙色。 */
type CounterCell = {
  label: string
  readings: string[]
  irregular?: boolean
  span?: number
}

const hourRows: CounterCell[][] = [
  [
    { label: '1時', readings: ['いちじ'] },
    { label: '4時', readings: ['よじ'], irregular: true },
    { label: '7時', readings: ['しちじ'], irregular: true },
    { label: '10時', readings: ['じゅうじ'] },
  ],
  [
    { label: '2時', readings: ['にじ'] },
    { label: '5時', readings: ['ごじ'] },
    { label: '8時', readings: ['はちじ'] },
    { label: '11時', readings: ['じゅういちじ'] },
  ],
  [
    { label: '3時', readings: ['さんじ'] },
    { label: '6時', readings: ['ろくじ'] },
    { label: '9時', readings: ['くじ'], irregular: true },
    { label: '12時', readings: ['じゅうにじ'] },
  ],
  [
    { label: '0時', readings: ['れいじ'] },
    { label: '何時', readings: ['なんじ'] },
  ],
]

const ageBands: CounterCell[][] = [
  [
    { label: '1歳', readings: ['いっさい'], irregular: true },
    { label: '2歳', readings: ['にさい'] },
    { label: '3歳', readings: ['さんさい'] },
    { label: '4歳', readings: ['よんさい'] },
    { label: '5歳', readings: ['ごさい'] },
  ],
  [
    { label: '6歳', readings: ['ろくさい'] },
    { label: '7歳', readings: ['ななさい'] },
    { label: '8歳', readings: ['はっさい'], irregular: true },
    { label: '9歳', readings: ['きゅうさい'] },
    { label: '10歳', readings: ['じゅっさい'], irregular: true },
  ],
  [
    { label: '18歳', readings: ['じゅうはちさい', 'じゅうはっさい'], irregular: true, span: 2 },
    { label: '20歳', readings: ['はたち'], irregular: true },
    { label: '何歳', readings: ['なんさい', 'おいくつ'], span: 2 },
  ],
]

/** 斜线后的零宽空格只给手机窄列换行，桌面表格仍排成一行。 */
const smallNumberColumns: CounterCell[][] = [
  [
    { label: '0', readings: ['れい／\u200bぜろ'] },
    { label: '1', readings: ['いち'] },
    { label: '2', readings: ['に'] },
    { label: '3', readings: ['さん'] },
    { label: '4', readings: ['し／\u200bよん'] },
    { label: '5', readings: ['ご'] },
    { label: '6', readings: ['ろく'] },
    { label: '7', readings: ['しち／\u200bなな'] },
    { label: '8', readings: ['はち'] },
    { label: '9', readings: ['く／\u200bきゅう'] },
  ],
  [
    { label: '10', readings: ['じゅう'] },
    { label: '11', readings: ['じゅういち'] },
    { label: '12', readings: ['じゅうに'] },
    { label: '13', readings: ['じゅうさん'] },
    { label: '14', readings: ['じゅうし／\u200bじゅうよん'] },
    { label: '15', readings: ['じゅうご'] },
    { label: '16', readings: ['じゅうろく'] },
    { label: '17', readings: ['じゅうしち／\u200bじゅうなな'] },
    { label: '18', readings: ['じゅうはち'] },
    { label: '19', readings: ['じゅうく／\u200bじゅうきゅう'] },
  ],
  [
    { label: '20', readings: ['にじゅう'] },
    { label: '30', readings: ['さんじゅう'] },
    { label: '40', readings: ['よんじゅう'] },
    { label: '50', readings: ['ごじゅう'] },
    { label: '60', readings: ['ろくじゅう'] },
    { label: '70', readings: ['ななじゅう'] },
    { label: '80', readings: ['はちじゅう'] },
    { label: '90', readings: ['きゅうじゅう'] },
    { label: '100', readings: ['ひゃく'] },
  ],
]

const smallNumberExtras: CounterCell[] = [
  { label: '0.1', readings: ['れいてんいち'] },
  { label: '2/3', readings: ['さんぶんのに'] },
]

const largeNumberRows: CounterCell[][] = [
  [
    { label: '100', readings: ['ひゃく'] },
    { label: '1,000', readings: ['せん'] },
    { label: '10,000', readings: ['いちまん'] },
  ],
  [
    { label: '200', readings: ['にひゃく'] },
    { label: '2,000', readings: ['にせん'] },
    { label: '100,000', readings: ['じゅうまん'] },
  ],
  [
    { label: '300', readings: ['さんびゃく'], irregular: true },
    { label: '3,000', readings: ['さんぜん'], irregular: true },
    { label: '1,000,000', readings: ['ひゃくまん'] },
  ],
  [
    { label: '400', readings: ['よんひゃく'] },
    { label: '4,000', readings: ['よんせん'] },
    { label: '10,000,000', readings: ['いっせんまん'], irregular: true },
  ],
  [
    { label: '500', readings: ['ごひゃく'] },
    { label: '5,000', readings: ['ごせん'] },
    { label: '100,000,000', readings: ['いちおく'] },
  ],
  [
    { label: '600', readings: ['ろっぴゃく'], irregular: true },
    { label: '6,000', readings: ['ろくせん'] },
    { label: '', readings: [] },
  ],
  [
    { label: '700', readings: ['ななひゃく'] },
    { label: '7,000', readings: ['ななせん'] },
    { label: '', readings: [] },
  ],
  [
    { label: '800', readings: ['はっぴゃく'], irregular: true },
    { label: '8,000', readings: ['はっせん'], irregular: true },
    { label: '', readings: [] },
  ],
  [
    { label: '900', readings: ['きゅうひゃく'] },
    { label: '9,000', readings: ['きゅうせん'] },
    { label: '', readings: [] },
  ],
]

const largeNumberExamples: CounterCell[] = [
  { label: '9002', readings: ['きゅうせんに'] },
  { label: '9020', readings: ['きゅうせんにじゅう'] },
  { label: '9200', readings: ['きゅうせんにひゃく'] },
]

/** 年龄、时间、分里，别人一般用来发问的句子。 */
type CounterQuestion = {
  jp: string
  reading?: string
}

const ageQuestions: CounterQuestion[] = [
  { jp: '何歳ですか。', reading: 'なんさいですか' },
  { jp: 'おいくつですか。' },
]

const hourQuestions: CounterQuestion[] = [
  { jp: '今何時ですか。', reading: 'いまなんじですか' },
]

const minuteQuestions: CounterQuestion[] = [
  { jp: '何分ですか。', reading: 'なんぷんですか' },
  { jp: '今何時何分ですか。', reading: 'いまなんじなんぷんですか' },
]

const QUIZ_CARD_COUNT = 4

const quizKinds: { type: QuestionType; label: string }[] = [
  { type: 'integer', label: '数字' },
  { type: 'fraction', label: '分数' },
  { type: 'decimal', label: '小数' },
  { type: 'time', label: '时间' },
  { type: 'age', label: '年龄' },
]

const quizMenuOpen = ref(false)
const quizType = ref<QuestionType | null>(null)
const quizCards = ref<NumberQuestion[]>([])
const quizRevealed = ref<boolean[]>([])

const quizLabel = computed(() => quizKinds.find((kind) => kind.type === quizType.value)?.label ?? '')

/** 生成一批读音卡，并重新盖住答案。 */
function startQuiz(type: QuestionType) {
  quizMenuOpen.value = false
  quizType.value = type
  quizCards.value = collectQuestions(QUIZ_CARD_COUNT, () => generateQuestion(type))
  quizRevealed.value = quizCards.value.map(() => false)
}

/** 关掉这一轮测试，回到量词表。 */
function closeQuiz() {
  quizCards.value = []
  quizRevealed.value = []
  quizType.value = null
}

/** 同一类再抽 4 张。 */
function replayQuiz() {
  if (!quizType.value) return
  startQuiz(quizType.value)
}

/** 点开这一张的全部假名。 */
function revealQuiz(index: number) {
  quizRevealed.value[index] = true
}

function onQuizKey(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  if (jumpMenuOpen.value) {
    jumpMenuOpen.value = false
    return
  }
  if (phoneLayout.value && quizCards.value.length) {
    closeQuiz()
    return
  }
  quizMenuOpen.value = false
}

/** 手机双列从左到右按数字排，0 和问法放在最后。 */
function inReadingOrder(cells: CounterCell[]): CounterCell[] {
  const sortKey = (label: string) => {
    if (label.startsWith('何')) return Number.POSITIVE_INFINITY
    const matched = label.match(/\d+/)
    if (!matched) return Number.POSITIVE_INFINITY
    const value = Number(matched[0])
    return value === 0 ? 1000 : value
  }
  return [...cells].sort((a, b) => sortKey(a.label) - sortKey(b.label))
}

/** 手机上百、千、万各成一列，空格不占位。 */
function columnCells(rows: CounterCell[][], index: number): CounterCell[] {
  return rows.flatMap((row) => {
    const cell = row[index]
    return cell?.label ? [cell] : []
  })
}

const phoneDigitGroups: { id: string; title: string; cells: CounterCell[]; split: boolean }[] = [
  { id: 'ones', title: '个位', cells: smallNumberColumns[0] ?? [], split: true },
  { id: 'teens', title: '十几', cells: smallNumberColumns[1] ?? [], split: true },
  { id: 'tens', title: '整十', cells: smallNumberColumns[2] ?? [], split: true },
  { id: 'fraction', title: '小数 · 分数', cells: smallNumberExtras, split: true },
]

const phoneLargeGroups: { id: string; title: string; cells: CounterCell[]; wide: boolean }[] = [
  { id: 'hundred', title: '百', cells: columnCells(largeNumberRows, 0), wide: false },
  { id: 'thousand', title: '千', cells: columnCells(largeNumberRows, 1), wide: false },
  { id: 'man', title: '万', cells: columnCells(largeNumberRows, 2), wide: true },
]

/** 手机量词页签下面的分段，点一下跳到对应卡片。 */
const counterJumps = [
  { id: 'ones', label: '个位' },
  { id: 'teens', label: '十几' },
  { id: 'tens', label: '整十' },
  { id: 'fraction', label: '小数' },
  { id: 'hundred', label: '百' },
  { id: 'thousand', label: '千' },
  { id: 'man', label: '万' },
  { id: 'age', label: '年龄' },
  { id: 'hour', label: '时间' },
  { id: 'minute', label: '分' },
] as const

const activeCounterJump = ref<(typeof counterJumps)[number]['id']>('ones')
const jumpBar = ref<HTMLElement | null>(null)
const jumpMeasure = ref<HTMLElement | null>(null)
const jumpVisibleCount = ref(counterJumps.length)
const jumpMenuOpen = ref(false)
const visibleJumps = computed(() => counterJumps.slice(0, jumpVisibleCount.value))
const overflowJumps = computed(() => counterJumps.slice(jumpVisibleCount.value))
const overflowActive = computed(() => overflowJumps.value.some((item) => item.id === activeCounterJump.value))
let jumpObserver: ResizeObserver | null = null

const stickHidden = ref(false)
const kanaStick = ref<HTMLElement | null>(null)
let lastStickScroll = 0
let stickScrollLock = false

/** 往下滚收起页签，往上滚或回到顶部再展开。高度不变，避免整页被拖走。 */
function onStickScroll(event: Event) {
  const main = event.target
  if (!(main instanceof HTMLElement) || !phoneLayout.value || stickScrollLock) return
  const top = main.scrollTop
  if (Math.abs(top - lastStickScroll) > 4) jumpMenuOpen.value = false
  if (top <= 8) stickHidden.value = false
  else if (top > lastStickScroll + 8) stickHidden.value = true
  else if (top < lastStickScroll - 8) stickHidden.value = false
  lastStickScroll = top
  const stick = kanaStick.value
  if (stick) stick.style.setProperty('--stick-h', `${stick.offsetHeight}px`)
}

/**
 * 量出一行能放下几个分段。放不下的收进末尾四个空心方块，不再横向滑出屏幕。
 */
function fitJumpChips() {
  const bar = jumpBar.value
  const measure = jumpMeasure.value
  if (!bar || !measure) return
  const chips = [...measure.querySelectorAll('button')]
  const more = chips[chips.length - 1]
  const items = chips.slice(0, -1)
  if (!more || items.length !== counterJumps.length || items.some((item) => item.offsetWidth === 0)) return
  const styles = getComputedStyle(bar)
  const available = bar.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight)
  const gap = parseFloat(getComputedStyle(measure).columnGap) || 0
  const moreWidth = more.offsetWidth
  let used = 0
  let count = items.length
  for (let index = 0; index < items.length; index += 1) {
    const next = used + (used ? gap : 0) + items[index].offsetWidth
    const hasRest = index < items.length - 1
    const limit = hasRest ? available - gap - moreWidth : available
    if (next > limit + 0.5) {
      count = index
      break
    }
    used = next
  }
  jumpVisibleCount.value = count
  if (count >= counterJumps.length) jumpMenuOpen.value = false
}

/** 分段条出现或变宽时重新量一次。 */
function watchJumpBar() {
  const bar = jumpBar.value
  if (!bar) return
  jumpObserver ??= new ResizeObserver(() => fitJumpChips())
  jumpObserver.observe(bar)
  fitJumpChips()
}

function onJumpPointer(event: PointerEvent) {
  if (!jumpMenuOpen.value) return
  const node = event.target
  const element = node instanceof Element ? node : node instanceof Node ? node.parentElement : null
  if (element?.closest('.counter-jump')) return
  jumpMenuOpen.value = false
}

/** 把量词卡片滚到页签下面，避免被吸顶的导航挡住。 */
function jumpToCounter(id: (typeof counterJumps)[number]['id']) {
  jumpMenuOpen.value = false
  activeCounterJump.value = id
  const target = document.getElementById(`counter-${id}`)
  const main = document.querySelector('main')
  const stick = kanaStick.value
  if (!target || !(main instanceof HTMLElement) || !stick) return
  stickHidden.value = false
  stickScrollLock = true
  const top = target.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop - stick.offsetHeight - 8
  main.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  window.setTimeout(() => {
    stickScrollLock = false
    lastStickScroll = main.scrollTop
  }, 450)
}

const minuteRows: CounterCell[][] = [
  [
    { label: '1分', readings: ['いっぷん'], irregular: true },
    { label: '4分', readings: ['よんぷん'], irregular: true },
    { label: '7分', readings: ['ななふん'] },
    { label: '10分', readings: ['じゅっぷん'], irregular: true },
  ],
  [
    { label: '2分', readings: ['にふん'] },
    { label: '5分', readings: ['ごふん'] },
    { label: '8分', readings: ['はっぷん'], irregular: true },
    { label: '11分', readings: ['じゅういっぷん'], irregular: true },
  ],
  [
    { label: '3分', readings: ['さんぷん'], irregular: true },
    { label: '6分', readings: ['ろっぷん'], irregular: true },
    { label: '9分', readings: ['きゅうふん'] },
    { label: '15分', readings: ['じゅうごふん'] },
  ],
]

const minuteExtras: CounterCell[] = [
  { label: '30分', readings: ['さんじゅっぷん', 'はん'], irregular: true },
  { label: '45分', readings: ['よんじゅうごふん'] },
  { label: '何分', readings: ['なんぷん'], irregular: true },
]

const phoneAgeCells = ageBands.flat()
const phoneHourCells = inReadingOrder(hourRows.flat())
const phoneMinuteCells = inReadingOrder([...minuteRows.flat(), ...minuteExtras])

onMounted(async () => {
  const voices = await loadVoices()
  voiceOptions.value = voices
  const japanese =
    voices.find((voice) => voice.name.includes('Microsoft Ichiro')) ??
    voices.find((voice) => /^ja([-_]|$)/i.test(voice.lang))
  hasJapaneseVoice.value = Boolean(japanese)
  // 没有日语引擎时保持空选，朗读走 lang=ja-JP
  selectedVoiceUri.value = japanese?.voiceURI ?? ''
  window.addEventListener('keydown', onQuizKey)
  window.addEventListener('pointerdown', onJumpPointer)
  document.querySelector('main')?.addEventListener('scroll', onStickScroll, { passive: true })
  nextTick(watchJumpBar)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onQuizKey)
  window.removeEventListener('pointerdown', onJumpPointer)
  document.querySelector('main')?.removeEventListener('scroll', onStickScroll)
  jumpObserver?.disconnect()
})

watch(activeSection, () => {
  document.querySelector('main')?.scrollTo({ top: 0 })
  stickHidden.value = false
  lastStickScroll = 0
  quizMenuOpen.value = false
  jumpMenuOpen.value = false
  closeQuiz()
  nextTick(watchJumpBar)
})
</script>

<template>
  <div class="kana-view" :class="{ 'is-narrow': phoneLayout }">
    <h2>50音图</h2>
    <p class="page-lead">{{ KANA_DESCRIPTION }}</p>
    <div class="kana-body">
      <div ref="kanaStick" class="kana-stick" :class="{ 'is-hidden': stickHidden }">
      <nav class="kana-nav" aria-label="五十音内容">
        <button
          v-for="section in kanaSections"
          :key="section.id"
          type="button"
          :class="{ active: section.id === activeSection }"
          :aria-current="section.id === activeSection ? 'page' : undefined"
          @click="openSection(section.id)"
        >
          {{ section.label }}
        </button>
      </nav>
      <nav v-if="phoneLayout && activeSection === 'counter'" class="counter-jump" aria-label="量词分段">
        <div ref="jumpBar" class="jump-row">
          <div ref="jumpMeasure" class="jump-measure" aria-hidden="true">
            <button v-for="item in counterJumps" :key="item.id" type="button" tabindex="-1">{{ item.label }}</button>
            <button type="button" class="jump-more" tabindex="-1">
              <span class="jump-more-grid"><i></i><i></i><i></i><i></i></span>
            </button>
          </div>
          <button
            v-for="item in visibleJumps"
            :key="item.id"
            type="button"
            :class="{ 'is-on': item.id === activeCounterJump }"
            @click="jumpToCounter(item.id)"
          >
            {{ item.label }}
          </button>
          <button
            v-if="overflowJumps.length"
            type="button"
            class="jump-more"
            :class="{ 'is-on': overflowActive || jumpMenuOpen }"
            aria-label="更多分段"
            aria-haspopup="menu"
            :aria-expanded="jumpMenuOpen"
            @click="jumpMenuOpen = !jumpMenuOpen"
          >
            <span class="jump-more-grid" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
          </button>
        </div>
        <div v-if="jumpMenuOpen" class="jump-menu" role="menu">
          <button
            v-for="item in overflowJumps"
            :key="item.id"
            type="button"
            role="menuitem"
            :class="{ 'is-on': item.id === activeCounterJump }"
            @click="jumpToCounter(item.id)"
          >
            {{ item.label }}
          </button>
        </div>
      </nav>
      </div>

      <div class="kana-panel">
        <template v-if="activeSection === 'chart'">
          <div class="toolbar">
            <div class="voice">
              <span>语音选择:</span>
              <el-select
                v-model="selectedVoiceUri"
                class="voice-select"
                :placeholder="hasJapaneseVoice ? '选择语音' : '自动（日语）'"
                clearable
              >
                <el-option
                  v-for="voice in voiceOptions"
                  :key="voice.voiceURI"
                  :label="`${voice.name} (${voice.lang})`"
                  :value="voice.voiceURI"
                />
              </el-select>
            </div>
          </div>
          <p v-if="!hasJapaneseVoice" class="voice-hint">
            未检测到本机日语语音包，将使用浏览器日语朗读；也可手动选中文语音（发音可能不准确）。
          </p>
          <p v-if="phoneLayout" class="tap-hint">点平假名或片假名即可朗读。</p>
          <KanaChart title="基本50音" :rows="hiraganaChart" :voice-uri="selectedVoiceUri" />
          <KanaChart title="拗音" :rows="youonChart" :voice-uri="selectedVoiceUri" />
          <KanaChart title="浊音半浊音" :rows="dakuonChart" :voice-uri="selectedVoiceUri" />
        </template>

        <section v-else-if="activeSection === 'marks'" class="kana-marks">
          <h3>符号</h3>
          <div v-if="phoneLayout" class="mark-list">
            <article v-for="mark in kanaMarks" :key="mark.symbol" class="mark-card">
              <p class="mark-badge" lang="ja">{{ mark.symbol }}</p>
              <div>
                <h4>{{ mark.name }}</h4>
                <p class="mark-effect" v-html="mark.effect"></p>
                <p class="mark-example" lang="ja">{{ mark.example }}</p>
              </div>
            </article>
          </div>
          <el-table v-else :data="kanaMarks" border style="width: 100%">
            <el-table-column label="符号" width="100" align="center">
              <template #default="{ row }">
                <span class="mark-symbol">{{ row.symbol }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="名称" width="140" align="center" />
            <el-table-column label="作用" min-width="240">
              <template #default="{ row }">
                <span class="mark-effect" v-html="row.effect"></span>
              </template>
            </el-table-column>
            <el-table-column prop="example" label="例子" min-width="240" />
          </el-table>
        </section>

        <section v-else-if="activeSection === 'pitch'" class="kana-pitch">
          <h3>高低音</h3>
          <p class="pitch-legend"><i class="dot high" />高音<span class="legend-gap" /><i class="dot low" />低音</p>
          <div class="pitch-grid">
            <article v-for="pattern in pitchPatterns" :key="pattern.name" class="pitch-card">
              <h4>{{ pattern.name }}</h4>
              <p>{{ pattern.rule }}</p>
              <svg class="pitch-chart" viewBox="0 0 152 48" role="img" :aria-label="pattern.rule">
                <polyline :points="pitchLine(pattern.levels)" />
                <g v-for="(level, index) in pattern.levels" :key="index">
                  <circle :cx="pitchX(index)" :cy="pitchY(level)" r="4.5" :class="level" />
                  <text :x="pitchX(index)" y="46">{{ index + 1 }}</text>
                </g>
              </svg>
            </article>
          </div>
        </section>

        <section v-else-if="activeSection === 'counter'" class="kana-counter">
          <div v-if="!phoneLayout" class="counter-heading">
            <h3>量词</h3>
            <button type="button" :aria-expanded="quizMenuOpen" @click="quizMenuOpen = !quizMenuOpen">
              随机测试
            </button>
          </div>
          <div v-if="!phoneLayout && quizMenuOpen" class="quiz-kinds">
            <button v-for="kind in quizKinds" :key="kind.type" type="button" @click="startQuiz(kind.type)">
              {{ kind.label }}
            </button>
          </div>
          <button v-if="phoneLayout" type="button" class="quiz-launch" @click="quizMenuOpen = true">随机测试</button>
          <p class="counter-lead"><span class="irregular">橙色</span>是特殊读音。1、3、4、6、8、10 在量词里经常变。<span class="ask">红字</span>是一般的问法。</p>
          <div v-if="!phoneLayout && quizCards.length" class="quiz-board">
            <article v-for="(card, index) in quizCards" :key="index" class="quiz-card">
              <p class="quiz-prompt" lang="ja">{{ card.display }}</p>
              <button v-if="!quizRevealed[index]" type="button" @click="revealQuiz(index)">查看答案</button>
              <p v-else class="quiz-reading" lang="ja">
                <span v-for="(reading, readingIndex) in card.readings" :key="readingIndex">
                  <span
                    v-for="(piece, pieceIndex) in splitReading(reading)"
                    :key="pieceIndex"
                    :class="{ 'is-changed': piece.changed }"
                  >{{ piece.text }}</span>
                </span>
              </p>
            </article>
          </div>

          <template v-if="!phoneLayout">
          <h4>100以下的数字</h4>
          <div class="counter-columns">
            <table
              v-for="(column, columnIndex) in smallNumberColumns"
              :key="columnIndex"
              class="counter-table"
              lang="ja"
            >
              <tbody>
                <tr v-for="cell in column" :key="cell.label">
                  <th scope="row">{{ cell.label }}</th>
                  <td>
                    <span v-for="(reading, readingIndex) in cell.readings" :key="readingIndex">{{ reading }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="counter-scroll">
            <table class="counter-table" lang="ja">
              <tbody>
                <tr>
                  <template v-for="cell in smallNumberExtras" :key="cell.label">
                    <th scope="row">{{ cell.label }}</th>
                    <td>
                      <span v-for="(reading, readingIndex) in cell.readings" :key="readingIndex">{{ reading }}</span>
                    </td>
                  </template>
                </tr>
              </tbody>
            </table>
          </div>

          <h4>100以上的数字</h4>
          <div class="counter-scroll">
            <table class="counter-table" lang="ja">
              <tbody>
                <tr v-for="(row, rowIndex) in largeNumberRows" :key="rowIndex">
                  <template v-for="(cell, cellIndex) in row" :key="cellIndex">
                    <template v-if="cell.label">
                      <th scope="row">{{ cell.label }}</th>
                      <td :class="{ irregular: cell.irregular }">
                        <span v-for="(reading, readingIndex) in cell.readings" :key="readingIndex">{{ reading }}</span>
                      </td>
                    </template>
                    <template v-else>
                      <th class="blank" />
                      <td class="blank" />
                    </template>
                  </template>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="counter-note">一百、一千不加「いち」，读ひゃく、せん。一万、一千万、一亿要加「いち」。中间是 0 的位数不读。</p>
          <div class="counter-scroll">
            <table class="counter-table" lang="ja">
              <tbody>
                <tr>
                  <template v-for="cell in largeNumberExamples" :key="cell.label">
                    <th scope="row">{{ cell.label }}</th>
                    <td>
                      <span v-for="(reading, readingIndex) in cell.readings" :key="readingIndex">{{ reading }}</span>
                    </td>
                  </template>
                </tr>
              </tbody>
            </table>
          </div>

          <h4>年龄</h4>
          <p class="counter-ask">
            一般这么问：
            <span v-for="(item, index) in ageQuestions" :key="index" class="ask" lang="ja">
              {{ item.jp }}<template v-if="item.reading">（{{ item.reading }}）</template>
            </span>
          </p>
          <div class="counter-scroll">
            <table class="counter-table" lang="ja">
              <tbody>
                <template v-for="(band, bandIndex) in ageBands" :key="bandIndex">
                  <tr>
                    <th
                      v-for="cell in band"
                      :key="cell.label"
                      scope="col"
                      :colspan="cell.span ?? 1"
                    >
                      {{ cell.label }}
                    </th>
                  </tr>
                  <tr>
                    <td
                      v-for="cell in band"
                      :key="cell.label"
                      :colspan="cell.span ?? 1"
                      :class="{ irregular: cell.irregular }"
                    >
                      <span v-for="(reading, readingIndex) in cell.readings" :key="readingIndex">{{ reading }}</span>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>

          <h4>时间</h4>
          <p class="counter-ask">
            一般这么问：
            <span v-for="(item, index) in hourQuestions" :key="index" class="ask" lang="ja">
              {{ item.jp }}<template v-if="item.reading">（{{ item.reading }}）</template>
            </span>
          </p>
          <div class="counter-scroll">
            <table class="counter-table" lang="ja">
              <tbody>
                <tr v-for="(row, rowIndex) in hourRows" :key="rowIndex">
                  <template v-for="cell in row" :key="cell.label">
                    <th scope="row">{{ cell.label }}</th>
                    <td :class="{ irregular: cell.irregular }">
                      <span v-for="(reading, readingIndex) in cell.readings" :key="readingIndex">{{ reading }}</span>
                    </td>
                  </template>
                </tr>
              </tbody>
            </table>
          </div>

          <h4>分</h4>
          <p class="counter-ask">
            一般这么问：
            <span v-for="(item, index) in minuteQuestions" :key="index" class="ask" lang="ja">
              {{ item.jp }}<template v-if="item.reading">（{{ item.reading }}）</template>
            </span>
          </p>
          <div class="counter-scroll">
            <table class="counter-table" lang="ja">
              <tbody>
                <tr v-for="(row, rowIndex) in minuteRows" :key="rowIndex">
                  <template v-for="cell in row" :key="cell.label">
                    <th scope="row">{{ cell.label }}</th>
                    <td :class="{ irregular: cell.irregular }">
                      <span v-for="(reading, readingIndex) in cell.readings" :key="readingIndex">{{ reading }}</span>
                    </td>
                  </template>
                </tr>
                <tr>
                  <th scope="row">30分</th>
                  <td colspan="5" class="irregular">
                    <span>さんじゅっぷん</span>
                    <span>はん</span>
                  </td>
                  <th scope="row" rowspan="2">何分</th>
                  <td rowspan="2" class="irregular">
                    <span>なんぷん</span>
                  </td>
                </tr>
                <tr>
                  <th scope="row">45分</th>
                  <td colspan="5">
                    <span>よんじゅうごふん</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          </template>

          <div v-else class="phone-counter">
            <article v-for="group in phoneDigitGroups" :key="group.title" :id="`counter-${group.id}`" class="count-card">
              <h4>{{ group.title }}</h4>
              <div class="count-lines" :class="{ 'is-split': group.split }">
                <p v-for="cell in group.cells" :key="cell.label" class="count-line">
                  <span class="count-label">{{ cell.label }}</span>
                  <span class="count-read" :class="{ irregular: cell.irregular }">
                    <span v-for="(reading, readingIndex) in cell.readings" :key="readingIndex">{{ reading }}</span>
                  </span>
                </p>
              </div>
            </article>

            <div class="count-duo">
              <article v-for="group in phoneLargeGroups.filter((group) => !group.wide)" :key="group.title" :id="`counter-${group.id}`" class="count-card">
                <h4>{{ group.title }}</h4>
                <div class="count-lines">
                  <p v-for="cell in group.cells" :key="cell.label" class="count-line">
                    <span class="count-label">{{ cell.label }}</span>
                    <span class="count-read" :class="{ irregular: cell.irregular }">
                      <span v-for="(reading, readingIndex) in cell.readings" :key="readingIndex">{{ reading }}</span>
                    </span>
                  </p>
                </div>
              </article>
            </div>

            <article v-for="group in phoneLargeGroups.filter((group) => group.wide)" :key="group.title" :id="`counter-${group.id}`" class="count-card">
              <h4>{{ group.title }}</h4>
              <div class="count-lines is-split">
                <p v-for="cell in group.cells" :key="cell.label" class="count-line">
                  <span class="count-label">{{ cell.label }}</span>
                  <span class="count-read" :class="{ irregular: cell.irregular }">
                    <span v-for="(reading, readingIndex) in cell.readings" :key="readingIndex">{{ reading }}</span>
                  </span>
                </p>
              </div>
            </article>

            <p class="counter-note">一百、一千不加「いち」，读ひゃく、せん。一万、一千万、一亿要加「いち」。中间是 0 的位数不读。</p>

            <article class="count-card">
              <h4>位数里的 0</h4>
              <div class="count-lines">
                <p v-for="cell in largeNumberExamples" :key="cell.label" class="count-line">
                  <span class="count-label">{{ cell.label }}</span>
                  <span class="count-read">
                    <span v-for="(reading, readingIndex) in cell.readings" :key="readingIndex">{{ reading }}</span>
                  </span>
                </p>
              </div>
            </article>

            <article id="counter-age" class="count-card">
              <h4>年龄</h4>
              <p class="counter-ask">
                一般这么问：
                <span v-for="(item, index) in ageQuestions" :key="index" class="ask" lang="ja">
                  {{ item.jp }}<template v-if="item.reading">（{{ item.reading }}）</template>
                </span>
              </p>
              <div class="count-lines is-split">
                <p v-for="cell in phoneAgeCells" :key="cell.label" class="count-line">
                  <span class="count-label">{{ cell.label }}</span>
                  <span class="count-read" :class="{ irregular: cell.irregular }">
                    <span v-for="(reading, readingIndex) in cell.readings" :key="readingIndex">{{ reading }}</span>
                  </span>
                </p>
              </div>
            </article>

            <article id="counter-hour" class="count-card">
              <h4>时间</h4>
              <p class="counter-ask">
                一般这么问：
                <span v-for="(item, index) in hourQuestions" :key="index" class="ask" lang="ja">
                  {{ item.jp }}<template v-if="item.reading">（{{ item.reading }}）</template>
                </span>
              </p>
              <div class="count-lines is-split">
                <p v-for="cell in phoneHourCells" :key="cell.label" class="count-line">
                  <span class="count-label">{{ cell.label }}</span>
                  <span class="count-read" :class="{ irregular: cell.irregular }">
                    <span v-for="(reading, readingIndex) in cell.readings" :key="readingIndex">{{ reading }}</span>
                  </span>
                </p>
              </div>
            </article>

            <article id="counter-minute" class="count-card">
              <h4>分</h4>
              <p class="counter-ask">
                一般这么问：
                <span v-for="(item, index) in minuteQuestions" :key="index" class="ask" lang="ja">
                  {{ item.jp }}<template v-if="item.reading">（{{ item.reading }}）</template>
                </span>
              </p>
              <div class="count-lines is-split">
                <p v-for="cell in phoneMinuteCells" :key="cell.label" class="count-line">
                  <span class="count-label">{{ cell.label }}</span>
                  <span class="count-read" :class="{ irregular: cell.irregular }">
                    <span v-for="(reading, readingIndex) in cell.readings" :key="readingIndex">{{ reading }}</span>
                  </span>
                </p>
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>

    <div v-if="phoneLayout && quizMenuOpen" class="sheet-layer" @click="quizMenuOpen = false">
      <article class="sheet" role="dialog" aria-modal="true" aria-label="随机测试" @click.stop>
        <div class="sheet-head">
          <p>随机测试</p>
          <button type="button" class="sheet-close" aria-label="关闭" @click="quizMenuOpen = false">
            <el-icon :size="18"><Close /></el-icon>
          </button>
        </div>
        <p class="sheet-lead">选一类，一次 4 张。点「查看答案」才显示假名。</p>
        <button
          v-for="kind in quizKinds"
          :key="kind.type"
          type="button"
          class="kind-btn"
          @click="startQuiz(kind.type)"
        >
          {{ kind.label }}
        </button>
      </article>
    </div>

    <div
      v-if="phoneLayout && quizCards.length"
      class="quiz-layer"
      role="dialog"
      aria-modal="true"
      :aria-label="`${quizLabel}测试`"
    >
      <header class="quiz-head">
        <div>
          <p class="quiz-kicker">随机测试</p>
          <h3>{{ quizLabel }}</h3>
        </div>
        <button type="button" class="sheet-close" aria-label="关闭" @click="closeQuiz">
          <el-icon :size="18"><Close /></el-icon>
        </button>
      </header>
      <div class="quiz-grid">
        <article
          v-for="(card, index) in quizCards"
          :key="index"
          class="quiz-tile"
          :class="{ 'is-open': quizRevealed[index] }"
        >
          <p class="quiz-prompt" lang="ja">{{ card.display }}</p>
          <button v-if="!quizRevealed[index]" type="button" @click="revealQuiz(index)">查看答案</button>
          <p v-else class="quiz-reading" lang="ja">
            <span v-for="(reading, readingIndex) in card.readings" :key="readingIndex">
              <span
                v-for="(piece, pieceIndex) in splitReading(reading)"
                :key="pieceIndex"
                :class="{ 'is-changed': piece.changed }"
              >{{ piece.text }}</span>
            </span>
          </p>
        </article>
      </div>
      <div class="quiz-foot">
        <button type="button" class="quiz-again" @click="replayQuiz">再来一组</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-lead {
  margin: 0 0 16px;
  color: #57534e;
  font-size: 14px;
  line-height: 1.6;
}

.kana-body {
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.kana-nav {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: calc(100vh - 140px);
  overflow: auto;
  padding: 4px 0;
}

.kana-nav button {
  padding: 8px 12px;
  border: 0;
  border-left: 2px solid transparent;
  background: transparent;
  color: #44403c;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.kana-nav button.active {
  border-left-color: #9f3d2f;
  background: #f3e4df;
  color: #1c1917;
  font-weight: 600;
}

.kana-panel {
  min-width: 0;
}

.kana-stick {
  display: contents;
}

html[data-layout='phone'] .kana-stick {
  position: sticky;
  top: 0;
  z-index: 4;
  display: block;
  margin: 0 0 8px;
  background: #f6f1e8;
  transition: top 0.2s ease;
}

html[data-layout='phone'] .kana-stick.is-hidden {
  top: calc(-1 * var(--stick-h, 96px));
  pointer-events: none;
}

html[data-layout='phone'] .kana-stick .kana-nav {
  position: static;
  margin: 0;
}

html[data-layout='phone'] .kana-view > h2,
html[data-layout='phone'] .page-lead {
  display: none;
}

html[data-layout='phone'] .kana-body {
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}

html[data-layout='phone'] .kana-nav {
  position: sticky;
  top: 0;
  z-index: 3;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  max-height: none;
  margin: 0 0 2px;
  padding: 8px 16px 10px;
  background: #f6f1e8;
}

html[data-layout='phone'] .kana-stick,
html[data-layout='phone'] .kana-panel {
  min-width: 0;
  max-width: 100%;
}

html[data-layout='phone'] .kana-panel {
  padding: 0 16px;
  box-sizing: border-box;
}

html[data-layout='phone'] .kana-nav button {
  flex: none;
  padding: 8px 0;
  border: 0;
  border-radius: 999px;
  background: #fff;
  color: #8a8478;
  font-size: 13px;
  font-weight: 650;
  text-align: center;
  box-shadow: 0 1px 2px rgb(44 40 36 / 8%);
}

html[data-layout='phone'] .kana-nav button.active {
  border: 0;
  background: #f8882c;
  color: #fff;
}

.counter-jump {
  position: relative;
  min-width: 0;
  max-width: 100%;
}

.jump-row,
.jump-measure {
  display: flex;
  gap: 6px;
}

.jump-row {
  min-width: 0;
  overflow: hidden;
  padding: 0 16px 8px;
}

.jump-measure {
  position: absolute;
  top: 0;
  left: 16px;
  visibility: hidden;
  pointer-events: none;
}

.counter-jump button {
  flex: none;
  padding: 4px 10px;
  border: 0;
  border-radius: 999px;
  background: #fff;
  color: #8a8478;
  font: inherit;
  font-size: 12px;
  line-height: 1.5;
  box-shadow: 0 1px 2px rgb(44 40 36 / 8%);
}

.counter-jump button.is-on {
  background: #fff7f0;
  color: #f8882c;
  box-shadow: inset 0 0 0 1.5px #f8882c;
}

.counter-jump .jump-more {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 26px;
  padding: 0;
  border-radius: 8px;
}

.jump-more-grid {
  display: grid;
  grid-template-columns: repeat(2, 6px);
  gap: 2px;
}

.jump-more-grid i {
  display: block;
  width: 6px;
  height: 6px;
  box-sizing: border-box;
  border: 1.5px solid #1c1917;
  border-radius: 1px;
  background: transparent;
}

.jump-more.is-on .jump-more-grid i {
  border-color: #f8882c;
}

.jump-menu {
  position: absolute;
  z-index: 6;
  top: calc(100% - 4px);
  right: 16px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  min-width: 88px;
  padding: 8px;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 10px 28px rgb(44 40 36 / 16%);
}

.jump-menu button {
  text-align: center;
}

html[data-layout='phone'] .toolbar {
  justify-content: stretch;
  margin-bottom: 8px;
}

html[data-layout='phone'] .voice {
  flex: 1;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
}

html[data-layout='phone'] .voice span {
  color: #8a8478;
  font-size: 13px;
}

html[data-layout='phone'] .voice-select {
  width: 100%;
}

html[data-layout='phone'] .voice-select :deep(.el-select__wrapper),
html[data-layout='phone'] .voice-select :deep(.el-select__input) {
  font-size: 16px;
}

html[data-layout='phone'] .voice-hint,
html[data-layout='phone'] .tap-hint {
  margin: 0 0 4px;
  color: #8a8478;
  font-size: 13px;
  line-height: 1.5;
  text-align: left;
}

html[data-layout='phone'] .kana-marks > h3,
html[data-layout='phone'] .kana-pitch > h3 {
  display: none;
}

html[data-layout='phone'] .pitch-grid {
  grid-template-columns: 1fr;
  gap: 10px;
}

html[data-layout='phone'] .pitch-card {
  border: 0;
  border-radius: 18px;
  box-shadow: 0 8px 24px rgb(92 72 40 / 6%);
}

html[data-layout='phone'] .pitch-card p {
  min-height: 0;
}

html[data-layout='phone'] .pitch-chart {
  width: min(100%, 220px);
  height: auto;
}

html[data-layout='phone'] .dot.high,
html[data-layout='phone'] .pitch-chart circle.high {
  background: #f8882c;
  fill: #f8882c;
}

html[data-layout='phone'] .counter-lead,
html[data-layout='phone'] .counter-note,
html[data-layout='phone'] .counter-ask {
  color: #6f6a62;
  text-align: left;
}

html[data-layout='phone'] .counter-ask .ask + .ask {
  display: inline;
  margin-left: 0;
}

html[data-layout='phone'] .counter-ask .ask {
  display: block;
  margin-top: 4px;
}

html[data-layout='phone'] .irregular {
  color: #f8882c;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-bottom: 15px;
}

.voice {
  display: flex;
  align-items: center;
  gap: 10px;
}

.voice-select {
  width: 280px;
}

.voice-hint {
  margin: 0 0 16px;
  color: #909399;
  font-size: 13px;
  text-align: right;
}

.kana-marks {
  margin-bottom: 30px;
}

.kana-marks h3 {
  margin: 0 0 15px;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
}

.mark-symbol {
  font-size: 24px;
  line-height: 1;
}

.mark-effect {
  line-height: 1.7;
}

.kana-pitch {
  margin-bottom: 30px;
}

.kana-pitch h3 {
  margin: 0 0 8px;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
}

.pitch-legend {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 0 0 12px;
  color: #57534e;
  font-size: 13px;
}

.pitch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.pitch-card {
  padding: 12px 14px 8px;
  border: 1px solid #e4e7ed;
  background: #fff;
  text-align: center;
}

.pitch-card h4 {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 600;
}

.pitch-card p {
  margin: 0 0 4px;
  color: #57534e;
  font-size: 14px;
  line-height: 1.6;
  min-height: 4.8em;
}

.legend-gap {
  width: 12px;
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.dot.high {
  background: #c2410c;
}

.dot.low {
  background: #a8a29e;
}

.pitch-chart {
  width: 152px;
  height: 48px;
  vertical-align: middle;
}

.pitch-chart polyline {
  fill: none;
  stroke: #44403c;
  stroke-width: 1.5;
}

.pitch-chart circle.high {
  fill: #c2410c;
}

.pitch-chart circle.low {
  fill: #a8a29e;
}

.pitch-chart text {
  fill: #78716c;
  font-size: 11px;
  text-anchor: middle;
}

.kana-counter {
  margin-bottom: 30px;
}

.counter-heading {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: start;
  gap: 8px;
  margin-bottom: 8px;
}

.kana-counter h3 {
  grid-column: 2;
  margin: 0;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
}

.counter-heading > button {
  grid-column: 3;
  justify-self: end;
}

.counter-heading > button,
.quiz-kinds button,
.quiz-card button {
  padding: 4px 10px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background: #fff;
  color: #1c1917;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.counter-heading > button[aria-expanded='true'] {
  border-color: #c2410c;
  color: #c2410c;
}

.quiz-kinds {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
  margin-bottom: 8px;
}

.quiz-board {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.quiz-card {
  padding: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fff;
  text-align: center;
}

.quiz-card p {
  margin: 0;
}

.quiz-prompt {
  font-size: 20px;
  font-weight: 600;
}

.quiz-card button,
.quiz-card .quiz-reading {
  margin-top: 8px;
}

.quiz-reading > span {
  display: block;
  color: #1c1917;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.5;
}

.quiz-reading .is-changed {
  color: #c2410c;
}

.kana-counter h4 {
  margin: 20px 0 8px;
  font-size: 16px;
  font-weight: 600;
}

.counter-lead,
.counter-note {
  margin: 0;
  color: #57534e;
  font-size: 14px;
  line-height: 1.7;
}

.counter-lead {
  text-align: center;
}

.counter-note {
  margin-top: 8px;
}

.counter-ask {
  margin: 0 0 8px;
  color: #57534e;
  font-size: 14px;
  line-height: 1.7;
}

.ask {
  color: #b42318;
  font-weight: 600;
}

.counter-ask .ask + .ask {
  margin-left: 12px;
}

.counter-scroll {
  max-width: 100%;
  overflow-x: auto;
}

.counter-columns {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-start;
}

.counter-columns + .counter-scroll {
  margin-top: 12px;
}

.counter-table {
  width: max-content;
  min-width: 100%;
  border-collapse: collapse;
  background: #fff;
}

.counter-columns .counter-table {
  min-width: 0;
}

.counter-table th,
.counter-table td {
  border: 1px solid #e4e7ed;
  padding: 8px 12px;
  text-align: center;
  font-size: 15px;
  white-space: nowrap;
}

.counter-table th {
  background: #f3e4df;
  color: #1c1917;
  font-weight: 600;
}

.counter-table th.blank,
.counter-table td.blank {
  background: #fff;
}

.counter-table td span {
  display: block;
  line-height: 1.5;
}

.irregular {
  color: #c2410c;
  font-weight: 600;
}

.mark-list,
.phone-counter {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  max-width: 100%;
}

.mark-card,
.count-card,
.quiz-tile {
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 8px 24px rgb(92 72 40 / 6%);
}

.mark-card {
  display: flex;
  gap: 12px;
  padding: 14px;
}

.mark-badge {
  display: grid;
  flex: none;
  place-items: center;
  width: 52px;
  height: 52px;
  margin: 0;
  border-radius: 16px;
  background: #fff7f0;
  color: #f8882c;
  font-size: 26px;
  font-weight: 700;
}

.mark-card h4,
.count-card h4 {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 700;
}

.mark-card .mark-effect {
  margin: 0;
  color: #2c2824;
  font-size: 14px;
  line-height: 1.65;
}

.mark-example {
  margin: 6px 0 0;
  color: #8a8478;
  font-size: 13px;
  line-height: 1.55;
}

.quiz-launch,
.quiz-again,
.kind-btn,
.sheet-close,
.quiz-tile button {
  border: 0;
  font: inherit;
  cursor: pointer;
}

.quiz-launch {
  width: 100%;
  height: 44px;
  border-radius: 14px;
  background: #f8882c;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  box-shadow: 0 8px 16px rgb(248 136 44 / 28%);
}

.count-card {
  min-width: 0;
  max-width: 100%;
  padding: 14px 16px 6px;
  box-sizing: border-box;
}

.count-duo {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  min-width: 0;
  max-width: 100%;
}

.count-duo .count-card {
  padding: 12px 10px 4px;
}

.count-duo .count-label,
.count-duo .count-read {
  font-size: 13px;
}

.count-lines.is-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  column-gap: 16px;
}

.count-lines.is-split .count-label,
.count-lines.is-split .count-read {
  min-width: 0;
  font-size: 13px;
}

.count-line {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  margin: 0;
  padding: 8px 0;
  border-bottom: 1px dashed #efe6d8;
}

.count-lines.is-split .count-line:nth-last-child(-n + 2),
.count-lines:not(.is-split) .count-line:last-child {
  border-bottom: 0;
}

.count-label {
  flex: none;
  color: #2c2824;
  font-weight: 700;
}

.count-read {
  flex: 1;
  min-width: 0;
  color: #6f6a62;
  font-size: 14px;
  text-align: right;
  word-break: keep-all;
  overflow-wrap: anywhere;
}

.count-read span {
  display: block;
  line-height: 1.45;
}

.sheet-layer,
.quiz-layer {
  position: fixed;
  z-index: 66;
  inset: 0;
}

.sheet-layer {
  display: flex;
  align-items: flex-end;
  background: rgb(44 40 36 / 32%);
}

.sheet {
  width: 100%;
  padding: 8px 16px calc(20px + env(safe-area-inset-bottom));
  border-radius: 22px 22px 0 0;
  background: #fffdf8;
  box-shadow: 0 -8px 32px rgb(44 40 36 / 12%);
}

.sheet-head,
.quiz-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.sheet-head p,
.quiz-kicker {
  margin: 0;
  color: #f8882c;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.sheet-lead {
  margin: 0 0 8px;
  color: #8a8478;
  font-size: 13px;
  line-height: 1.5;
}

.sheet-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: #fff;
  color: #2c2824;
  box-shadow: inset 0 0 0 1.5px #efe6d8;
}

.kind-btn {
  display: block;
  width: 100%;
  margin-top: 8px;
  padding: 14px 16px;
  border-radius: 14px;
  background: #fff;
  color: #2c2824;
  font-size: 16px;
  font-weight: 700;
  text-align: left;
  box-shadow: inset 0 0 0 1.5px #efe6d8;
}

.kind-btn:active {
  background: #fff7f0;
  color: #f8882c;
  box-shadow: inset 0 0 0 1.5px #f8882c;
}

.quiz-layer {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 12px 16px 0;
  background: #f6f1e8;
}

.quiz-head {
  margin-bottom: 12px;
}

.quiz-head h3 {
  margin: 2px 0 0;
  font-size: 22px;
  font-weight: 700;
}

.quiz-grid {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  grid-auto-rows: auto;
  align-content: start;
  gap: 12px;
  min-height: 0;
  overflow: auto;
  padding-bottom: 8px;
}

.quiz-tile {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  gap: 14px;
  min-width: 0;
  min-height: 148px;
  padding: 16px 14px 14px;
  text-align: center;
  container-type: inline-size;
}

.quiz-tile.is-open {
  justify-content: flex-start;
}

.quiz-tile .quiz-prompt {
  width: 100%;
  margin: 0;
  font-size: clamp(18px, 15cqw, 28px);
  line-height: 1.3;
  white-space: nowrap;
}

.quiz-tile button {
  width: 100%;
  margin-top: 0;
  padding: 8px 0;
  border-radius: 999px;
  background: #fff7f0;
  color: #f8882c;
  font-size: 14px;
  font-weight: 700;
}

.quiz-tile .quiz-reading {
  width: 100%;
  margin: 0;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.quiz-foot {
  flex: none;
  padding: 8px 8px calc(16px + env(safe-area-inset-bottom));
}

.quiz-again {
  width: 100%;
  height: 48px;
  border-radius: 999px;
  background: #f8882c;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.06em;
  box-shadow: 0 8px 18px rgb(248 136 44 / 32%);
}

.quiz-again:active {
  background: #e57a1f;
}
</style>
