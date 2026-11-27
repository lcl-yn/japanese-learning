<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Menu as MenuIcon } from '@element-plus/icons-vue'
import AppSidebar from '@/components/AppSidebar.vue'
import JapaneseSpeaker from '@/components/JapaneseSpeaker.vue'
import { useWordsStore } from '@/stores/words'
import { phoneLayout } from '@/utils/phoneLayout'
import { applyDocumentSeo, resolveDescription, resolvePageTitle, resolveRobots, SITE_NAME, SITE_TAGLINE } from '@/utils/seo'

const HEADER_SCROLL_GAP = 8

const wordsStore = useWordsStore()
const route = useRoute()
const menuOpen = ref(false)
const headerCollapsed = ref(false)
let lastMainScroll = 0
let headerScrollLock = false

const wordsMobile = computed(() => phoneLayout.value && route.meta.section === 'words')

/**
 * 窄屏往下读时收起顶栏，往上滚或回到顶部再展开。
 * 顶栏高度一变，主区会跟着冒出滚动事件，这段时间先不改状态。
 */
function onMainScroll(event: Event) {
  const el = event.target
  if (!(el instanceof HTMLElement) || headerScrollLock) return
  const top = el.scrollTop
  const narrow = phoneLayout.value
  if (narrow && route.meta.section === 'words') {
    lastMainScroll = top
    if (headerCollapsed.value) headerCollapsed.value = false
    return
  }
  let collapsed = headerCollapsed.value
  if (!narrow || top <= HEADER_SCROLL_GAP) collapsed = false
  else if (top > lastMainScroll + HEADER_SCROLL_GAP) collapsed = true
  else if (top < lastMainScroll - HEADER_SCROLL_GAP) collapsed = false
  lastMainScroll = top
  if (collapsed === headerCollapsed.value) return
  headerCollapsed.value = collapsed
  headerScrollLock = true
  window.setTimeout(() => {
    lastMainScroll = el.scrollTop
    headerScrollLock = false
  }, 250)
}

watch(phoneLayout, (phone) => {
  if (!phone) headerCollapsed.value = false
})

onMounted(() => {
  void wordsStore.loadWords()
})

watch(
  () =>
    [route.params.bookId, route.params.unitId, route.params.lessonId, route.meta.section, wordsStore.loaded] as const,
  () => {
    if (!wordsStore.loaded || route.meta.section === 'words' || route.meta.section === 'unit-page') return
    const bookId = route.params.bookId
    const unitRaw = route.params.unitId
    if (typeof bookId !== 'string' || typeof unitRaw !== 'string') return
    const unitId = Number(unitRaw)
    const lessonRaw = route.params.lessonId
    const lessonId = typeof lessonRaw === 'string' ? Number(lessonRaw) : 0
    if (!Number.isInteger(unitId) || !Number.isInteger(lessonId)) return
    const section = typeof route.meta.section === 'string' ? route.meta.section : ''
    wordsStore.applyRouteScope(bookId, unitId, lessonId, section)
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
  const pageRaw = route.params.pageId
  if (typeof pageRaw === 'string') {
    const page = unit.pages?.find((item) => item.id === pageRaw)
    return page ? [book.name, unit.name, page.name] : [book.name, unit.name]
  }
  const lessonRaw = route.params.lessonId
  const lesson =
    typeof lessonRaw === 'string' && lessonRaw !== '0'
      ? unit.lessons.find((item) => String(item.lesson) === lessonRaw)
      : undefined
  const wordPage =
    !lesson && typeof lessonRaw === 'string'
      ? unit.pages?.find((item) => String(item.lesson) === lessonRaw)
      : undefined
  const names = [book.name, unit.name]
  if (lesson) names.push(lesson.name)
  else if (wordPage) names.push(wordPage.name)
  names.push(section)
  return names
})

watch(
  () => route.fullPath,
  () => {
    headerCollapsed.value = false
    lastMainScroll = 0
    headerScrollLock = false
  },
)

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
    <header class="app-header" :class="{ 'is-collapsed': headerCollapsed }">
      <button
        type="button"
        class="nav-toggle"
        aria-label="打开菜单"
        :aria-expanded="menuOpen"
        @click="menuOpen = true"
      >
        <el-icon :size="20"><MenuIcon /></el-icon>
      </button>
      <h1 v-show="!wordsMobile">日语学习</h1>
      <div id="words-mobile-tools" class="words-mobile-tools" :hidden="!wordsMobile"></div>
      <div id="outline-anchor" class="outline-anchor"></div>
    </header>

    <div class="app-body">
      <aside class="app-aside" aria-label="目录">
        <p v-if="wordsStore.loading" class="aside-status">目录加载中…</p>
        <AppSidebar v-else-if="wordsStore.loaded" />
      </aside>
      <main id="main" tabindex="-1" @scroll="onMainScroll">
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

.app-header {
  overflow: hidden;
  transition: height 0.2s ease;
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
  flex: 1;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  font-family: 'Songti SC', 'Source Han Serif SC', 'Noto Serif SC', PMingLiU, serif;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.04em;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.words-mobile-tools {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
}

.words-mobile-tools[hidden] {
  display: none;
}

.outline-anchor {
  flex: none;
  display: flex;
  align-items: center;
  margin-left: 8px;
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

html[data-layout='phone'] .nav-toggle {
  display: inline-flex;
}

html[data-layout='phone'] .app-aside {
  display: none;
}

html[data-layout='phone'] .app-header.is-collapsed {
  height: 0;
  border-bottom-width: 0;
}

html[data-layout='phone'] .app-footer {
  display: none;
}

html[data-layout='phone'] main {
  --main-pad-top: 16px;
  padding: var(--main-pad-top) 16px 72px;
}

html[data-layout='phone'] main:has(.words-view.is-narrow) .crumbs,
html[data-layout='phone'] main:has(.kana-view.is-narrow) .crumbs {
  display: none;
}

html[data-layout='phone'] .app-frame:has(.words-view.is-narrow),
html[data-layout='phone'] .app-frame:has(.kana-view.is-narrow) {
  background: #f6f1e8;
}

@media (prefers-reduced-motion: reduce) {
  .app-header {
    transition: none;
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

html[data-layout='phone'][data-speaker='open'] main {
  padding-bottom: 124px;
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
