<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { useWordsStore } from '@/stores/words'

const props = defineProps<{
  target: 'practice' | 'words'
}>()

const router = useRouter()
const wordsStore = useWordsStore()

watch(
  () => wordsStore.loaded,
  (loaded) => {
    if (!loaded) return
    for (const book of wordsStore.manifest.books) {
      for (const unit of book.units) {
        const lesson = unit.lessons[0]
        if (!lesson) continue
        if (props.target === 'words') {
          void router.replace('/words')
          return
        }
        const path = `/study/${book.id}/${unit.unit}/${lesson.lesson}/practice`
        void router.replace(path)
        return
      }
    }
    void router.replace('/kana')
  },
  { immediate: true },
)
</script>

<template>
  <p class="redirecting">正在进入…</p>
</template>
