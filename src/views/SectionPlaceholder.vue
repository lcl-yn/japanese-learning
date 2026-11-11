<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const title = computed(() => (typeof route.meta.title === 'string' ? route.meta.title : ''))
const description = computed(() =>
  typeof route.meta.description === 'string' ? route.meta.description : '这一部分还没有内容，先留在这里。',
)
</script>

<template>
  <section class="placeholder">
    <h2>{{ title }}</h2>
    <p>{{ description }}</p>
  </section>
</template>

<style scoped>
.placeholder h2 {
  margin: 0 0 8px;
  font-size: 22px;
}

.placeholder p {
  margin: 0;
  color: #57534e;
  line-height: 1.6;
}
</style>
