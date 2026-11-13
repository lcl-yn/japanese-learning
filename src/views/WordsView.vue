<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import WordListTable from '@/components/WordListTable.vue'
import { useWordsStore } from '@/stores/words'
import { loadVoices, type VoiceOption } from '@/utils/speech'
import { WORDS_DESCRIPTION } from '@/utils/seo'

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

const units = computed(
  () => wordsStore.manifest.books.find((book) => book.code === bookId.value)?.units ?? [],
)
const lessons = computed(() => units.value.find((unit) => unit.unit === unitId.value)?.lessons ?? [])

const listedWords = computed(() =>
  wordsStore.allWords.filter((word) => {
    if (word.bookId !== bookId.value) return false
    if (unitId.value !== 0 && word.unit !== unitId.value) return false
    if (lessonId.value !== 0 && word.lesson !== lessonId.value) return false
    return true
  }),
)

const scopeKey = computed(() => `${bookId.value}:${unitId.value}:${lessonId.value}`)

function onBookChange(nextBookId: string) {
  const book = wordsStore.manifest.books.find((item) => item.code === nextBookId)
  bookId.value = nextBookId
  unitId.value = book?.units[0]?.unit ?? 0
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
          <el-option
            v-for="book in wordsStore.manifest.books"
            :key="book.code"
            :label="book.name"
            :value="book.code"
          />
        </el-select>
        <el-select
          class="scope-select"
          :model-value="unitId || undefined"
          placeholder="暂无单元"
          @change="onUnitChange"
        >
          <el-option v-for="unit in units" :key="unit.unit" :label="unit.name" :value="unit.unit" />
        </el-select>
        <el-select
          class="scope-select lesson-select"
          :model-value="lessonId"
          placeholder="课"
          @change="onLessonChange"
        >
          <el-option label="全部" :value="0" />
          <el-option v-for="lesson in lessons" :key="lesson.id" :label="lesson.name" :value="lesson.lesson" />
        </el-select>
        <el-switch v-model="showChinese" active-text="显示中文" inactive-text="隐藏中文" />
        <el-switch v-model="showJapanese" active-text="显示假名" inactive-text="隐藏假名" />
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
      :show-japanese="showJapanese"
      :voice-uri="selectedVoiceUri"
    />
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

.voice {
  display: flex;
  align-items: center;
  gap: 10px;
}

.scope-select {
  width: 140px;
}

.lesson-select {
  width: 120px;
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
