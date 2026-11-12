<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import GrammarEditor from '@/components/GrammarEditor.vue'
import GrammarOutline from '@/components/GrammarOutline.vue'
import { loadGrammarDocument, saveGrammarDocument } from '@/services/grammarLoader'
import type { GrammarDocument } from '@/types/grammar'
import { grammarHasText, isGrammarDocument, isGrammarLocation } from '@/utils/grammarDocument'
import { grammarOutline } from '@/utils/grammarOutline'
import { GRAMMAR_DESCRIPTION } from '@/utils/seo'

const route = useRoute()
const canEdit = import.meta.env.DEV

const loading = ref(false)
const saving = ref(false)
const editing = ref(false)
const error = ref('')
const editorKey = ref(0)
const editorRef = ref<{ scrollToHeading: (index: number) => void } | null>(null)
const activeHeading = ref<number | null>(null)
const baseline = ref<GrammarDocument | null>(null)
const draft = ref<GrammarDocument | null>(null)
let loadRequest = 0

const bookId = computed(() => (typeof route.params.bookId === 'string' ? route.params.bookId : ''))
const unit = computed(() => Number(route.params.unitId))
const lesson = computed(() => Number(route.params.lessonId))
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
  [bookId, unit, lesson],
  () => {
    void load()
  },
  { immediate: true },
)

onBeforeRouteLeave(() => confirmLeave())
onBeforeRouteUpdate(() => confirmLeave())

/**
 * 读取当前课的语法。快速切换课次时，只保留最后一次结果。
 */
async function load(): Promise<void> {
  const requestId = ++loadRequest
  loading.value = true
  error.value = ''
  editing.value = false
  activeHeading.value = null
  if (!isGrammarLocation(bookId.value, unit.value, lesson.value)) {
    baseline.value = null
    draft.value = null
    error.value = '找不到这一课'
    loading.value = false
    return
  }
  try {
    const document = await loadGrammarDocument(bookId.value, unit.value, lesson.value)
    if (requestId !== loadRequest) return
    baseline.value = document
    draft.value = copyDocument(document)
  } catch (caught) {
    if (requestId !== loadRequest) return
    baseline.value = null
    draft.value = null
    error.value = caught instanceof Error ? caught.message : '语法加载失败'
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
    await saveGrammarDocument({
      bookId: bookId.value,
      unit: unit.value,
      lesson: lesson.value,
      document: draft.value,
    })
    baseline.value = copyDocument(draft.value)
    editing.value = false
    ElMessage.success('已保存')
  } catch (caught) {
    ElMessage.error(caught instanceof Error ? caught.message : '语法保存失败')
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
  if (!isGrammarDocument(raw)) throw new Error('语法保存失败')
  return raw
}

function selectHeading(index: number): void {
  activeHeading.value = index
  editorRef.value?.scrollToHeading(index)
}

/**
 * 还在编辑、没有保存时，先确认再离开。
 * 点取消或保存之后不再拦。
 *
 * @return 可以离开时为 true
 */
async function confirmLeave(): Promise<boolean> {
  if (!editing.value) return true
  try {
    await ElMessageBox.confirm('这一课还在编辑，离开后没有保存的修改会丢掉。', '离开这一课', {
      confirmButtonText: '离开',
      cancelButtonText: '留在这里',
      type: 'warning',
      closeOnClickModal: false,
    })
    return true
  } catch {
    return false
  }
}
</script>

<template>
  <section class="grammar-view" :aria-busy="loading">
    <div class="grammar-body">
      <div class="grammar-column">
        <div class="grammar-bar">
          <p class="page-lead">{{ GRAMMAR_DESCRIPTION }}</p>
          <div v-if="canEdit && !loading && !error" class="actions">
            <el-button v-if="!editing" type="primary" @click="startEdit">
              {{ hasText ? '编辑' : '写这一课' }}
            </el-button>
            <template v-else>
              <el-button type="primary" :loading="saving" :disabled="!dirty" @click="save">保存</el-button>
              <el-button :disabled="saving" @click="cancel">取消</el-button>
            </template>
          </div>
        </div>

        <p v-if="loading" class="status">语法加载中…</p>
        <p v-else-if="error" class="error">{{ error }}</p>
        <template v-else>
          <p v-if="!editing && !hasText" class="status">这一课还没有语法。</p>
          <GrammarEditor
            v-else-if="baseline"
            ref="editorRef"
            :key="`${bookId}-${unit}-${lesson}-${editorKey}`"
            :document="baseline"
            :editable="editing"
            @update="onDraft"
          />
        </template>
      </div>

      <aside v-if="showOutline" class="grammar-outline" aria-label="标题">
        <p class="outline-title">标题</p>
        <p v-if="outline.length === 0" class="outline-empty">把段落设成标题后，这里会列出。</p>
        <GrammarOutline v-else :items="outline" :active-index="activeHeading" @select="selectHeading" />
      </aside>
    </div>
  </section>
</template>

<style scoped>
.grammar-body {
  display: grid;
  grid-template-columns: minmax(0, 8fr) minmax(0, 2fr);
  align-items: start;
  gap: 20px;
  width: 100%;
}

.grammar-column {
  min-width: 0;
}

.grammar-bar {
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

.grammar-outline {
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

@media (max-width: 720px) {
  .grammar-body {
    grid-template-columns: minmax(0, 1fr);
  }

  .grammar-outline {
    position: static;
    max-height: 220px;
  }
}
</style>
