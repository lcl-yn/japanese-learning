# Vue3 日语学习应用改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有 Vue2 CDN 日语学习页就地改造为 Vite + Vue3 + TypeScript 脚手架，单词按课程分片 JSON + manifest 加载，并用 Pinia + Router 提供练习 / 单词本 / 50音图三页。

**Architecture:** 静态词数据放在 `public/data/words/`，由 `wordsLoader` 读 `manifest.json` 并行 fetch 课次文件并注入 `courseId`；Pinia `words` store 持有词库、筛选与练习会话；三个路由视图共用该 store。旧代码移入 `legacy/` 对照。

**Tech Stack:** Vite、Vue 3、TypeScript、Vue Router、Pinia、Element Plus、Vitest

**Spec:** `docs/superpowers/specs/2026-11-09-vue3-words-split-design.md`

## Global Constraints

- Composition API + `<script setup>` only
- TypeScript throughout `src/`
- Element Plus for UI（不用旧 Element UI）
- 运行时 manifest 加载（不做构建时合并）
- 旧文件只移入 `legacy/`，不删除内容
- 第一版不写后端、不做收藏/统计等新功能
- 迁移词数据时丢弃 `lesson: 0` 及缺少 `cn`/`jp` 的残缺条目

---

## File Structure

| Path | Responsibility |
|------|----------------|
| `legacy/**` | 旧 Vue2 HTML/JS 备份 |
| `public/data/words/manifest.json` | 课程/课次清单 |
| `public/data/words/course-n5/lesson-*.json` | 分片词表 |
| `src/types/word.ts` | Word / Manifest 类型 |
| `src/services/wordsLoader.ts` | 读 manifest + 拼接词表 |
| `src/utils/weightedRandom.ts` | 权重抽词纯函数 |
| `src/utils/speech.ts` | speechSynthesis 封装 |
| `src/data/kana.ts` | 50音图静态数据 |
| `src/stores/words.ts` | Pinia 词库 + 练习状态 |
| `src/router/index.ts` | 路由 |
| `src/views/*.vue` | 三页 |
| `src/components/*.vue` | 可复用 UI |
| `src/App.vue` | 导航壳 + 启动加载 |
| `src/**/*.spec.ts` | Vitest 单测 |

---

### Task 1: 备份旧代码并脚手架 Vite Vue3 TS

**Files:**
- Move: `element-ui/` → `legacy/element-ui/`
- Move: `js/` → `legacy/js/`
- Create: Vite 模板文件（`package.json`、`vite.config.ts`、`tsconfig*.json`、`index.html`、`src/*`）

**Interfaces:**
- Produces: 可运行的空 Vue3 TS 工程；`npm run dev` / `npm run test:unit` 可用

- [ ] **Step 1: 备份旧目录**

```powershell
New-Item -ItemType Directory -Path legacy -Force
Move-Item -Path element-ui -Destination legacy\element-ui
Move-Item -Path js -Destination legacy\js
```

Expected: `legacy/element-ui`、`legacy/js` 存在；根目录不再有这两个文件夹。

- [ ] **Step 2: 在临时目录生成 Vite 模板并迁入**

```powershell
npm create vite@latest _scaffold -- --template vue-ts
Copy-Item -Path _scaffold\* -Destination . -Recurse -Force
Remove-Item -Recurse -Force _scaffold
```

若 `npm create vite` 交互询问，使用非交互参数；保留已有 `docs/` 与 `legacy/`。

- [ ] **Step 3: 安装路由、Pinia、Element Plus、Vitest**

```powershell
npm install
npm install vue-router@4 pinia element-plus @element-plus/icons-vue
npm install -D vitest @vue/test-utils jsdom @types/node
```

- [ ] **Step 4: 配置 Vitest 与路径别名**

修改 `vite.config.ts`：

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

在 `package.json` scripts 增加：

```json
"test:unit": "vitest run",
"test:watch": "vitest"
```

确保 `tsconfig.app.json` 的 `paths` 含 `"@/*": ["./src/*"]`。

- [ ] **Step 5: 接入 Element Plus 与 Pinia / Router 空壳**

`src/main.ts`：

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(ElementPlus)
app.mount('#app')
```

先建最小 `src/router/index.ts`（仅 `/` → 占位页），`App.vue` 显示 `中日语言学习` + `<RouterView />`。

- [ ] **Step 6: 验证脚手架**

Run: `npm run dev`  
Expected: 浏览器打开后可见标题。  
Run: `npm run test:unit`  
Expected: 无测试或通过（若模板无测试则 0 tests）。

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vue3 Vite TS and move legacy code"
```

---

### Task 2: 类型、加载器与权重抽词（含测试）

**Files:**
- Create: `src/types/word.ts`
- Create: `src/services/wordsLoader.ts`
- Create: `src/utils/weightedRandom.ts`
- Create: `src/services/wordsLoader.spec.ts`
- Create: `src/utils/weightedRandom.spec.ts`

**Interfaces:**
- Produces:
  - `Word`, `WordsManifest`, `CourseMeta`, `LessonMeta`
  - `loadAllWords(baseUrl?: string): Promise<{ manifest: WordsManifest; words: Word[] }>`
  - `selectRandomWordsWithWeights(count, words, getWeight): Word[]`
  - `wordKey(word: Pick<Word,'cn'|'jp'>): string`

- [ ] **Step 1: 写类型**

`src/types/word.ts`：

```ts
export interface Word {
  cn: string
  jp: string
  jp_write: string
  describe: string
  part_of_speech: string
  lesson: number
  courseId: string
}

export interface LessonMeta {
  id: number
  name: string
  file: string
}

export interface CourseMeta {
  id: string
  name: string
  lessons: LessonMeta[]
}

export interface WordsManifest {
  courses: CourseMeta[]
}
```

- [ ] **Step 2: 写失败测试 — wordsLoader**

`src/services/wordsLoader.spec.ts`：

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadAllWords } from './wordsLoader'
import type { WordsManifest, Word } from '@/types/word'

describe('loadAllWords', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads manifest, fetches lessons in parallel, injects courseId', async () => {
    const manifest: WordsManifest = {
      courses: [
        {
          id: 'n5',
          name: 'N5 基础',
          lessons: [
            { id: 1, name: '第一课', file: 'course-n5/lesson-01.json' },
            { id: 2, name: '第二课', file: 'course-n5/lesson-02.json' },
          ],
        },
      ],
    }
    const lesson1: Omit<Word, 'courseId'>[] = [
      { cn: '学生', jp: 'がくせい', jp_write: '学生', describe: '', part_of_speech: '名词', lesson: 1 },
    ]
    const lesson2: Omit<Word, 'courseId'>[] = [
      { cn: '车', jp: 'くるま', jp_write: '車', describe: '', part_of_speech: '名词', lesson: 2 },
    ]

    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith('manifest.json')) {
        return { ok: true, json: async () => manifest }
      }
      if (url.endsWith('lesson-01.json')) {
        return { ok: true, json: async () => lesson1 }
      }
      if (url.endsWith('lesson-02.json')) {
        return { ok: true, json: async () => lesson2 }
      }
      throw new Error(`unexpected url ${url}`)
    })

    const result = await loadAllWords('/data/words')
    expect(result.words).toHaveLength(2)
    expect(result.words[0].courseId).toBe('n5')
    expect(result.words[1].cn).toBe('车')
    expect(result.manifest.courses[0].id).toBe('n5')
  })
})
```

- [ ] **Step 3: 运行确认失败**

Run: `npm run test:unit -- src/services/wordsLoader.spec.ts`  
Expected: FAIL（模块不存在或导出缺失）

- [ ] **Step 4: 实现 wordsLoader**

`src/services/wordsLoader.ts`：

```ts
import type { Word, WordsManifest } from '@/types/word'

const DEFAULT_BASE = '/data/words'

export async function loadAllWords(baseUrl = DEFAULT_BASE): Promise<{
  manifest: WordsManifest
  words: Word[]
}> {
  const manifestRes = await fetch(`${baseUrl}/manifest.json`)
  if (!manifestRes.ok) {
    throw new Error(`Failed to load manifest: ${manifestRes.status}`)
  }
  const manifest = (await manifestRes.json()) as WordsManifest

  const tasks: Promise<Word[]>[] = []
  for (const course of manifest.courses) {
    for (const lesson of course.lessons) {
      tasks.push(
        fetch(`${baseUrl}/${lesson.file}`).then(async (res) => {
          if (!res.ok) {
            throw new Error(`Failed to load ${lesson.file}: ${res.status}`)
          }
          const raw = (await res.json()) as Omit<Word, 'courseId'>[]
          return raw.map((w) => ({ ...w, courseId: course.id }))
        }),
      )
    }
  }

  const chunks = await Promise.all(tasks)
  return { manifest, words: chunks.flat() }
}
```

- [ ] **Step 5: 写加权抽词测试与实现**

`src/utils/weightedRandom.spec.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { selectRandomWordsWithWeights, wordKey } from './weightedRandom'
import type { Word } from '@/types/word'

const w = (cn: string, jp: string, lesson = 1): Word => ({
  cn, jp, jp_write: cn, describe: '', part_of_speech: '名词', lesson, courseId: 'n5',
})

describe('wordKey', () => {
  it('joins cn and jp', () => {
    expect(wordKey(w('车', 'くるま'))).toBe('车-くるま')
  })
})

describe('selectRandomWordsWithWeights', () => {
  it('returns at most count words and never duplicates', () => {
    const list = [w('a', 'あ'), w('b', 'い'), w('c', 'う')]
    const picked = selectRandomWordsWithWeights(2, list, () => 1)
    expect(picked).toHaveLength(2)
    const keys = new Set(picked.map(wordKey))
    expect(keys.size).toBe(2)
  })

  it('returns all when count exceeds length', () => {
    const list = [w('a', 'あ'), w('b', 'い')]
    expect(selectRandomWordsWithWeights(10, list, () => 1)).toHaveLength(2)
  })
})
```

`src/utils/weightedRandom.ts`：从 `legacy/js/japanese-chinese-learning.js` 移植 `selectRandomWordsWithWeights` / `shuffleArray` 逻辑为纯函数；`getWeight` 由调用方传入。

```ts
import type { Word } from '@/types/word'

export function wordKey(word: Pick<Word, 'cn' | 'jp'>): string {
  return `${word.cn}-${word.jp}`
}

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array]
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[newArray[i], newArray[j]] = [newArray[j], newArray[i]]
  }
  return newArray
}

export function selectRandomWordsWithWeights(
  count: number,
  wordsList: Word[],
  getWeight: (word: Word) => number,
): Word[] {
  const wordsCopy = [...wordsList]
  let totalWeight = 0
  wordsCopy.forEach((word) => {
    totalWeight += getWeight(word)
  })

  const selectedWords: Word[] = []
  const selectedIndices = new Set<number>()

  while (selectedWords.length < count && selectedWords.length < wordsCopy.length) {
    let randomWeight = Math.random() * totalWeight
    for (let i = 0; i < wordsCopy.length; i++) {
      if (selectedIndices.has(i)) continue
      const weight = getWeight(wordsCopy[i])
      randomWeight -= weight
      if (randomWeight <= 0) {
        selectedWords.push(wordsCopy[i])
        selectedIndices.add(i)
        totalWeight -= weight
        break
      }
    }
  }

  if (selectedWords.length < count) {
    const shuffled = shuffleArray(wordsCopy.map((w, i) => ({ w, i })))
    for (const { w, i } of shuffled) {
      if (selectedWords.length >= count) break
      if (!selectedIndices.has(i)) {
        selectedWords.push(w)
        selectedIndices.add(i)
      }
    }
  }

  return shuffleArray(selectedWords)
}
```

- [ ] **Step 6: 跑测试通过**

Run: `npm run test:unit`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/types src/services src/utils
git commit -m "feat: add word types, loader, and weighted random util"
```

---

### Task 3: 拆分词数据到 public/data/words

**Files:**
- Create: `public/data/words/manifest.json`
- Create: `public/data/words/course-n5/lesson-01.json`
- Create: `public/data/words/course-n5/lesson-02.json`
- Create (临时可删): `scripts/extract-words.mjs`

**Interfaces:**
- Consumes: `legacy/js/japanese-chinese-learning.js` 中 `allWords`
- Produces: manifest + 两课 JSON；合法词条约 lesson1=82、lesson2=4（丢弃残缺与 lesson0）

- [ ] **Step 1: 写提取脚本并执行**

`scripts/extract-words.mjs`：

```js
import fs from 'node:fs'
import path from 'node:path'

const src = fs.readFileSync('legacy/js/japanese-chinese-learning.js', 'utf8')
const match = src.match(/const allWords = (\[[\s\S]*?\]);/)
if (!match) throw new Error('allWords not found')
const words = eval(match[1])

const valid = words.filter(
  (w) => w && w.lesson > 0 && typeof w.cn === 'string' && typeof w.jp === 'string' && w.cn && w.jp,
)

const byLesson = new Map()
for (const w of valid) {
  const list = byLesson.get(w.lesson) || []
  list.push({
    cn: w.cn,
    jp: w.jp,
    jp_write: w.jp_write ?? '',
    describe: typeof w.describe === 'string' ? w.describe : '',
    part_of_speech: w.part_of_speech ?? '',
    lesson: w.lesson,
  })
  byLesson.set(w.lesson, list)
}

const outDir = path.join('public', 'data', 'words', 'course-n5')
fs.mkdirSync(outDir, { recursive: true })

const lessons = []
for (const [lessonId, list] of [...byLesson.entries()].sort((a, b) => a[0] - b[0])) {
  const file = `course-n5/lesson-${String(lessonId).padStart(2, '0')}.json`
  fs.writeFileSync(
    path.join('public', 'data', 'words', file),
    JSON.stringify(list, null, 2) + '\n',
    'utf8',
  )
  lessons.push({
    id: lessonId,
    name: `第${lessonId}课`,
    file,
  })
  console.log(`lesson ${lessonId}: ${list.length}`)
}

const manifest = {
  courses: [{ id: 'n5', name: 'N5 基础', lessons }],
}
fs.writeFileSync(
  path.join('public', 'data', 'words', 'manifest.json'),
  JSON.stringify(manifest, null, 2) + '\n',
  'utf8',
)
console.log('done', valid.length)
```

Run: `node scripts/extract-words.mjs`  
Expected: 打印 `lesson 1: 82`、`lesson 2: 4`（或相近）、`done 86`

- [ ] **Step 2: 手工核对**

打开 `public/data/words/manifest.json` 与两个 lesson 文件，确认 JSON 合法、无 `courseId` 字段、无空 `cn`/`jp`。

- [ ] **Step 3: Commit**

```bash
git add public/data/words scripts/extract-words.mjs
git commit -m "feat: split word bank into course lesson JSON files"
```

---

### Task 4: Pinia words store

**Files:**
- Create: `src/stores/words.ts`
- Create: `src/stores/words.spec.ts`

**Interfaces:**
- Consumes: `loadAllWords`, `selectRandomWordsWithWeights`, `wordKey`
- Produces: `useWordsStore()` with:
  - state: `manifest`, `allWords`, `loading`, `error`, `currentCourseId`, `currentLessonId`, `errorCounts`, `mode`, `currentWords`, `userAnswers`, `answerResults`, `answersChecked`, `correctCount`
  - getters: `lessonOptions`, `filteredWords`, `wordPairs`
  - actions: `loadWords`, `setLesson`, `setMode`, `startTest`, `checkAnswers`, `getWeight`, `incrementError`

- [ ] **Step 1: 写 store 核心测试（过滤 + 判分）**

`src/stores/words.spec.ts` 使用 `createPinia` + `setActivePinia`；mock `loadAllWords` 返回固定两课数据；断言：

1. `setLesson('n5', 1)` 后 `filteredWords` 仅 lesson 1
2. `startTest(2)` 后 `currentWords.length === 2`
3. 填错答案后 `checkAnswers()` 增加 `errorCounts` 并写入 localStorage key `wordErrorCounts`

- [ ] **Step 2: 运行确认失败**

Run: `npm run test:unit -- src/stores/words.spec.ts`  
Expected: FAIL

- [ ] **Step 3: 实现 store**

`src/stores/words.ts` 关键逻辑：

```ts
import { defineStore } from 'pinia'
import { loadAllWords } from '@/services/wordsLoader'
import { selectRandomWordsWithWeights, wordKey } from '@/utils/weightedRandom'
import type { Word, WordsManifest } from '@/types/word'

const ERROR_STORAGE_KEY = 'wordErrorCounts'

export const useWordsStore = defineStore('words', {
  state: () => ({
    manifest: { courses: [] } as WordsManifest,
    allWords: [] as Word[],
    loading: false,
    error: '' as string,
    loaded: false,
    currentCourseId: 'all' as string,
    currentLessonId: 0,
    errorCounts: {} as Record<string, number>,
    mode: 'cn2jp' as 'cn2jp' | 'jp2cn',
    currentWords: [] as Word[],
    userAnswers: [] as string[],
    answerResults: [] as boolean[],
    answersChecked: false,
    correctCount: 0,
  }),
  getters: {
    lessonOptions(state) {
      const options: { courseId: string; lessonId: number; label: string }[] = [
        { courseId: 'all', lessonId: 0, label: '全部' },
      ]
      for (const course of state.manifest.courses) {
        for (const lesson of course.lessons) {
          options.push({
            courseId: course.id,
            lessonId: lesson.id,
            label: `${course.name} · ${lesson.name}`,
          })
        }
      }
      return options
    },
    filteredWords(state): Word[] {
      return state.allWords.filter((w) => {
        const courseOk = state.currentCourseId === 'all' || w.courseId === state.currentCourseId
        const lessonOk = state.currentLessonId === 0 || w.lesson === state.currentLessonId
        return courseOk && lessonOk
      })
    },
    wordPairs(state) {
      const pairs: Array<{
        word1?: Word
        index1?: number
        word2?: Word
        index2?: number
      }> = []
      for (let i = 0; i < state.currentWords.length; i += 2) {
        const pair: (typeof pairs)[number] = {
          word1: state.currentWords[i],
          index1: i,
        }
        if (i + 1 < state.currentWords.length) {
          pair.word2 = state.currentWords[i + 1]
          pair.index2 = i + 1
        }
        pairs.push(pair)
      }
      return pairs
    },
  },
  actions: {
    async loadWords() {
      if (this.loaded || this.loading) return
      this.loading = true
      this.error = ''
      try {
        const { manifest, words } = await loadAllWords()
        this.manifest = manifest
        this.allWords = words
        const stored = localStorage.getItem(ERROR_STORAGE_KEY)
        if (stored) {
          this.errorCounts = JSON.parse(stored)
        } else {
          const counts: Record<string, number> = {}
          for (const word of words) counts[wordKey(word)] = 0
          this.errorCounts = counts
          localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(counts))
        }
        this.loaded = true
        this.startTest(16)
      } catch (e) {
        this.error = e instanceof Error ? e.message : String(e)
      } finally {
        this.loading = false
      }
    },
    getWeight(word: Word) {
      return 1 + (this.errorCounts[wordKey(word)] || 0)
    },
    incrementError(word: Word) {
      const key = wordKey(word)
      this.errorCounts[key] = (this.errorCounts[key] || 0) + 1
      localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(this.errorCounts))
    },
    setLesson(courseId: string, lessonId: number) {
      this.currentCourseId = courseId
      this.currentLessonId = lessonId
      this.startTest(16)
    },
    setMode(mode: 'cn2jp' | 'jp2cn') {
      this.mode = mode
      this.startTest(16)
    },
    startTest(count = 16) {
      this.currentWords = selectRandomWordsWithWeights(count, this.filteredWords, (w) =>
        this.getWeight(w),
      )
      this.userAnswers = new Array(this.currentWords.length).fill('')
      this.answerResults = new Array(this.currentWords.length).fill(false)
      this.answersChecked = false
      this.correctCount = 0
    },
    checkAnswers() {
      if (this.answersChecked) return
      this.correctCount = 0
      for (let i = 0; i < this.currentWords.length; i++) {
        const word = this.currentWords[i]
        const userAnswer = (this.userAnswers[i] || '').trim()
        const expected = this.mode === 'cn2jp' ? word.jp : word.cn
        const ok = userAnswer === expected
        this.answerResults[i] = ok
        if (ok) this.correctCount++
        else this.incrementError(word)
      }
      this.answersChecked = true
    },
  },
})
```

- [ ] **Step 4: 测试通过后 Commit**

```bash
git add src/stores
git commit -m "feat: add Pinia words store with practice session"
```

---

### Task 5: Router、App 壳、LessonFilter

**Files:**
- Modify: `src/router/index.ts`
- Modify: `src/App.vue`
- Create: `src/components/LessonFilter.vue`
- Create: `src/views/PracticeView.vue`（先占位）
- Create: `src/views/WordsView.vue`（先占位）
- Create: `src/views/KanaView.vue`（先占位）

**Interfaces:**
- Consumes: `useWordsStore().loadWords`
- Produces: 路由 `/`→`/practice`、`/words`、`/kana`；顶栏导航

- [ ] **Step 1: 配置路由**

```ts
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/practice' },
    { path: '/practice', name: 'practice', component: () => import('@/views/PracticeView.vue') },
    { path: '/words', name: 'words', component: () => import('@/views/WordsView.vue') },
    { path: '/kana', name: 'kana', component: () => import('@/views/KanaView.vue') },
  ],
})

export default router
```

- [ ] **Step 2: App.vue 导航 + 加载**

```vue
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
```

加适量 CSS（居中、最大宽度约 1100px）。

- [ ] **Step 3: LessonFilter 组件**

绑定 `lessonOptions`；`el-select` 的 value 可用 `` `${courseId}:${lessonId}` ``，change 时解析并调用 `setLesson`。

- [ ] **Step 4: 三页占位**

各页暂时显示页面名；确认导航可切换。

- [ ] **Step 5: 手动验证**

Run: `npm run dev`  
打开 `/practice` `/words` `/kana`，确认加载无报错（Network 可见 manifest 与 lesson JSON）。

- [ ] **Step 6: Commit**

```bash
git add src/router src/App.vue src/components src/views
git commit -m "feat: add router shell, nav, and lesson filter"
```

---

### Task 6: PracticeView + PracticeTable

**Files:**
- Create: `src/components/PracticeTable.vue`
- Modify: `src/views/PracticeView.vue`

**Interfaces:**
- Consumes: store `mode`, `setMode`, `wordPairs`, `userAnswers`, `answerResults`, `answersChecked`, `correctCount`, `currentWords`, `checkAnswers`, `startTest`, `LessonFilter`

- [ ] **Step 1: 实现 PracticeTable**

两列问答表，对齐旧版 `el-table` 结构：题干 / 输入 / 结果（提交后显示对错与正确答案）。用 Element Plus；正确绿色、错误红色（class `.correct` / `.incorrect`）。

- [ ] **Step 2: 实现 PracticeView**

- `el-radio-group` 切换 `cn2jp` / `jp2cn` → `setMode`
- `LessonFilter`
- 提交按钮 → `checkAnswers`
- 提交后显示正确率卡片 +「开始新测试」→ `startTest(16)`

- [ ] **Step 3: 手动验证**

选第一课、提交空答案应判错并显示正确答案；再开新测试题目变化。

- [ ] **Step 4: Commit**

```bash
git add src/components/PracticeTable.vue src/views/PracticeView.vue
git commit -m "feat: implement practice view with weighted quiz"
```

---

### Task 7: WordsView + WordListTable + 语音工具

**Files:**
- Create: `src/utils/speech.ts`
- Create: `src/components/WordListTable.vue`
- Modify: `src/views/WordsView.vue`

**Interfaces:**
- Produces: `loadVoices(): Promise<SpeechSynthesisVoice[]>`、`speakJapanese(text, voice?)`
- Words 页：显隐中日文、分页、朗读、单行隐藏日语

- [ ] **Step 1: speech 工具**

```ts
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length) {
      resolve(voices)
      return
    }
    window.speechSynthesis.onvoiceschanged = () => {
      resolve(window.speechSynthesis.getVoices())
    }
  })
}

export function speakJapanese(text: string, voice?: SpeechSynthesisVoice | null) {
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = 'ja-JP'
  if (voice) utter.voice = voice
  else {
    const ja = window.speechSynthesis.getVoices().find((v) => v.lang === 'ja-JP')
    if (ja) utter.voice = ja
  }
  window.speechSynthesis.speak(utter)
}
```

- [ ] **Step 2: WordListTable + WordsView**

- 数据源：`wordsStore.filteredWords`（可复用 `LessonFilter`）
- 开关：显示中文 / 显示日文
- `el-pagination`：`page-sizes` 含与旧版相同选项（若旧版有 `pageSizeOptions`，从 `legacy/element-ui/japanese-chinese-learning.html` 抄数值）
- 朗读按钮调用 `speakJapanese(row.jp)`
- 单行隐藏：本地 `hiddenKey` 状态

- [ ] **Step 3: 手动验证**

`/words` 分页、隐藏、朗读可用。

- [ ] **Step 4: Commit**

```bash
git add src/utils/speech.ts src/components/WordListTable.vue src/views/WordsView.vue
git commit -m "feat: implement words notebook view with speech"
```

---

### Task 8: KanaView + KanaChart

**Files:**
- Create: `src/data/kana.ts`
- Create: `src/components/KanaChart.vue`
- Modify: `src/views/KanaView.vue`

**Interfaces:**
- Produces: `kanaColumns`, `hiraganaChart`, `youonChart`, `dakuonChart`（从 `legacy/js/japanese-chinese-learning.js` 原样迁移）

- [ ] **Step 1: 迁移假名数据到 `src/data/kana.ts`**

从 legacy 文件复制三个 chart 数组与 `kanaColumns = ['a','i','u','e','o']`，补全 TypeScript 类型：

```ts
export interface KanaCell {
  hiragana: string
  katakana: string
  romaji: string
}
export type KanaRow = Partial<Record<'a' | 'i' | 'u' | 'e' | 'o', KanaCell | null>>
```

- [ ] **Step 2: KanaChart + KanaView**

三张表：基本50音 / 拗音 / 浊音半浊音；点击假名调用 `speakJapanese`；语音下拉选择 `SpeechSynthesisVoice`。

- [ ] **Step 3: 手动验证**

`/kana` 显示完整表格，点击可朗读。

- [ ] **Step 4: Commit**

```bash
git add src/data/kana.ts src/components/KanaChart.vue src/views/KanaView.vue
git commit -m "feat: implement kana chart page"
```

---

### Task 9: README、清理与端到端验收

**Files:**
- Create/Modify: `README.md`
- Modify: 按需微调样式与 Element Plus 细节

- [ ] **Step 1: 写 README**

说明：

```bash
npm install
npm run dev
npm run test:unit
npm run build
```

以及如何新增课次（加 JSON + 改 manifest）。

- [ ] **Step 2: 全量测试与构建**

Run: `npm run test:unit`  
Expected: 全部 PASS  

Run: `npm run build`  
Expected: 构建成功

- [ ] **Step 3: 对照成功标准手工点检**

- [ ] 三路由可切换  
- [ ] 词库来自分片 JSON（Network 可见）  
- [ ] 练习筛选 / 判分 / 错题加权（刷新后权重仍在）  
- [ ] 单词本与 50音图可用  
- [ ] `legacy/` 仍在

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add README and finish Vue3 migration checklist"
```

---

## Self-Review

| Spec 要求 | 对应 Task |
|-----------|-----------|
| Vite Vue3 TS 就地改造 + legacy 备份 | Task 1 |
| manifest + 课程目录分片 | Task 3 |
| wordsLoader 并行加载并注入 courseId | Task 2 |
| Pinia 全局 store | Task 4 |
| Router 三页 | Task 5–8 |
| Composition + script setup + Element Plus | 全局约束 + 各 View |
| 练习 / 单词本 / 50音图 / 权重 / 语音 | Task 6–8 |
| 丢弃 lesson0 与残缺词 | Task 3 脚本 |
| 成功标准验收 | Task 9 |

无 TBD 占位；类型名与 store API 在 Task 2/4 定义后被后续任务一致引用。
