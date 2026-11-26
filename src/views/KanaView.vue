<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import KanaChart from '@/components/KanaChart.vue'
import { dakuonChart, hiraganaChart, youonChart } from '@/data/kana'
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

watch(activeSection, () => {
  document.querySelector('main')?.scrollTo({ top: 0 })
})

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

const smallNumberColumns: CounterCell[][] = [
  [
    { label: '0', readings: ['れい／ぜろ'] },
    { label: '1', readings: ['いち'] },
    { label: '2', readings: ['に'] },
    { label: '3', readings: ['さん'] },
    { label: '4', readings: ['し／よん'] },
    { label: '5', readings: ['ご'] },
    { label: '6', readings: ['ろく'] },
    { label: '7', readings: ['しち／なな'] },
    { label: '8', readings: ['はち'] },
    { label: '9', readings: ['く／きゅう'] },
  ],
  [
    { label: '10', readings: ['じゅう'] },
    { label: '11', readings: ['じゅういち'] },
    { label: '12', readings: ['じゅうに'] },
    { label: '13', readings: ['じゅうさん'] },
    { label: '14', readings: ['じゅうし／じゅうよん'] },
    { label: '15', readings: ['じゅうご'] },
    { label: '16', readings: ['じゅうろく'] },
    { label: '17', readings: ['じゅうしち／じゅうなな'] },
    { label: '18', readings: ['じゅうはち'] },
    { label: '19', readings: ['じゅうく／じゅうきゅう'] },
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

const minuteRows: CounterCell[][] = [
  [
    { label: '1分', readings: ['いっぷん'], irregular: true },
    { label: '4分', readings: ['よんぷん'] },
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

onMounted(async () => {
  const voices = await loadVoices()
  voiceOptions.value = voices
  const japanese =
    voices.find((voice) => voice.name.includes('Microsoft Ichiro')) ??
    voices.find((voice) => /^ja([-_]|$)/i.test(voice.lang))
  hasJapaneseVoice.value = Boolean(japanese)
  // 没有日语引擎时保持空选，朗读走 lang=ja-JP
  selectedVoiceUri.value = japanese?.voiceURI ?? ''
})
</script>

<template>
  <div class="kana-view">
    <h2>50音图</h2>
    <p class="page-lead">{{ KANA_DESCRIPTION }}</p>
    <div class="kana-body">
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
          <KanaChart title="基本50音" :rows="hiraganaChart" :voice-uri="selectedVoiceUri" />
          <KanaChart title="拗音" :rows="youonChart" :voice-uri="selectedVoiceUri" />
          <KanaChart title="浊音半浊音" :rows="dakuonChart" :voice-uri="selectedVoiceUri" />
        </template>

        <section v-else-if="activeSection === 'marks'" class="kana-marks">
          <h3>符号</h3>
          <el-table :data="kanaMarks" border style="width: 100%">
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
          <h3>量词</h3>
          <p class="counter-lead"><span class="irregular">橙色</span>是特殊读音。1、3、4、6、8 在量词里经常变。<span class="ask">红字</span>是一般的问法。</p>

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
        </section>
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

html[data-layout='phone'] .kana-body {
  grid-template-columns: 1fr;
  gap: 12px;
}

html[data-layout='phone'] .kana-nav {
  flex-direction: row;
  max-height: none;
  overflow-x: auto;
  z-index: 2;
  margin: 0 -16px;
  padding: 0 16px 8px;
  background: #fbf8f3;
}

html[data-layout='phone'] .kana-nav button {
  flex: none;
  border-left: 0;
  border-bottom: 2px solid transparent;
}

html[data-layout='phone'] .kana-nav button.active {
  border-bottom-color: #9f3d2f;
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

html[data-layout='phone'] .pitch-card p {
  min-height: 0;
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

.kana-counter h3 {
  margin: 0 0 8px;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
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
</style>
