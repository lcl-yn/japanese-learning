<script setup lang="ts">
import { onMounted, ref } from 'vue'
import KanaChart from '@/components/KanaChart.vue'
import { dakuonChart, hiraganaChart, youonChart } from '@/data/kana'
import { loadVoices, type VoiceOption } from '@/utils/speech'

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
  // 没有日语引擎时保持空选，朗读走 lang=ja-JP（与 legacy 一致）
  selectedVoiceUri.value = japanese?.voiceURI ?? ''
})
</script>

<template>
  <div class="kana-view">
    <h2>50音图</h2>
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
  </div>
</template>

<style scoped>
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
</style>
