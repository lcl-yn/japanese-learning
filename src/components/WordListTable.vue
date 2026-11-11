<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useWordsStore } from '@/stores/words'
import type { Word } from '@/types/word'
import { speakJapanese } from '@/utils/speech'
import { visibleDescribe } from '@/utils/wordDisplay'

const props = withDefaults(
  defineProps<{
    showChinese: boolean
    showJapanese: boolean
    voiceUri?: string
  }>(),
  { voiceUri: '' },
)

const pageSizeOptions = [10, 20, 30, 40, 50]

const wordsStore = useWordsStore()
const currentPage = ref(1)
const pageSize = ref(10)
const hiddenKey = ref<string[]>([])

const paginatedWords = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return wordsStore.filteredWords
    .map((word, order) => ({ word, order }))
    .slice(start, start + pageSize.value)
})

watch(
  () => [wordsStore.currentCourseId, wordsStore.currentLessonId],
  () => {
    currentPage.value = 1
  },
)

watch(pageSize, () => {
  const totalPages = Math.max(1, Math.ceil(wordsStore.filteredWords.length / pageSize.value))
  if (currentPage.value > totalPages) currentPage.value = 1
})

function rowKey(order: number) {
  return `${wordsStore.currentCourseId}:${wordsStore.currentLessonId}:${order}`
}

function isRowHidden(order: number) {
  return hiddenKey.value.includes(rowKey(order))
}

function toggleHide(order: number) {
  const key = rowKey(order)
  if (isRowHidden(order)) {
    hiddenKey.value = hiddenKey.value.filter((item) => item !== key)
    return
  }
  hiddenKey.value = [...hiddenKey.value, key]
}

function onSpeak(word: Word) {
  speakJapanese(word.jp, props.voiceUri)
}

function describeOf(word: Word) {
  return visibleDescribe(word.describe)
}
</script>

<template>
  <div class="word-list">
    <el-table :data="paginatedWords" border style="width: 100%">
      <el-table-column label="中文释义" min-width="180" align="center">
        <template #default="{ row }">
          <div v-if="showChinese" class="cn-cell">
            <div>{{ row.word.cn }}</div>
            <div v-if="describeOf(row.word)" class="cn-describe">单词说明：{{ describeOf(row.word) }}</div>
          </div>
          <span v-else class="hidden-text">***隐藏***</span>
        </template>
      </el-table-column>

      <el-table-column label="日文书写" min-width="140" align="center">
        <template #default="{ row }">
          {{ row.word.jp_write }}
        </template>
      </el-table-column>

      <el-table-column label="词性" width="100" align="center">
        <template #default="{ row }">
          {{ row.word.part_of_speech }}
        </template>
      </el-table-column>

      <el-table-column label="读音（假名）" min-width="240" align="center">
        <template #default="{ row }">
          <div v-if="showJapanese" class="jp-cell">
            <span class="jp-text" :class="{ 'hidden-text': isRowHidden(row.order) }">
              {{ isRowHidden(row.order) ? '***隐藏***' : row.word.jp }}
            </span>
            <div class="jp-actions">
              <el-button size="small" @click="onSpeak(row.word)">朗读</el-button>
              <el-button size="small" @click="toggleHide(row.order)">
                {{ isRowHidden(row.order) ? '显示' : '隐藏' }}
              </el-button>
            </div>
          </div>
          <span v-else class="hidden-text">***隐藏***</span>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="pageSizeOptions"
        :total="wordsStore.filteredWords.length"
        layout="total, sizes, prev, pager, next, jumper"
      />
    </div>
  </div>
</template>

<style scoped>
.hidden-text {
  color: #ccc;
}

.cn-cell {
  line-height: 1.4;
}

.cn-describe {
  margin-top: 4px;
  color: #909399;
  font-size: 13px;
  text-align: left;
  white-space: pre-line;
}

.jp-cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.jp-text {
  flex: 1;
  padding-right: 10px;
  text-align: left;
}

.jp-actions {
  display: flex;
  gap: 10px;
}

.pager {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}
</style>
