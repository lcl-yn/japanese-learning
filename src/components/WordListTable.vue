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
    /** 传入时用这批词，不再跟练习当前课走。 */
    words?: Word[]
    scopeKey?: string
  }>(),
  { voiceUri: '', scopeKey: '' },
)

const pageSizeOptions = [10, 20, 30, 40, 50]

const wordsStore = useWordsStore()
const currentPage = ref(1)
const pageSize = ref(10)
const hiddenKey = ref<string[]>([])

const sourceWords = computed(() => props.words ?? wordsStore.filteredWords)

const listScope = computed(() =>
  props.words
    ? props.scopeKey
    : `${wordsStore.currentBookId}:${wordsStore.currentUnitId}:${wordsStore.currentLessonId}`,
)

const paginatedWords = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return sourceWords.value
    .map((word, order) => ({ word, order }))
    .slice(start, start + pageSize.value)
})

watch(listScope, () => {
  currentPage.value = 1
})

watch(pageSize, () => {
  const totalPages = Math.max(1, Math.ceil(sourceWords.value.length / pageSize.value))
  if (currentPage.value > totalPages) currentPage.value = 1
})

function rowKey(order: number) {
  return `${listScope.value}:${order}`
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

function speechOf(word: Word) {
  return word.part_of_speech.trim()
}
</script>

<template>
  <div class="word-list">
    <el-table :data="paginatedWords" border style="width: 100%">
      <el-table-column label="中文释义" min-width="180" align="center">
        <template #default="{ row }">
          <div v-if="showChinese" class="cn-cell">
            <div>
              <span>{{ row.word.cn }}</span>
              <span v-if="speechOf(row.word)" class="cn-speech"> [{{ speechOf(row.word) }}]</span>
            </div>
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
        :total="sourceWords.length"
        layout="total, sizes, prev, pager, next, jumper"
        prev-text="上一页"
        next-text="下一页"
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
/* text-align: left; */
}

.cn-speech {
  color: #909399;
  font-size: 12px;
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

.pager :deep(.btn-prev),
.pager :deep(.btn-next) {
  width: auto;
  padding: 0 12px;
}
</style>
