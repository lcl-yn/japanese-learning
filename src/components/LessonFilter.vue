<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useWordsStore } from '@/stores/words'
import type { ScopeOption } from '@/types/word'

const wordsStore = useWordsStore()
const router = useRouter()

function optionValue(option: Pick<ScopeOption, 'bookId' | 'unitId' | 'lessonId'>) {
  return `${option.bookId}:${option.unitId}:${option.lessonId}`
}

const selected = computed(() =>
  optionValue({
    bookId: wordsStore.currentBookId,
    unitId: wordsStore.currentUnitId,
    lessonId: wordsStore.currentLessonId,
  }),
)

function onScopeChange(value: string) {
  const [bookId, unitRaw, lessonRaw] = value.split(':')
  const unitId = Number(unitRaw)
  const lessonId = Number(lessonRaw)
  if (!bookId || Number.isNaN(unitId) || Number.isNaN(lessonId)) return
  void router.push(`/study/${bookId}/${unitId}/${lessonId}/practice`)
}
</script>

<template>
  <el-select
    class="lesson-filter"
    :model-value="selected"
    placeholder="选择课"
    @change="onScopeChange"
  >
    <el-option
      v-for="option in wordsStore.lessonOptions"
      :key="optionValue(option)"
      :label="option.label"
      :value="optionValue(option)"
    />
  </el-select>
</template>

<style scoped>
.lesson-filter {
  width: 160px;
}
</style>
