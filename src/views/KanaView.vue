<script setup lang="ts">
import { onMounted, ref } from 'vue'
import KanaChart from '@/components/KanaChart.vue'
import { dakuonChart, hiraganaChart, youonChart } from '@/data/kana'
import { loadVoices, type VoiceOption } from '@/utils/speech'
import { KANA_DESCRIPTION } from '@/utils/seo'

const voiceOptions = ref<VoiceOption[]>([])
const selectedVoiceUri = ref('')
const hasJapaneseVoice = ref(false)

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

    <section class="kana-marks">
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
</style>
