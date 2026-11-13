<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Menu as MenuIcon } from '@element-plus/icons-vue'
import AppSidebar from '@/components/AppSidebar.vue'
import JapaneseSpeaker from '@/components/JapaneseSpeaker.vue'
import { useWordsStore } from '@/stores/words'
import { applyDocumentSeo, resolveDescription, resolvePageTitle, resolveRobots, SITE_NAME, SITE_TAGLINE } from '@/utils/seo'

const wordsStore = useWordsStore()
const route = useRoute()
const menuOpen = ref(false)

onMounted(() => {
  void wordsStore.loadWords()
})

watch(
  () =>
    [route.params.bookId, route.params.unitId, route.params.lessonId, route.meta.section, wordsStore.loaded] as const,
  () => {
    if (!wordsStore.loaded || route.meta.section === 'words') return
    const bookId = route.params.bookId
    const unitRaw = route.params.unitId
    if (typeof bookId !== 'string' || typeof unitRaw !== 'string') return
    const unitId = Number(unitRaw)
    const lessonRaw = route.params.lessonId
    const lessonId = typeof lessonRaw === 'string' ? Number(lessonRaw) : 0
    if (!Number.isInteger(unitId) || !Number.isInteger(lessonId)) return
    if (
      wordsStore.currentBookId === bookId &&
      wordsStore.currentUnitId === unitId &&
      wordsStore.currentLessonId === lessonId
    ) {
      return
    }
    wordsStore.setScope(bookId, unitId, lessonId, route.meta.section === 'practice')
  },
  { immediate: true },
)

const crumbs = computed(() => {
  if (route.name === 'kana') return ['50音图']
  if (route.meta.section === 'words') return ['单词本']
  const bookId = route.params.bookId
  const unitRaw = route.params.unitId
  if (typeof bookId !== 'string' || typeof unitRaw !== 'string') return []
  const book = wordsStore.manifest.books.find((item) => item.code === bookId)
  const section = typeof route.meta.title === 'string' ? route.meta.title : ''
  if (!book || !section) return []
  const unitId = Number(unitRaw)
  if (unitId === 0) return [book.name, section]
  const unit = book.units.find((item) => item.unit === unitId)
  if (!unit) return [book.name, section]
  const lessonRaw = route.params.lessonId
  const lesson =
    typeof lessonRaw === 'string' && lessonRaw !== '0'
      ? unit.lessons.find((item) => String(item.lesson) === lessonRaw)
      : undefined
  const names = [book.name, unit.name]
  if (lesson) names.push(lesson.name)
  names.push(section)
  return names
})

watch(
  () => [route.fullPath, crumbs.value.join('\0')] as const,
  () => {
    applyDocumentSeo({
      title: resolvePageTitle(crumbs.value, route.meta),
      description: resolveDescription(crumbs.value, route.meta),
      robots: resolveRobots(route.meta),
    })
  },
  { immediate: true },
)
</script>

<template>
  <div class="app-frame">
    <a class="skip" href="#main">跳到主内容</a>
    <header class="app-header">
      <button
        type="button"
        class="nav-toggle"
        aria-label="打开菜单"
        :aria-expanded="menuOpen"
        @click="menuOpen = true"
      >
        <el-icon :size="20"><MenuIcon /></el-icon>
      </button>
      <h1>日语学习</h1>
    </header>

    <div class="app-body">
      <aside class="app-aside" aria-label="目录">
        <p v-if="wordsStore.loading" class="aside-status">目录加载中…</p>
        <AppSidebar v-else-if="wordsStore.loaded" />
      </aside>
      <main id="main" tabindex="-1">
        <p v-if="wordsStore.loading" class="status">词库加载中…</p>
        <p v-else-if="wordsStore.error" class="error">{{ wordsStore.error }}</p>
        <template v-else>
          <nav v-if="crumbs.length" class="crumbs" aria-label="当前位置">
            <ol>
              <li v-for="(crumb, index) in crumbs" :key="`${crumb}-${index}`">
                <span v-if="index > 0" class="crumb-sep" aria-hidden="true">/</span>
                {{ crumb }}
              </li>
            </ol>
          </nav>
          <RouterView />
        </template>
      </main>
    </div>

    <footer class="app-footer">{{ SITE_NAME }} · {{ SITE_TAGLINE }}</footer>

    <el-drawer v-model="menuOpen" direction="ltr" size="280px" title="目录" class="nav-drawer">
      <AppSidebar v-if="wordsStore.loaded" @select="menuOpen = false" />
    </el-drawer>

    <JapaneseSpeaker />
  </div>
</template>

<style scoped>
.app-frame {
  height: 100%;
  display: flex;
  flex-direction: column;
  color: #1c1917;
  background: #f4f0e8;
  --el-color-primary: #9f3d2f;
  --el-color-primary-light-3: #c47a70;
  --el-color-primary-light-5: #d4a49c;
  --el-color-primary-light-7: #e6c9c4;
  --el-color-primary-light-8: #f0ddd9;
  --el-color-primary-light-9: #f7eeeb;
  --el-color-primary-dark-2: #7f3126;
  --el-font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-family: var(--el-font-family);
}

.skip {
  position: absolute;
  left: 12px;
  top: -48px;
  z-index: 50;
  padding: 8px 12px;
  background: #fbf8f3;
  color: #1c1917;
  border: 1px solid #9f3d2f;
}

.skip:focus {
  top: 8px;
}

.app-header,
.app-footer {
  flex: none;
  display: flex;
  align-items: center;
  height: 56px;
  padding: 0 20px;
  background: #fbf8f3;
  border-bottom: 1px solid #e4ddd2;
}

.app-footer {
  height: auto;
  min-height: 44px;
  border-bottom: none;
  border-top: 1px solid #e4ddd2;
  color: #57534e;
  font-size: 13px;
  line-height: 1.5;
}

.app-header h1 {
  margin: 0;
  font-family: 'Songti SC', 'Source Han Serif SC', 'Noto Serif SC', PMingLiU, serif;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.nav-toggle {
  display: none;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-right: 4px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #1c1917;
  cursor: pointer;
}

.nav-toggle:hover {
  background: #f3e4df;
}

.nav-toggle:focus-visible {
  outline: 2px solid #9f3d2f;
  outline-offset: 2px;
}

.app-body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.app-aside {
  flex: none;
  width: 248px;
  overflow: auto;
  background: #231f1c;
}

.aside-status {
  margin: 16px;
  color: #e8e2d9;
  font-size: 14px;
}

main {
  flex: 1;
  overflow: auto;
  padding: 20px 28px 120px;
  outline: none;
}

.crumbs ol {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 12px;
  padding: 0;
  list-style: none;
  color: #57534e;
  font-size: 13px;
  line-height: 1.5;
}

.crumbs li {
  display: flex;
  gap: 8px;
}

.status {
  margin: 0;
  color: #57534e;
}

.error {
  margin: 0;
  color: #9f3d2f;
}

@media (max-width: 959px) {
  .nav-toggle {
    display: inline-flex;
  }

  .app-aside {
    display: none;
  }

  main {
    padding: 16px 16px 120px;
  }
}

</style>

<style>
html,
body,
#app {
  height: 100%;
  margin: 0;
}

.nav-drawer.el-drawer {
  background: #231f1c;
}

.nav-drawer .el-drawer__header {
  margin-bottom: 0;
  color: #e8e2d9;
}

.nav-drawer .el-drawer__close-btn {
  color: #e8e2d9;
}

.nav-drawer .el-drawer__body {
  padding: 0;
}
</style>
