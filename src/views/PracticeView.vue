<script setup lang="ts">
import LessonFilter from '@/components/LessonFilter.vue'
import PracticeSession from '@/components/PracticeSession.vue'
import { PRACTICE_DESCRIPTION } from '@/utils/seo'
</script>

<template>
  <div class="practice-view">
    <p class="page-lead">{{ PRACTICE_DESCRIPTION }}</p>
    <PracticeSession>
      <LessonFilter />
    </PracticeSession>
  </div>
</template>

<style scoped>
.page-lead {
  margin: 0 0 16px;
  color: #57534e;
  font-size: 14px;
  line-height: 1.6;
}
</style>
