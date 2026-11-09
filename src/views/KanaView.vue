<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import KanaChart from '@/components/KanaChart.vue'
import { dakuonChart, hiraganaChart, youonChart } from '@/data/kana'
import { loadVoices } from '@/utils/speech'

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
  <div class="kana-view">
    <h2>50音图</h2>
    <div class="toolbar">
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

    <KanaChart title="基本50音" :rows="hiraganaChart" :voice="selectedVoice" />
    <KanaChart title="拗音" :rows="youonChart" :voice="selectedVoice" />
    <KanaChart title="浊音半浊音" :rows="dakuonChart" :voice="selectedVoice" />
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
  width: 200px;
}
</style>
