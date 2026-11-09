<script setup lang="ts">
import { kanaColumns, type KanaCell, type KanaColumn, type KanaRow } from '@/data/kana'
import { speakJapanese } from '@/utils/speech'

const props = withDefaults(
  defineProps<{
    title: string
    rows: KanaRow[]
    voice?: SpeechSynthesisVoice | null
  }>(),
  { voice: null },
)

function cellAt(row: KanaRow, column: KanaColumn): KanaCell | null {
  return row[column] ?? null
}

function onSpeakCell(row: KanaRow, column: KanaColumn, script: 'hiragana' | 'katakana') {
  const cell = cellAt(row, column)
  if (!cell) return
  speakJapanese(cell[script], props.voice)
}
</script>

<template>
  <section class="kana-chart">
    <h3>{{ title }}</h3>
    <el-table :data="rows" border style="width: 100%">
      <el-table-column v-for="col in kanaColumns" :key="col" :label="col" align="center">
        <template #default="{ row }">
          <div v-if="cellAt(row, col)" class="kana-pair">
            <button type="button" class="kana-btn" @click="onSpeakCell(row, col, 'hiragana')">
              {{ cellAt(row, col)?.hiragana }}<span v-if="cellAt(row, col)?.romaji">({{ cellAt(row, col)?.romaji }})</span>
            </button>
            <button type="button" class="kana-btn" @click="onSpeakCell(row, col, 'katakana')">
              {{ cellAt(row, col)?.katakana }}<span v-if="cellAt(row, col)?.romaji">({{ cellAt(row, col)?.romaji }})</span>
            </button>
          </div>
        </template>
      </el-table-column>
    </el-table>
  </section>
</template>

<style scoped>
.kana-chart {
  margin-bottom: 30px;
}

h3 {
  margin: 0 0 15px;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-h, #08060d);
}

.kana-pair {
  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: 8px;
}

.kana-btn {
  margin: 0;
  padding: 4px 2px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.kana-btn:hover {
  color: var(--accent, #aa3bff);
}
</style>
