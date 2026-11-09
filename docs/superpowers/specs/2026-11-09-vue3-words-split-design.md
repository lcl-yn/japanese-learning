# Vue3 日语学习应用改造设计

**日期**：2026-11-09  
**状态**：待用户确认  
**范围**：就地改造为 Vite + Vue3 + TypeScript 脚手架；单词 JSON 按课程分片 + manifest 加载；Pinia 全局词库；Vue Router 多页。

## 背景与目标

现有项目是 CDN 引入的 Vue2 + Element UI 单页，单词数据写在 `js/japanese-chinese-learning.js` 的巨型 `allWords` 数组中。随着词表增大，维护成本上升，且不利于按课程/单元归类。

目标：

1. 将 `allWords` 拆成按课程目录组织的小 JSON 文件。
2. 通过 `manifest.json` 统一发现并加载，运行时拼接为完整词表。
3. 就地重建为完整 Vue3 学习型脚手架，保留现有练习能力，便于学习现代前端。

## 已确认决策

| 项 | 选择 |
|----|------|
| 数据分片结构 | 课程子目录 + 课次 JSON（如 `course-n5/lesson-01.json`） |
| 加载方式 | 运行时 `manifest.json` 清单 + `fetch` 拼接 |
| 脚手架 | Vite + Vue 3 + TypeScript |
| 组件写法 | Composition API + `<script setup>` |
| UI 库 | Element Plus |
| 路由 | 多路由：`/practice`、`/words`、`/kana` |
| 状态管理 | Pinia 全局词库 Store |
| 落地方式 | 就地改造；旧 HTML/JS 移入 `legacy/` |

## 架构概览

```text
App 启动 → wordsStore.loadWords()
              ↓
        wordsLoader 读 manifest
              ↓
        并行/顺序 fetch 各 lesson JSON
              ↓
        拼接 Word[] → Pinia
              ↓
   /practice  /words  /kana  共用同一 store
```

## 目录结构

```text
japanese-learning/
├── legacy/                        # 旧 HTML/JS 备份
│   ├── element-ui/
│   └── js/
├── public/
│   └── data/
│       └── words/
│           ├── manifest.json
│           └── course-n5/
│               ├── lesson-01.json
│               └── lesson-02.json
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── router/
│   │   └── index.ts
│   ├── stores/
│   │   └── words.ts
│   ├── types/
│   │   └── word.ts
│   ├── services/
│   │   └── wordsLoader.ts
│   ├── views/
│   │   ├── PracticeView.vue
│   │   ├── WordsView.vue
│   │   └── KanaView.vue
│   └── components/
│       ├── PracticeTable.vue
│       ├── WordListTable.vue
│       ├── KanaChart.vue
│       └── LessonFilter.vue
├── package.json
└── vite.config.ts
```

## 数据格式

### manifest.json

```json
{
  "courses": [
    {
      "id": "n5",
      "name": "N5 基础",
      "lessons": [
        { "id": 1, "name": "第一课", "file": "course-n5/lesson-01.json" },
        { "id": 2, "name": "第二课", "file": "course-n5/lesson-02.json" }
      ]
    }
  ]
}
```

### lesson-XX.json

词条数组，字段与现有数据保持一致：

```json
[
  {
    "cn": "大学生",
    "jp": "だいがくせい",
    "jp_write": "大学生",
    "describe": "",
    "part_of_speech": "名词",
    "lesson": 1
  }
]
```

### 加载约定

1. `wordsLoader` 请求 `/data/words/manifest.json`。
2. 按各 `file` 相对路径**并行** `fetch` 课次 JSON（基路径 `/data/words/`）。
3. 拼接为完整词表交给 Pinia；加载时为每条词补上 `courseId`（来自所属 course），便于按课程筛选。
4. 词条内原有 `lesson` 字段保留，用于课次筛选。
5. 新增课次：添加 JSON 文件，并在 `manifest.json` 登记即可。

### TypeScript 类型（示意）

```ts
export interface Word {
  cn: string
  jp: string
  jp_write: string
  describe: string
  part_of_speech: string
  lesson: number
  courseId: string // 加载时由 loader 注入，JSON 文件内可不写
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

## Pinia Store（`words`）

第一版将词库与练习会话放在同一 store，页面少时更简单；后续若膨胀可再拆 `practice` store。

### 状态

| 字段 | 含义 |
|------|------|
| `manifest` | 课程/课次清单 |
| `allWords` | 拼接后的完整词表 |
| `loading` / `error` | 加载状态 |
| `currentCourseId` | 当前课程，如 `'n5'` 或 `'all'` |
| `currentLessonId` | 当前课次，`0` 表示全部 |
| `errorCounts` | `{ [cn-jp]: number }`，持久化到 `localStorage` |
| `mode` | `'cn2jp' \| 'jp2cn'` |
| `currentWords` / `userAnswers` / `answerResults` 等 | 当前一轮练习会话 |

### Getters

- `lessonOptions`：由 `manifest` 生成下拉选项
- `filteredWords`：按 `courseId` + `lesson` 过滤（`all` / `0` 表示不限制）
- `wordPairs`：练习页两列布局数据

### Actions

- `loadWords()`：调用 `wordsLoader`，写入 `manifest` + `allWords`，初始化/合并 `errorCounts`
- `setLesson(courseId, lessonId)`：更新筛选并重新开测
- `startTest(count = 16)`：按错误权重随机抽词
- `checkAnswers()`：判分；错题调用 `incrementError`
- `incrementError(word)` / `getWeight(word)`：错误权重逻辑

### 加载时机

在 `App.vue` 的 `onMounted` 中调用一次 `loadWords()`（幂等：已加载则跳过），保证 `/practice`、`/words`、`/kana` 共用同一份数据。

## 路由与页面

| 路由 | 页面 | 职责 |
|------|------|------|
| `/` | 重定向到 `/practice` | 默认进入练习 |
| `/practice` | `PracticeView` | 模式切换、课程/课次筛选、抽词作答、判分、错题加权 |
| `/words` | `WordsView` | 单词本：显隐中日文、分页、语音朗读 |
| `/kana` | `KanaView` | 50音图（清音/浊音/拗音）+ 点击朗读 |

### 壳层

- `App.vue`：顶栏导航（练习 / 单词本 / 50音图）+ `<RouterView />`
- 启动加载词库，三页共享 Pinia

### 组件

- `PracticeTable`：两列作答表
- `WordListTable`：单词本表格 + 分页
- `KanaChart`：假名表
- `LessonFilter`：课程/课次选择（练习页与单词本可复用）

## 功能边界（第一版）

**纳入：**

- 现有能力对齐迁移：中日互测、按课筛选、单词本、50音图、错误权重随机、本地错误计数、语音朗读
- Element UI → Element Plus API 适配（如 `:visible.sync` → `v-model`）
- 将现有 `allWords` 按 `lesson` 拆入 `course-n5/lesson-XX.json`，并写好 `manifest.json`（现有数据主要为第 1、2 课；`lesson: 0` 的空占位条目迁移时丢弃）

**不纳入：**

- 用户账号 / 后端 API
- 构建时合并 JSON（坚持运行时 manifest）
- 新增大功能（收藏、统计看板、导入导出等）

## 迁移步骤（实现时参考）

1. 初始化 Vite Vue3 TS 项目于当前目录（避免覆盖前先移走旧文件到 `legacy/`）。
2. 安装并配置 Vue Router、Pinia、Element Plus。
3. 定义类型、`wordsLoader`、`words` store。
4. 拆分现有词数据到 `public/data/words/`。
5. 实现三个视图与公共组件，对齐旧交互。
6. 验证加载、筛选、练习、单词本、50音图与 localStorage 权重。

## 成功标准

- `npm run dev` 可启动；三路由可切换。
- 修改/新增课次 JSON 并更新 manifest 后，刷新即可看到新词，无需改业务代码中的大数组。
- 练习抽词、判分、错题加权行为与旧版一致。
- 单词本与 50音图功能可用。
- 旧代码可在 `legacy/` 中查阅对照。
