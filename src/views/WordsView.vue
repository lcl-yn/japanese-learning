<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import LessonFilter from '@/components/LessonFilter.vue'
import WordListTable from '@/components/WordListTable.vue'
import { loadVoices } from '@/utils/speech'

const showChinese = ref(true)
const showJapanese = ref(true)
const japaneseVoices = ref<SpeechSynthesisVoice[]>([])
const selectedVoiceUri = ref('')

const selectedVoice = computed(
  () => japaneseVoices.value.find((voice) => voice.voiceURI === selectedVoiceUri.value) ?? null,
)

onMounted(async () => {
  const voices = await loadVoices()
  japaneseVoices.value = voices.filter((voice) => voice.lang === 'ja-JP')
  const preferred =
    japaneseVoices.value.find((voice) => voice.name.includes('Microsoft Ichiro')) ??
    japaneseVoices.value[0]
  if (preferred) selectedVoiceUri.value = preferred.voiceURI
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
        <el-select v-model="selectedVoiceUri" class="voice-select" placeholder="选择语音" clearable>
          <el-option
            v-for="voice in japaneseVoices"
            :key="voice.voiceURI"
            :label="voice.name"
            :value="voice.voiceURI"
          />
        </el-select>
      </div>
    </div>

    <WordListTable :show-chinese="showChinese" :show-japanese="showJapanese" :voice="selectedVoice" />
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
  width: 200px;
}
</style>
