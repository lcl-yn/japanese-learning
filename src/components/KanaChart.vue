<script setup lang="ts">
import { kanaColumns, type KanaCell, type KanaColumn, type KanaRow } from '@/data/kana'
import { phoneLayout } from '@/utils/phoneLayout'
import { speakJapanese } from '@/utils/speech'

/** 五段在手机卡片上用假名标出，和列顺序一致。 */
const vowelHeads = ['あ', 'い', 'う', 'え', 'お']

const props = withDefaults(
  defineProps<{
    title: string
    rows: KanaRow[]
    voiceUri?: string
  }>(),
  { voiceUri: '' },
)

function cellAt(row: KanaRow, column: KanaColumn): KanaCell | null {
  return row[column] ?? null
}

/** 卡片上的平假名和片假名读音相同，不传时只读平假名。 */
function onSpeakCell(row: KanaRow, column: KanaColumn, script: 'hiragana' | 'katakana' = 'hiragana') {
  const cell = cellAt(row, column)
  if (!cell) return
  speakJapanese(cell[script], props.voiceUri)
}

/** 拗音是两个字，横排会挤出格子，仍上下叠放。 */
function scriptPairStacks(cell: KanaCell | null): boolean {
  if (!cell) return false
  return cell.hiragana.length > 1 || cell.katakana.length > 1
}
</script>

<template>
  <section class="kana-chart">
    <h3>{{ title }}</h3>
    <div v-if="phoneLayout" class="kana-board">
      <div class="vowel-row" aria-hidden="true">
        <span v-for="vowel in vowelHeads" :key="vowel">{{ vowel }}</span>
      </div>
      <div v-for="(row, rowIndex) in rows" :key="rowIndex" class="kana-row">
        <template v-for="col in kanaColumns" :key="col">
          <button
            v-if="cellAt(row, col)"
            type="button"
            class="kana-tile"
            :class="{ 'is-stacked': scriptPairStacks(cellAt(row, col)) }"
            @click="onSpeakCell(row, col)"
          >
            <span class="scripts" :class="{ 'is-stacked': scriptPairStacks(cellAt(row, col)) }">
              <span class="hira">{{ cellAt(row, col)?.hiragana }}</span>
              <span class="kata">{{ cellAt(row, col)?.katakana }}</span>
            </span>
            <span class="roma">{{ cellAt(row, col)?.romaji }}</span>
          </button>
          <div v-else class="kana-tile is-empty" />
        </template>
      </div>
    </div>
    <el-table v-else :data="rows" border style="width: 100%">
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

.kana-board {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vowel-row,
.kana-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
}

.vowel-row span {
  color: #f8882c;
  font-size: 12px;
  font-weight: 700;
  text-align: center;
}

.kana-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  min-width: 0;
  padding: 6px 0 5px;
  border: 0;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 6px 16px rgb(92 72 40 / 6%);
  color: inherit;
  font: inherit;
}

button.kana-tile {
  cursor: pointer;
}

.kana-tile:active .hira,
.kana-tile:active .kata {
  color: #f8882c;
}

.kana-tile:focus-visible {
  outline: 2px solid #f8882c;
  outline-offset: 2px;
}

.kana-tile.is-empty {
  background: transparent;
  box-shadow: none;
}

.scripts {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
}

.scripts.is-stacked {
  flex-direction: column;
  gap: 2px;
}

.hira,
.kata {
  color: #2c2824;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.15;
}

.kata {
  color: #6f6a62;
}

.roma {
  margin-top: 2px;
  color: #b0a89c;
  font-size: 10px;
  letter-spacing: 0.02em;
}

html[data-layout='phone'] h3 {
  margin: 14px 0 8px;
  text-align: left;
  color: #8a8478;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.12em;
}
</style>
