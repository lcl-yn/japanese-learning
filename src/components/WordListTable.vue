<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ZoomIn } from '@element-plus/icons-vue'
import { useWordsStore } from '@/stores/words'
import type { Word } from '@/types/word'
import { speakJapanese } from '@/utils/speech'
import { visibleDescribe } from '@/utils/wordDisplay'

const props = withDefaults(
  defineProps<{
    showChinese: boolean
    showJpWrite: boolean
    showJapanese: boolean
    voiceUri?: string
    /** 传入时用这批词，不再跟练习当前课走。 */
    words?: Word[]
    scopeKey?: string
    /** 开发时在最右侧放出修改。 */
    editable?: boolean
    /** 为 false 时不显示书写、假名的行内隐藏，并直接列出原文。 */
    rowHide?: boolean
  }>(),
  { voiceUri: '', scopeKey: '', editable: false, rowHide: true },
)

const emit = defineEmits<{
  edit: [word: Word]
}>()

const pageSizeOptions = [10, 20, 30, 40, 50]

const wordsStore = useWordsStore()
const currentPage = ref(1)
const pageSize = ref(10)
const hiddenKey = ref<string[]>([])
const hiddenWriteKey = ref<string[]>([])

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
  return props.rowHide && hiddenKey.value.includes(rowKey(order))
}

function isWriteHidden(order: number) {
  return props.rowHide && hiddenWriteKey.value.includes(rowKey(order))
}

function toggleHide(order: number) {
  const key = rowKey(order)
  if (isRowHidden(order)) {
    hiddenKey.value = hiddenKey.value.filter((item) => item !== key)
    return
  }
  hiddenKey.value = [...hiddenKey.value, key]
}

function toggleWriteHide(order: number) {
  const key = rowKey(order)
  if (isWriteHidden(order)) {
    hiddenWriteKey.value = hiddenWriteKey.value.filter((item) => item !== key)
    return
  }
  hiddenWriteKey.value = [...hiddenWriteKey.value, key]
}

function onSpeak(word: Word) {
  speakJapanese(word.jp, props.voiceUri)
}

function canZoomWrite(word: Word, order: number) {
  return word.jp_write.trim() !== '' && !isWriteHidden(order)
}

const zoomedWrite = ref('')

const zoomOpen = computed({
  get: () => zoomedWrite.value !== '',
  set: (open: boolean) => {
    if (!open) zoomedWrite.value = ''
  },
})

/** 放大这一条日文书写，方便看清写法。 */
function openWriteZoom(text: string) {
  zoomedWrite.value = text
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

      <el-table-column label="日文书写" min-width="180" align="center">
        <template #default="{ row }">
          <div v-if="showJpWrite" class="jp-write-cell">
            <span class="jp-write" :class="{ 'hidden-text': isWriteHidden(row.order) }">
              {{ isWriteHidden(row.order) ? '***隐藏***' : row.word.jp_write }}
            </span>
            <div class="jp-actions">
              <el-button
                v-if="canZoomWrite(row.word, row.order)"
                size="small"
                aria-label="放大日文书写"
                @click="openWriteZoom(row.word.jp_write)"
              >
                <el-icon :size="14"><ZoomIn /></el-icon>
              </el-button>
              <el-button v-if="rowHide" size="small" @click="toggleWriteHide(row.order)">
                {{ isWriteHidden(row.order) ? '显示' : '隐藏' }}
              </el-button>
            </div>
          </div>
          <span v-else class="hidden-text">***隐藏***</span>
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
              <el-button v-if="rowHide" size="small" @click="toggleHide(row.order)">
                {{ isRowHidden(row.order) ? '显示' : '隐藏' }}
              </el-button>
            </div>
          </div>
          <span v-else class="hidden-text">***隐藏***</span>
        </template>
      </el-table-column>

      <el-table-column v-if="editable" label="操作" width="90" align="center" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="emit('edit', row.word)">修改</el-button>
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

    <el-dialog
      v-model="zoomOpen"
      title="日文书写"
      width="min(640px, 92vw)"
      append-to-body
      class="jp-write-zoom-dialog"
    >
      <p class="jp-write-zoom">{{ zoomedWrite }}</p>
      <template #footer>
        <el-button @click="zoomOpen = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.hidden-text {
  color: #ccc;
}

.cn-cell {
  line-height: 1.4;
  text-align: left;
  font-weight: bold;
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

.jp-write-cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.jp-write {
  flex: 1;
  text-align: left;
  font-weight: bold;
}

.jp-write-zoom {
  margin: 8px 0 0;
  color: #222;
  text-align: center;
  font-weight: 500;
  line-height: 1.35;
  font-size: clamp(72px, 24vw, 128px);
  overflow-wrap: anywhere;
}

.jp-text {
  flex: 1;
  padding-right: 10px;
  text-align: left;
  font-weight: bold;
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
