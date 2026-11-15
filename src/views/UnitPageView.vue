<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useWordsStore } from '@/stores/words'
import { wordPages } from '@/utils/unitPages'
import LessonDocumentView from '@/views/LessonDocumentView.vue'
import UnitWordsView from '@/views/UnitWordsView.vue'

const route = useRoute()
const wordsStore = useWordsStore()

const wordPage = computed(() => {
  const bookId = route.params.bookId
  const unitRaw = route.params.unitId
  const pageId = route.params.pageId
  if (typeof bookId !== 'string' || typeof unitRaw !== 'string' || typeof pageId !== 'string') return null
  const unit = wordsStore.manifest.books
    .find((book) => book.code === bookId)
    ?.units.find((item) => item.unit === Number(unitRaw))
  return wordPages(unit).find((page) => page.id === pageId) ?? null
})
</script>

<template>
  <p v-if="!wordsStore.loaded" class="status">加载中…</p>
  <UnitWordsView v-else-if="wordPage" :lesson="wordPage.lesson" :title="wordPage.name" />
  <LessonDocumentView v-else section="reading" />
</template>

<style scoped>
.status {
  margin: 0;
  color: #57534e;
  font-size: 14px;
  line-height: 1.6;
}
</style>
