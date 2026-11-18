<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import WordListTable from '@/components/WordListTable.vue'
import { saveNewWord } from '@/services/wordSave'
import { useWordsStore } from '@/stores/words'
import { parseWordAppendBody } from '@/utils/wordAppend'
import { matchesCnPrefix } from '@/utils/cnSearch'
import { wordPages } from '@/utils/unitPages'
import { loadVoices, type VoiceOption } from '@/utils/speech'
import { WORDS_DESCRIPTION } from '@/utils/seo'

/** 输入法组字时回车的 keyCode，只确认候选，不触发搜索。 */
const IME_PROCESS_KEY = 229

/** 单词本里「全部册」的取值，不对应清单里的某一册。 */
const ALL_BOOKS = 'all'

/** 单词本里「全部单元」的取值。 */
const ALL_UNITS = 0

const wordsStore = useWordsStore()

function startingBook() {
  if (wordsStore.currentBookId !== 'all') return wordsStore.currentBookId
  const withLesson = wordsStore.manifest.books.find((book) =>
    book.units.some((unit) => unit.lessons.length > 0),
  )
  return withLesson?.code ?? wordsStore.manifest.books[0]?.code ?? ''
}

function startingUnit(nextBookId: string) {
  const book = wordsStore.manifest.books.find((item) => item.code === nextBookId)
  if (wordsStore.currentBookId === nextBookId && wordsStore.currentUnitId !== 0) {
    return wordsStore.currentUnitId
  }
  return book?.units[0]?.unit ?? 0
}

const bookId = ref(startingBook())
const unitId = ref(startingUnit(bookId.value))
const lessonId = ref(0)

const canAddWord = import.meta.env.DEV

const addOpen = ref(false)
const adding = ref(false)
const showFieldError = ref(false)
const formBookId = ref('')
const formUnitId = ref(0)
const formLessonId = ref(0)
const formCn = ref('')
const formJp = ref('')
const formJpWrite = ref('')
const formDescribe = ref('')
const formPart = ref('')

const locationLocked = computed(
  () => bookId.value !== ALL_BOOKS && unitId.value !== ALL_UNITS && lessonId.value !== 0,
)

const lockedLabel = computed(() => {
  const book = wordsStore.manifest.books.find((item) => item.code === bookId.value)
  const unit = book?.units.find((item) => item.unit === unitId.value)
  const lessonName =
    unit?.lessons.find((item) => item.lesson === lessonId.value)?.name ??
    wordPages(unit).find((item) => item.lesson === lessonId.value)?.name ??
    ''
  return [book?.name, unit?.name, lessonName].filter(Boolean).join(' / ')
})

const formUnits = computed(
  () => wordsStore.manifest.books.find((item) => item.code === formBookId.value)?.units ?? [],
)

const formLessons = computed(() => {
  const unit = formUnits.value.find((item) => item.unit === formUnitId.value)
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

function openAddDialog() {
  showFieldError.value = false
  formCn.value = ''
  formJp.value = ''
  formJpWrite.value = ''
  formDescribe.value = ''
  formPart.value = ''
  formBookId.value = bookId.value === ALL_BOOKS ? '' : bookId.value
  formUnitId.value = bookId.value !== ALL_BOOKS && unitId.value !== ALL_UNITS ? unitId.value : 0
  formLessonId.value = locationLocked.value ? lessonId.value : 0
  addOpen.value = true
}

function onFormBookChange(nextBookId: string) {
  formBookId.value = nextBookId
  formUnitId.value = 0
  formLessonId.value = 0
}

function onFormUnitChange(nextUnitId: number) {
  formUnitId.value = nextUnitId
  formLessonId.value = 0
}

function onFormLessonChange(nextLessonId: number) {
  formLessonId.value = nextLessonId
}

async function submitAddWord() {
  const cnBlank = formCn.value.trim() === ''
  const jpBlank = formJp.value.trim() === ''
  const writeBlank = formJpWrite.value.trim() === ''
  if (cnBlank || jpBlank || writeBlank) {
    showFieldError.value = true
    return
  }
  const targetBook = locationLocked.value ? bookId.value : formBookId.value
  const targetUnit = locationLocked.value ? unitId.value : formUnitId.value
  const targetLesson = locationLocked.value ? lessonId.value : formLessonId.value
  if (!locationLocked.value && (targetBook === '' || targetUnit === 0 || targetLesson === 0)) {
    ElMessage.error('请选择册、单元和课')
    return
  }
  const parsed = parseWordAppendBody({
    bookId: targetBook,
    unit: targetUnit,
    lesson: targetLesson,
    cn: formCn.value,
    jp: formJp.value,
    jp_write: formJpWrite.value,
    describe: formDescribe.value,
    part_of_speech: formPart.value,
  })
  if (!parsed.ok) {
    ElMessage.error(parsed.message)
    return
  }
  adding.value = true
  try {
    await saveNewWord(parsed.value)
    wordsStore.appendWord({
      cn: parsed.value.cn,
      jp: parsed.value.jp,
      jp_write: parsed.value.jp_write,
      describe: parsed.value.describe,
      part_of_speech: parsed.value.part_of_speech,
      bookId: parsed.value.bookId,
      unit: parsed.value.unit,
      lesson: parsed.value.lesson,
    })
    ElMessage.success('已添加')
    addOpen.value = false
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '添加失败')
  } finally {
    adding.value = false
  }
}

const units = computed(
  () => wordsStore.manifest.books.find((book) => book.code === bookId.value)?.units ?? [],
)
const lessons = computed(() => {
  const unit = units.value.find((item) => item.unit === unitId.value)
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

const cnDraft = ref('')
const cnQuery = ref('')

const listedWords = computed(() =>
  wordsStore.allWords.filter((word) => {
    if (bookId.value !== ALL_BOOKS && word.bookId !== bookId.value) return false
    if (unitId.value !== ALL_UNITS && word.unit !== unitId.value) return false
    if (lessonId.value !== 0 && word.lesson !== lessonId.value) return false
    return matchesCnPrefix(word.cn, cnQuery.value)
  }),
)

const scopeKey = computed(() => `${bookId.value}:${unitId.value}:${lessonId.value}:${cnQuery.value}`)

function applyCnSearch() {
  cnQuery.value = cnDraft.value.trim()
}

function onCnSearchEnter(event: KeyboardEvent) {
  if (event.isComposing || event.key === 'Process' || event.keyCode === IME_PROCESS_KEY) return
  applyCnSearch()
}

function onBookChange(nextBookId: string) {
  bookId.value = nextBookId
  if (nextBookId === ALL_BOOKS) {
    unitId.value = ALL_UNITS
    lessonId.value = 0
    return
  }
  const book = wordsStore.manifest.books.find((item) => item.code === nextBookId)
  unitId.value = book?.units[0]?.unit ?? ALL_UNITS
  lessonId.value = 0
}

function onUnitChange(nextUnitId: number) {
  unitId.value = nextUnitId
  lessonId.value = 0
}

function onLessonChange(nextLessonId: number) {
  lessonId.value = nextLessonId
}

const showChinese = ref(true)
const showJpWrite = ref(true)
const showJapanese = ref(true)
const voiceOptions = ref<VoiceOption[]>([])
const selectedVoiceUri = ref('')
const hasJapaneseVoice = ref(false)

onMounted(async () => {
  const voices = await loadVoices()
  voiceOptions.value = voices
  const japanese =
    voices.find((voice) => voice.name.includes('Microsoft Ichiro')) ??
    voices.find((voice) => /^ja([-_]|$)/i.test(voice.lang))
  hasJapaneseVoice.value = Boolean(japanese)
  selectedVoiceUri.value = japanese?.voiceURI ?? ''
})
</script>

<template>
  <div class="words-view">
    <h2>单词本</h2>
    <p class="page-lead">{{ WORDS_DESCRIPTION }}</p>
    <div class="toolbar">
      <div class="switches">
        <el-select
          class="scope-select"
          :model-value="bookId"
          placeholder="册"
          @change="onBookChange"
        >
          <el-option label="全部" :value="ALL_BOOKS" />
          <el-option
            v-for="book in wordsStore.manifest.books"
            :key="book.code"
            :label="book.name"
            :value="book.code"
          />
        </el-select>
        <el-select
          class="scope-select"
          :model-value="unitId"
          placeholder="单元"
          @change="onUnitChange"
        >
          <el-option label="全部" :value="ALL_UNITS" />
          <el-option v-for="unit in units" :key="unit.unit" :label="unit.name" :value="unit.unit" />
        </el-select>
        <el-select
          class="scope-select lesson-select"
          :model-value="lessonId"
          placeholder="课"
          @change="onLessonChange"
        >
          <el-option label="全部" :value="0" />
          <el-option v-for="lesson in lessons" :key="lesson.key" :label="lesson.name" :value="lesson.lesson" />
        </el-select>
        <el-input
          v-model="cnDraft"
          class="cn-search"
          placeholder="搜索中文释义"
          aria-label="按中文释义搜索"
          @keydown.enter="onCnSearchEnter"
        >
          <template #suffix>
            <button type="button" class="cn-search-icon" aria-label="搜索" @click="applyCnSearch">
              <el-icon :size="16"><Search /></el-icon>
            </button>
          </template>
        </el-input>
        <el-button v-if="canAddWord" type="primary" @click="openAddDialog">添加单词</el-button>
        <span class="visibility">
          <el-switch v-model="showChinese" aria-label="显示或隐藏中文" />
          <span>{{ showChinese ? '显示中文' : '隐藏中文' }}</span>
        </span>
        <span class="visibility">
          <el-switch v-model="showJpWrite" aria-label="显示或隐藏日文" />
          <span>{{ showJpWrite ? '显示日文' : '隐藏日文' }}</span>
        </span>
        <span class="visibility">
          <el-switch v-model="showJapanese" aria-label="显示或隐藏假名" />
          <span>{{ showJapanese ? '显示假名' : '隐藏假名' }}</span>
        </span>
      </div>
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

    <WordListTable
      :words="listedWords"
      :scope-key="scopeKey"
      :show-chinese="showChinese"
      :show-jp-write="showJpWrite"
      :show-japanese="showJapanese"
      :voice-uri="selectedVoiceUri"
    />
    <el-dialog
      v-model="addOpen"
      title="添加单词"
      width="480px"
      append-to-body
      @keydown.enter.prevent
    >
      <p v-if="locationLocked">{{ lockedLabel }}</p>
      <div v-else class="add-word-location">
        <el-select :model-value="formBookId" placeholder="册" @change="onFormBookChange">
          <el-option v-for="book in wordsStore.manifest.books" :key="book.code" :label="book.name" :value="book.code" />
        </el-select>
        <el-select
          :model-value="formUnitId || undefined"
          placeholder="单元"
          :disabled="formBookId === ''"
          @change="onFormUnitChange"
        >
          <el-option v-for="unit in formUnits" :key="unit.unit" :label="unit.name" :value="unit.unit" />
        </el-select>
        <el-select
          :model-value="formLessonId || undefined"
          placeholder="课"
          :disabled="formUnitId === 0"
          @change="onFormLessonChange"
        >
          <el-option v-for="lesson in formLessons" :key="lesson.key" :label="lesson.name" :value="lesson.lesson" />
        </el-select>
      </div>
      <el-form-item label="中文" :error="showFieldError && formCn.trim() === '' ? '请填写中文' : ''">
        <el-input v-model="formCn" />
      </el-form-item>
      <el-form-item label="假名" :error="showFieldError && formJp.trim() === '' ? '请填写假名' : ''">
        <el-input v-model="formJp" />
      </el-form-item>
      <el-form-item label="手写" :error="showFieldError && formJpWrite.trim() === '' ? '请填写手写' : ''">
        <el-input v-model="formJpWrite" />
      </el-form-item>
      <el-form-item label="说明">
        <el-input v-model="formDescribe" type="textarea" :rows="2" />
      </el-form-item>
      <el-form-item label="词性">
        <el-input v-model="formPart" type="textarea" :rows="2" />
      </el-form-item>
      <template #footer>
        <el-button @click="addOpen = false">取消</el-button>
        <el-button type="button" :loading="adding" @click="submitAddWord">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-lead {
  margin: 0 0 16px;
  color: #57534e;
  font-size: 14px;
  line-height: 1.6;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.switches {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}

.visibility {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #57534e;
  font-size: 14px;
  white-space: nowrap;
}

.voice {
  display: flex;
  align-items: center;
  gap: 10px;
}

.scope-select {
  width: 140px;
}

.lesson-select {
  width: 200px;
}

.cn-search {
  width: 200px;
}

.add-word-location {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.cn-search-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: #909399;
  cursor: pointer;
}

.cn-search-icon:hover {
  color: #57534e;
}

.voice-select {
  width: 280px;
}

.voice-hint {
  margin: 0 0 16px;
  color: #909399;
  font-size: 13px;
}
</style>
