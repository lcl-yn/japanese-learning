<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { MenuInstance } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { useWordsStore } from '@/stores/words'

const emit = defineEmits<{
  select: []
}>()

const route = useRoute()
const router = useRouter()
const wordsStore = useWordsStore()

/** 单词本是独立菜单。课里的单词、课文、语法只在进入该课时高亮。 */
const active = computed(() => {
  if (route.meta.section === 'words') return '/words'
  if (route.path.startsWith('/kana')) return '/kana'
  const bookId = route.params.bookId
  const unitId = route.params.unitId
  const lessonId = route.params.lessonId
  if (typeof bookId !== 'string' || typeof unitId !== 'string' || typeof lessonId !== 'string') return ''
  if (lessonId === '0') return ''
  if (route.path.endsWith('/reading')) return `/study/${bookId}/${unitId}/${lessonId}/reading`
  if (route.path.endsWith('/grammar')) return `/study/${bookId}/${unitId}/${lessonId}/grammar`
  if (route.path.endsWith('/practice')) return `/study/${bookId}/${unitId}/${lessonId}/practice`
  return ''
})

const menuRef = ref<MenuInstance>()
/** 已经展开的册、单元和课。换课只追加，不在这里删掉用户打开的项。 */
const openedKeys = ref<string[]>([])

/** 单词本和五十音图不带动目录。当前课要展开，别的已展开项留着。 */
const openeds = computed(() => {
  if (route.meta.section === 'words') return []
  const bookId = route.params.bookId
  const unitRaw = route.params.unitId
  const lessonRaw = route.params.lessonId
  if (typeof bookId !== 'string') return []
  const unitId = typeof unitRaw === 'string' ? Number(unitRaw) : 0
  const lessonId = typeof lessonRaw === 'string' ? Number(lessonRaw) : 0
  return locationKeys(bookId, unitId, lessonId)
})

openedKeys.value = openeds.value.slice()

/** 展开当前课所在的册、单元和课，不收起其他已经打开的目录。 */
function revealCurrentLesson(keys: string[]) {
  const lessonKey = keys[keys.length - 1]
  if (!lessonKey) return
  menuRef.value?.open(lessonKey)
}

/** 离开课页时收起全部目录。 */
function collapseMenus() {
  const closing = openedKeys.value.slice()
  openedKeys.value = []
  for (const key of closing) menuRef.value?.close(key)
}

watch(openeds, (keys) => {
  if (keys.length === 0) {
    collapseMenus()
    return
  }
  revealCurrentLesson(keys)
})

function onOpen(index: string) {
  if (!openedKeys.value.includes(index)) openedKeys.value.push(index)
}

function onClose(index: string) {
  openedKeys.value = openedKeys.value.filter((key) => key !== index)
}

function locationKeys(bookId: string, unitId: number, lessonId: number) {
  if (!bookId || bookId === 'all') return []
  const keys = [`book:${bookId}`]
  if (unitId) keys.push(`unit:${bookId}:${unitId}`)
  if (lessonId) keys.push(`lesson:${bookId}:${unitId}:${lessonId}`)
  return keys
}

function onSelect(index: string) {
  if (index.startsWith('/')) void router.push(index)
  emit('select')
}
</script>

<template>
  <el-menu
    ref="menuRef"
    class="side-menu"
    :default-active="active"
    :default-openeds="openedKeys"
    @open="onOpen"
    @close="onClose"
    @select="onSelect"
  >
    <el-menu-item index="/kana">50音图</el-menu-item>
    <el-menu-item index="/words">单词本</el-menu-item>
    <el-sub-menu v-for="book in wordsStore.manifest.books" :key="book.code" :index="`book:${book.code}`">
      <template #title>{{ book.name }}</template>
      <el-menu-item v-if="book.units.length === 0" :index="`empty:${book.code}`" disabled>
        暂无单元
      </el-menu-item>
      <el-sub-menu
        v-for="unit in book.units"
        :key="`${book.code}-${unit.unit}`"
        :index="`unit:${book.code}:${unit.unit}`"
      >
        <template #title>{{ unit.name }}</template>
        <el-menu-item
          v-if="unit.lessons.length === 0"
          :index="`empty-lesson:${book.code}:${unit.unit}`"
          disabled
        >
          暂无课
        </el-menu-item>
        <el-sub-menu
          v-for="lesson in unit.lessons"
          :key="`${book.code}-${unit.unit}-${lesson.id}`"
          :index="`lesson:${book.code}:${unit.unit}:${lesson.lesson}`"
        >
          <template #title>{{ lesson.name }}</template>
          <el-menu-item :index="`/study/${book.code}/${unit.unit}/${lesson.lesson}/practice`">单词</el-menu-item>
          <el-menu-item :index="`/study/${book.code}/${unit.unit}/${lesson.lesson}/reading`">课文</el-menu-item>
          <el-menu-item :index="`/study/${book.code}/${unit.unit}/${lesson.lesson}/grammar`">语法</el-menu-item>
        </el-sub-menu>
      </el-sub-menu>
    </el-sub-menu>
  </el-menu>
</template>

<style scoped>
.side-menu {
  border-right: none;
  background: transparent;
  --el-menu-bg-color: transparent;
  --el-menu-text-color: #e8e2d9;
  --el-menu-hover-bg-color: rgba(255, 255, 255, 0.06);
  --el-menu-active-color: #f6ddd4;
  --el-menu-item-height: 44px;
  --el-menu-sub-item-height: 44px;
  --el-menu-base-level-padding: 16px;
  --el-menu-level-padding: 16px;
}

.side-menu :deep(.el-menu) {
  background: transparent;
}

.side-menu :deep(.el-menu-item),
.side-menu :deep(.el-sub-menu__title) {
  cursor: pointer;
  transition: background-color 180ms ease, color 180ms ease;
}

.side-menu :deep(.el-menu-item.is-active) {
  background: rgba(159, 61, 47, 0.45);
}

.side-menu :deep(.el-menu-item.is-disabled) {
  cursor: default;
  opacity: 0.55;
}

@media (prefers-reduced-motion: reduce) {
  .side-menu :deep(.el-menu-item),
  .side-menu :deep(.el-sub-menu__title) {
    transition: none;
  }
}
</style>
