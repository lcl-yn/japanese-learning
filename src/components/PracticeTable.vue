<script setup lang="ts">
import { computed } from 'vue'
import { useWordsStore } from '@/stores/words'
import type { Word } from '@/types/word'
import { emptyAnswer, emptyResult, type PracticeAnswer } from '@/utils/answerCheck'
import { japanesePrompt, visibleDescribe } from '@/utils/wordDisplay'
import { wordKey } from '@/utils/weightedRandom'
import AnswerField from './AnswerField.vue'

const wordsStore = useWordsStore()

const isCn2Jp = computed(() => wordsStore.mode === 'cn2jp')
const promptLabel = computed(() => (isCn2Jp.value ? '中文' : '日语'))
const promptMinWidth = computed(() => (isCn2Jp.value ? 120 : 200))

/** 切换模式或换一批词时重建表格，避免动态列残留旧单元格 */
const tableKey = computed(
  () => `${wordsStore.mode}-${wordsStore.currentWords.map((word) => wordKey(word)).join(',')}`,
)

function promptOf(word: Word) {
  if (isCn2Jp.value) return word.cn
  return japanesePrompt(word.jp, word.jp_write)
}

function describeOf(word: Word) {
  if (!isCn2Jp.value) return ''
  return visibleDescribe(word.describe)
}

function answerAt(index: number): PracticeAnswer {
  return wordsStore.userAnswers[index] ?? emptyAnswer()
}

function resultAt(index: number) {
  return wordsStore.answerResults[index] ?? emptyResult()
}

function setField(index: number, field: keyof PracticeAnswer, value: string) {
  wordsStore.userAnswers[index] = { ...answerAt(index), [field]: value }
}
</script>

<template>
  <el-table :key="tableKey" :data="wordsStore.wordPairs" style="width: 100%">
    <el-table-column :label="promptLabel" :min-width="promptMinWidth">
      <template #default="{ row }">
        <div v-if="row.word1" class="prompt-cell">
          <div :class="{ 'prompt-nowrap': !isCn2Jp }">{{ promptOf(row.word1) }}</div>
          <div v-if="describeOf(row.word1)" class="prompt-describe">单词说明：{{ describeOf(row.word1) }}</div>
        </div>
      </template>
    </el-table-column>

    <el-table-column v-if="isCn2Jp" label="日语假名" min-width="150">
      <template #default="{ row }">
        <AnswerField
          v-if="row.word1 && row.index1 != null"
          :model-value="answerAt(row.index1).kana"
          placeholder="请输入假名"
          :checked="wordsStore.answersChecked"
          :correct="resultAt(row.index1).kana"
          :expected="row.word1.jp"
          @update:model-value="setField(row.index1, 'kana', $event)"
        />
      </template>
    </el-table-column>

    <el-table-column v-if="isCn2Jp" label="日语手写" min-width="150">
      <template #default="{ row }">
        <AnswerField
          v-if="row.word1 && row.index1 != null"
          :model-value="answerAt(row.index1).write"
          placeholder="请输入日语手写"
          :checked="wordsStore.answersChecked"
          :correct="resultAt(row.index1).write"
          :expected="row.word1.jp_write"
          @update:model-value="setField(row.index1, 'write', $event)"
        />
      </template>
    </el-table-column>

    <el-table-column v-if="!isCn2Jp" label="中文" min-width="150">
      <template #default="{ row }">
        <AnswerField
          v-if="row.word1 && row.index1 != null"
          :model-value="answerAt(row.index1).cn"
          placeholder="请输入中文"
          :checked="wordsStore.answersChecked"
          :correct="resultAt(row.index1).cn"
          :expected="row.word1.cn"
          @update:model-value="setField(row.index1, 'cn', $event)"
        />
      </template>
    </el-table-column>

    <el-table-column :label="promptLabel" :min-width="promptMinWidth">
      <template #default="{ row }">
        <div v-if="row.word2" class="prompt-cell">
          <div :class="{ 'prompt-nowrap': !isCn2Jp }">{{ promptOf(row.word2) }}</div>
          <div v-if="describeOf(row.word2)" class="prompt-describe">单词说明：{{ describeOf(row.word2) }}</div>
        </div>
      </template>
    </el-table-column>

    <el-table-column v-if="isCn2Jp" label="日语假名" min-width="150">
      <template #default="{ row }">
        <AnswerField
          v-if="row.word2 && row.index2 != null"
          :model-value="answerAt(row.index2).kana"
          placeholder="请输入假名"
          :checked="wordsStore.answersChecked"
          :correct="resultAt(row.index2).kana"
          :expected="row.word2.jp"
          @update:model-value="setField(row.index2, 'kana', $event)"
        />
      </template>
    </el-table-column>

    <el-table-column v-if="isCn2Jp" label="日语手写" min-width="150">
      <template #default="{ row }">
        <AnswerField
          v-if="row.word2 && row.index2 != null"
          :model-value="answerAt(row.index2).write"
          placeholder="请输入日语手写"
          :checked="wordsStore.answersChecked"
          :correct="resultAt(row.index2).write"
          :expected="row.word2.jp_write"
          @update:model-value="setField(row.index2, 'write', $event)"
        />
      </template>
    </el-table-column>

    <el-table-column v-if="!isCn2Jp" label="中文" min-width="150">
      <template #default="{ row }">
        <AnswerField
          v-if="row.word2 && row.index2 != null"
          :model-value="answerAt(row.index2).cn"
          placeholder="请输入中文"
          :checked="wordsStore.answersChecked"
          :correct="resultAt(row.index2).cn"
          :expected="row.word2.cn"
          @update:model-value="setField(row.index2, 'cn', $event)"
        />
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.prompt-nowrap {
  white-space: nowrap;
}

.prompt-describe {
  margin-top: 4px;
  color: #909399;
  font-size: 13px;
  line-height: 1.4;
  white-space: pre-line;
}
</style>
