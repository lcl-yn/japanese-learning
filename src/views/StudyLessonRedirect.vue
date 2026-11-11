<script setup lang="ts">
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWordsStore } from '@/stores/words'

const props = defineProps<{
  section: 'practice' | 'reading' | 'grammar'
}>()

const route = useRoute()
const router = useRouter()
const wordsStore = useWordsStore()

watch(
  () => wordsStore.loaded,
  (loaded) => {
    if (!loaded) return
    const bookId = String(route.params.bookId ?? '')
    const unitId = Number(route.params.unitId)
    const book = wordsStore.manifest.books.find((item) => item.id === bookId)
    const unit = book?.units.find((item) => item.unit === unitId)
    const lesson = unit?.lessons[0]
    if (!book || !unit || !lesson) {
      void router.replace('/kana')
      return
    }
    void router.replace(`/study/${bookId}/${unitId}/${lesson.lesson}/${props.section}`)
  },
  { immediate: true },
)
</script>

<template>
  <p>正在进入…</p>
</template>
