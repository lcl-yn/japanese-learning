<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import GrammarEditor from '@/components/GrammarEditor.vue'
import GrammarOutline from '@/components/GrammarOutline.vue'
import { loadLessonDocument, loadUnitPageDocument, saveLessonDocument, saveUnitPageDocument } from '@/services/grammarLoader'
import type { GrammarDocument } from '@/types/grammar'
import {
  grammarHasText,
  isGrammarDocument,
  isGrammarLocation,
  isUnitPageLocation,
  type LessonSection,
} from '@/utils/grammarDocument'
import { grammarOutline } from '@/utils/grammarOutline'
import { GRAMMAR_DESCRIPTION, READING_DESCRIPTION } from '@/utils/seo'

const props = defineProps<{
  section: LessonSection
}>()

const PAGE = {
  grammar: {
    description: GRAMMAR_DESCRIPTION,
    loading: '语法加载中…',
    empty: '这一课还没有语法。',
    loadFailed: '语法加载失败',
    saveFailed: '语法保存失败',
    placeholder: '写下这一课的语法…',
    editorLabel: '语法笔记',
    toolbarLabel: '语法格式',
  },
  reading: {
    description: READING_DESCRIPTION,
    loading: '课文加载中…',
    empty: '这一课还没有课文。',
    loadFailed: '课文加载失败',
    saveFailed: '课文保存失败',
    placeholder: '写下这一课的课文…',
    editorLabel: '课文',
    toolbarLabel: '课文格式',
  },
} as const

const route = useRoute()
const canEdit = import.meta.env.DEV

const loading = ref(false)
const saving = ref(false)
const editing = ref(false)
const error = ref('')
const editorKey = ref(0)
const editorRef = ref<{ scrollToHeading: (index: number) => void } | null>(null)
const activeHeading = ref<number | null>(null)
const outlineOpen = ref(false)
const baseline = ref<GrammarDocument | null>(null)
const draft = ref<GrammarDocument | null>(null)
let loadRequest = 0

const page = computed(() => PAGE[props.section])
const bookId = computed(() => (typeof route.params.bookId === 'string' ? route.params.bookId : ''))
const unit = computed(() => Number(route.params.unitId))
const lesson = computed(() => Number(route.params.lessonId))
const pageId = computed(() => (typeof route.params.pageId === 'string' ? route.params.pageId : ''))
const hasText = computed(() => baseline.value !== null && grammarHasText(baseline.value))
const outline = computed(() => {
  const document = editing.value ? draft.value : baseline.value
  return document ? grammarOutline(document) : []
})
const showOutline = computed(() => !loading.value && !error.value && (editing.value || hasText.value))
const dirty = computed(
  () => editing.value && JSON.stringify(draft.value) !== JSON.stringify(baseline.value),
)

watch(
  [bookId, unit, lesson, pageId, () => props.section],
  () => {
    void load()
  },
  { immediate: true },
)

onBeforeRouteLeave(() => confirmLeave())
onBeforeRouteUpdate(() => confirmLeave())

/**
 * 读取当前课的课文或语法。快速切换课次时，只保留最后一次结果。
 */
async function load(): Promise<void> {
  const requestId = ++loadRequest
  const section = props.section
  loading.value = true
  error.value = ''
  editing.value = false
  activeHeading.value = null
  outlineOpen.value = false
  const unitPage = pageId.value
  if (unitPage) {
    if (!isUnitPageLocation(bookId.value, unit.value, unitPage)) {
      baseline.value = null
      draft.value = null
      error.value = '找不到这一页'
      loading.value = false
      return
    }
  } else if (!isGrammarLocation(bookId.value, unit.value, lesson.value)) {
    baseline.value = null
    draft.value = null
    error.value = '找不到这一课'
    loading.value = false
    return
  }
  try {
    const document = unitPage
      ? await loadUnitPageDocument(bookId.value, unit.value, unitPage)
      : await loadLessonDocument(section, bookId.value, unit.value, lesson.value)
    if (requestId !== loadRequest) return
    baseline.value = document
    draft.value = copyDocument(document)
  } catch (caught) {
    if (requestId !== loadRequest) return
    baseline.value = null
    draft.value = null
    error.value = caught instanceof Error ? caught.message : page.value.loadFailed
  } finally {
    if (requestId === loadRequest) loading.value = false
  }
}

function startEdit(): void {
  if (!baseline.value || !canEdit) return
  draft.value = copyDocument(baseline.value)
  editing.value = true
}

async function save(): Promise<void> {
  if (!draft.value || !dirty.value || saving.value) return
  saving.value = true
  try {
    if (pageId.value) {
      await saveUnitPageDocument({
        bookId: bookId.value,
        unit: unit.value,
        pageId: pageId.value,
        document: draft.value,
      })
    } else {
      await saveLessonDocument(props.section, {
        bookId: bookId.value,
        unit: unit.value,
        lesson: lesson.value,
        document: draft.value,
      })
    }
    baseline.value = copyDocument(draft.value)
    editing.value = false
    ElMessage.success('已保存')
  } catch (caught) {
    ElMessage.error(caught instanceof Error ? caught.message : page.value.saveFailed)
  } finally {
    saving.value = false
  }
}

function cancel(): void {
  if (!baseline.value) return
  draft.value = copyDocument(baseline.value)
  editing.value = false
  editorKey.value += 1
}

function onDraft(document: GrammarDocument): void {
  draft.value = document
}

function copyDocument(document: GrammarDocument): GrammarDocument {
  const raw: unknown = JSON.parse(JSON.stringify(document))
  if (!isGrammarDocument(raw)) throw new Error(page.value.saveFailed)
  return raw
}

function selectHeading(index: number): void {
  outlineOpen.value = false
  activeHeading.value = index
  editorRef.value?.scrollToHeading(index)
}

function onOutlineKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') outlineOpen.value = false
}

watch(outlineOpen, (open) => {
  if (open) window.addEventListener('keydown', onOutlineKeydown)
  else window.removeEventListener('keydown', onOutlineKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onOutlineKeydown)
})

/**
 * 还在编辑、没有保存时，先确认再离开。
 * 点取消或保存之后不再拦。
 *
 * @return 可以离开时为 true
 */
async function confirmLeave(): Promise<boolean> {
  if (!editing.value) return true
  try {
    const editingPage = pageId.value !== ''
    await ElMessageBox.confirm(
      editingPage ? '这一页还在编辑，离开后没有保存的修改会丢掉。' : '这一课还在编辑，离开后没有保存的修改会丢掉。',
      editingPage ? '离开这一页' : '离开这一课',
      {
        confirmButtonText: '离开',
        cancelButtonText: '留在这里',
        type: 'warning',
        closeOnClickModal: false,
      },
    )
    return true
  } catch {
    return false
  }
}
</script>

<template>
  <section class="lesson-view" :aria-busy="loading">
    <div class="lesson-body">
      <aside v-if="showOutline" class="lesson-outline" aria-label="标题">
        <p class="outline-title">标题</p>
        <p v-if="outline.length === 0" class="outline-empty">把段落设成标题后，这里会列出。</p>
        <GrammarOutline v-else :items="outline" :active-index="activeHeading" @select="selectHeading" />
      </aside>

      <div class="lesson-column">
        <div class="lesson-bar">
          <p class="page-lead">{{ pageId ? '按课文阅读这一页，知识点用红色标出。' : page.description }}</p>
          <div v-if="canEdit && !loading && !error" class="actions">
            <el-button v-if="!editing" type="primary" @click="startEdit">
              {{ hasText ? '编辑' : pageId ? '写这一页' : '写这一课' }}
            </el-button>
            <template v-else>
              <el-button type="primary" :loading="saving" :disabled="!dirty" @click="save">保存</el-button>
              <el-button :disabled="saving" @click="cancel">取消</el-button>
            </template>
          </div>
        </div>

        <p v-if="loading" class="status">{{ page.loading }}</p>
        <p v-else-if="error" class="error">{{ error }}</p>
        <template v-else>
          <p v-if="!editing && !hasText" class="status">{{ pageId ? '这一页还没有内容。' : page.empty }}</p>
          <GrammarEditor
            v-else-if="baseline"
            ref="editorRef"
            :key="`${section}-${bookId}-${unit}-${pageId || lesson}-${editorKey}`"
            :document="baseline"
            :editable="editing"
            :placeholder="page.placeholder"
            :label="page.editorLabel"
            :toolbar-label="page.toolbarLabel"
            :allow-audio="section === 'reading'"
            :audio-lesson="section === 'reading' ? lesson : null"
            :audio-book-id="section === 'reading' ? bookId : null"
            @update="onDraft"
          />
        </template>
      </div>
    </div>

    <Teleport to="#outline-anchor">
      <button
        v-if="outline.length > 0"
        type="button"
        class="outline-fab"
        :aria-expanded="outlineOpen"
        @click="outlineOpen = !outlineOpen"
      >
        笔记目录
      </button>
    </Teleport>
    <Teleport to="body">
      <div v-if="outlineOpen" class="outline-sheet" @click="outlineOpen = false">
        <div
          class="outline-panel"
          role="dialog"
          aria-label="标题"
          @click.stop
        >
          <div class="outline-panel-bar">
            <p class="outline-title">标题</p>
            <button type="button" class="outline-close" @click="outlineOpen = false">关闭</button>
          </div>
          <GrammarOutline :items="outline" :active-index="activeHeading" @select="selectHeading" />
        </div>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.lesson-body {
  display: grid;
  grid-template-columns: minmax(0, 8fr) minmax(0, 2fr);
  align-items: start;
  gap: 20px;
  width: 100%;
}

.lesson-column {
  grid-column: 1;
  grid-row: 1;
  min-width: 0;
}

.lesson-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px 20px;
  margin-bottom: 16px;
}

.page-lead,
.status {
  margin: 0;
  color: #57534e;
  font-size: 14px;
  line-height: 1.6;
}

.actions {
  display: flex;
  gap: 8px;
}

.error {
  margin: 0;
  color: #9f3d2f;
}

.lesson-outline {
  grid-column: 2;
  grid-row: 1;
  position: sticky;
  top: 0;
  box-sizing: border-box;
  min-width: 0;
  max-height: calc(100vh - 132px);
  overflow: auto;
  padding: 12px 12px 16px;
  background: #fbf8f3;
  border: 1px solid #e4ddd2;
  border-radius: 8px;
}

.outline-title {
  margin: 0 0 8px;
  color: #57534e;
  font-size: 13px;
  line-height: 1.5;
}

.outline-empty {
  margin: 0;
  color: #a8a29e;
  font-size: 13px;
  line-height: 1.5;
}

.outline-fab,
.outline-sheet {
  display: none;
}

.outline-fab {
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 12px;
  border: 1px solid #e4ddd2;
  border-radius: 999px;
  background: #fbf8f3;
  color: #9f3d2f;
  font: inherit;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}

.outline-fab:focus-visible,
.outline-close:focus-visible {
  outline: 2px solid #9f3d2f;
  outline-offset: 2px;
}

.outline-sheet {
  position: fixed;
  z-index: 40;
  inset: 0;
  background: rgb(28 25 23 / 35%);
}

.outline-panel {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  box-sizing: border-box;
  max-height: min(70vh, 480px);
  overflow: auto;
  padding: 8px 16px 20px;
  background: #fbf8f3;
  border-radius: 16px 16px 0 0;
}

.outline-panel-bar {
  position: sticky;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  padding: 8px 0;
  background: #fbf8f3;
}

.outline-panel .outline-title {
  margin: 0;
}

.outline-close {
  border: none;
  background: transparent;
  color: #57534e;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.outline-panel :deep(.outline-link) {
  padding: 10px 8px;
  font-size: 15px;
  white-space: normal;
}

@media (max-width: 959px) {
  .lesson-body {
    grid-template-columns: minmax(0, 1fr);
  }

  .lesson-column {
    grid-row: 1;
  }

  .lesson-outline {
    display: none;
  }

  .outline-fab {
    display: inline-flex;
  }

  .outline-sheet {
    display: block;
  }
}
</style>
