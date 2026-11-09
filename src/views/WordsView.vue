<script setup lang="ts">
import { onMounted, ref } from 'vue'
import LessonFilter from '@/components/LessonFilter.vue'
import WordListTable from '@/components/WordListTable.vue'
import { loadVoices, type VoiceOption } from '@/utils/speech'

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
    <div class="toolbar">
      <div class="switches">
        <LessonFilter />
        <el-switch v-model="showChinese" active-text="显示中文" inactive-text="隐藏中文" />
        <el-switch v-model="showJapanese" active-text="显示日文" inactive-text="隐藏日文" />
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
      :show-chinese="showChinese"
      :show-japanese="showJapanese"
      :voice-uri="selectedVoiceUri"
    />
  </div>
</template>

<style scoped>
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

.voice-select {
  width: 280px;
}

.voice-hint {
  margin: 0 0 16px;
  color: #909399;
  font-size: 13px;
}
</style>
