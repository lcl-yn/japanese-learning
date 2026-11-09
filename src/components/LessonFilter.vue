<script setup lang="ts">
import { computed } from 'vue'
import { useWordsStore } from '@/stores/words'

const wordsStore = useWordsStore()

function optionValue(courseId: string, lessonId: number) {
  return `${courseId}:${lessonId}`
}

const selected = computed(() => optionValue(wordsStore.currentCourseId, wordsStore.currentLessonId))

function onLessonChange(value: string) {
  const separator = value.indexOf(':')
  if (separator <= 0) return
  const courseId = value.slice(0, separator)
  const lessonId = Number(value.slice(separator + 1))
  if (Number.isNaN(lessonId)) return
  wordsStore.setLesson(courseId, lessonId)
}
</script>

<template>
  <el-select
    class="lesson-filter"
    :model-value="selected"
    placeholder="选择课时"
    @change="onLessonChange"
  >
    <el-option
      v-for="option in wordsStore.lessonOptions"
      :key="optionValue(option.courseId, option.lessonId)"
      :label="option.label"
      :value="optionValue(option.courseId, option.lessonId)"
    />
  </el-select>
</template>

<style scoped>
.lesson-filter {
  width: 220px;
}
</style>
