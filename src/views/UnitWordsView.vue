<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import WordListTable from '@/components/WordListTable.vue'
import { useWordsStore } from '@/stores/words'
import { loadVoices, type VoiceOption } from '@/utils/speech'

const props = defineProps<{
  lesson: number
  title: string
}>()

const route = useRoute()
const wordsStore = useWordsStore()

const bookId = computed(() => (typeof route.params.bookId === 'string' ? route.params.bookId : ''))
const unit = computed(() => Number(route.params.unitId))
const words = computed(() =>
  wordsStore.allWords.filter(
    (word) => word.bookId === bookId.value && word.unit === unit.value && word.lesson === props.lesson,
  ),
)

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
  <div class="unit-words">
    <h2>{{ title }}</h2>
    <p class="page-lead">这些词按单词列出，也会出现在单词本和本单元练习里。</p>
    <div class="toolbar">
      <div class="switches">
        <span class="visibility">
          <el-switch v-model="showChinese" aria-label="显示或隐藏中文" />
          <span>{{ showChinese ? '显示中文' : '隐藏中文' }}</span>
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
      :words="words"
      :scope-key="`${bookId}:${unit}:${lesson}`"
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

.voice-select {
  width: 280px;
}

.voice-hint {
  margin: 0 0 16px;
  color: #909399;
  font-size: 13px;
}
</style>
