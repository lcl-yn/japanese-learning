<script setup lang="ts">
import { onMounted } from 'vue'
import { useWordsStore } from '@/stores/words'

const wordsStore = useWordsStore()
onMounted(() => {
  void wordsStore.loadWords()
})
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <h1>中日语言学习</h1>
      <nav>
        <RouterLink to="/practice">练习</RouterLink>
        <RouterLink to="/words">单词本</RouterLink>
        <RouterLink to="/kana">50音图</RouterLink>
      </nav>
    </header>
    <p v-if="wordsStore.loading">词库加载中…</p>
    <p v-else-if="wordsStore.error" class="error">{{ wordsStore.error }}</p>
    <RouterView v-else />
  </div>
</template>

<style scoped>
.app-shell {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 20px 48px;
  text-align: left;
}

.app-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 24px;
  margin-bottom: 24px;
}

.app-header h1 {
  margin: 0;
  font-size: 28px;
  letter-spacing: 0;
}

.app-header nav {
  display: flex;
  gap: 20px;
}

.app-header a {
  color: var(--text-h, #08060d);
  text-decoration: none;
}

.app-header a.router-link-active {
  color: var(--accent, #aa3bff);
  font-weight: 600;
}

.error {
  color: #c45656;
}
</style>
