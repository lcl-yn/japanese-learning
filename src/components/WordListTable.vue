<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useWordsStore } from '@/stores/words'
import type { Word } from '@/types/word'
import { speakJapanese } from '@/utils/speech'

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
  return wordsStore.filteredWords.slice(start, start + pageSize.value)
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

function rowKey(word: Word) {
  return `${word.courseId}:${word.lesson}:${word.index}`
}

function formatChinese(word: Word) {
  return `${word.cn}------${word.part_of_speech}------${word.jp_kanji}`
}

function isRowHidden(word: Word) {
  return hiddenKey.value.includes(rowKey(word))
}

function toggleHide(word: Word) {
  const key = rowKey(word)
  if (isRowHidden(word)) {
    hiddenKey.value = hiddenKey.value.filter((item) => item !== key)
    return
  }
  hiddenKey.value = [...hiddenKey.value, key]
}

function onSpeak(word: Word) {
  speakJapanese(word.jp, props.voiceUri)
}
</script>

<template>
  <div class="word-list">
    <el-table :data="paginatedWords" border style="width: 100%">
      <el-table-column label="中文" align="center">
        <template #default="{ row }">
          <span v-if="showChinese">{{ formatChinese(row) }}</span>
          <span v-else class="hidden-text">***隐藏***</span>
        </template>
      </el-table-column>

      <el-table-column label="日语" align="center">
        <template #default="{ row }">
          <div v-if="showJapanese" class="jp-cell">
            <span class="jp-text" :class="{ 'hidden-text': isRowHidden(row) }">
              {{ isRowHidden(row) ? '***隐藏***' : row.jp }}
            </span>
            <div class="jp-actions">
              <el-button size="small" @click="onSpeak(row)">朗读</el-button>
              <el-button size="small" @click="toggleHide(row)">
                {{ isRowHidden(row) ? '显示' : '隐藏' }}
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
