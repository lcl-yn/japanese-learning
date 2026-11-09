<script setup lang="ts">
import { Check, Close } from '@element-plus/icons-vue'
import { computed } from 'vue'
import { useWordsStore } from '@/stores/words'
import type { Word } from '@/types/word'
import { visibleDescribe } from '@/utils/wordDisplay'
import { wordKey } from '@/utils/weightedRandom'

const wordsStore = useWordsStore()

const promptLabel = computed(() => (wordsStore.mode === 'cn2jp' ? '中文' : '日语'))
const answerLabel = computed(() => (wordsStore.mode === 'cn2jp' ? '日语' : '中文'))
const answerPlaceholder = computed(() => (wordsStore.mode === 'cn2jp' ? '请输入日语' : '请输入中文'))

/** Element Plus 动态列 v-if 切换时会残留旧单元格 DOM，用 key 强制重建表格 */
const tableKey = computed(
  () =>
    `${wordsStore.mode}-${wordsStore.answersChecked}-${wordsStore.currentWords.map((word) => wordKey(word)).join(',')}`,
)

function promptOf(word: Word) {
  return wordsStore.mode === 'cn2jp' ? word.cn : word.jp
}

function describeOf(word: Word) {
  if (wordsStore.mode !== 'cn2jp') return ''
  return visibleDescribe(word.describe)
}

function expectedOf(word: Word) {
  return wordsStore.mode === 'cn2jp' ? word.jp : word.cn
}

function setAnswer(index: number, value: string) {
  wordsStore.userAnswers[index] = value
}
</script>

<template>
  <el-table :key="tableKey" :data="wordsStore.wordPairs" style="width: 100%">
    <el-table-column :label="promptLabel">
      <template #default="{ row }">
        <div v-if="row.word1" class="prompt-cell">
          <div>{{ promptOf(row.word1) }}</div>
          <div v-if="describeOf(row.word1)" class="prompt-describe">单词说明：{{ describeOf(row.word1) }}</div>
        </div>
      </template>
    </el-table-column>

    <el-table-column :label="answerLabel">
      <template #default="{ row }">
        <el-input
          v-if="row.word1 && row.index1 != null"
          :model-value="wordsStore.userAnswers[row.index1] ?? ''"
          :placeholder="answerPlaceholder"
          @update:model-value="setAnswer(row.index1, $event)"
        />
      </template>
    </el-table-column>

    <el-table-column v-if="wordsStore.answersChecked" label="结果">
      <template #default="{ row }">
        <span v-if="row.word1 && row.index1 != null && wordsStore.answerResults[row.index1]" class="correct">
          <el-icon><Check /></el-icon>
          正确
        </span>
        <span v-else-if="row.word1" class="incorrect">
          <el-icon><Close /></el-icon>
          错误
          <div>正确答案: {{ expectedOf(row.word1) }}</div>
        </span>
      </template>
    </el-table-column>

    <el-table-column :label="promptLabel">
      <template #default="{ row }">
        <div v-if="row.word2" class="prompt-cell">
          <div>{{ promptOf(row.word2) }}</div>
          <div v-if="describeOf(row.word2)" class="prompt-describe">单词说明：{{ describeOf(row.word2) }}</div>
        </div>
      </template>
    </el-table-column>

    <el-table-column :label="answerLabel">
      <template #default="{ row }">
        <el-input
          v-if="row.word2 && row.index2 != null"
          :model-value="wordsStore.userAnswers[row.index2] ?? ''"
          :placeholder="answerPlaceholder"
          @update:model-value="setAnswer(row.index2, $event)"
        />
      </template>
    </el-table-column>

    <el-table-column v-if="wordsStore.answersChecked" label="结果">
      <template #default="{ row }">
        <span v-if="row.word2 && row.index2 != null && wordsStore.answerResults[row.index2]" class="correct">
          <el-icon><Check /></el-icon>
          正确
        </span>
        <span v-else-if="row.word2" class="incorrect">
          <el-icon><Close /></el-icon>
          错误
          <div>正确答案: {{ expectedOf(row.word2) }}</div>
        </span>
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.correct {
  color: #67c23a;
  font-weight: bold;
}

.incorrect {
  color: #f56c6c;
}

.correct :deep(.el-icon),
.incorrect :deep(.el-icon) {
  vertical-align: middle;
  margin-right: 2px;
}

.prompt-describe {
  margin-top: 4px;
  color: #909399;
  font-size: 13px;
  line-height: 1.4;
  white-space: pre-line;
}
</style>
