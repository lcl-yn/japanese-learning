# 中日语言学习

Vite + Vue 3 + TypeScript 日语练习应用。词库按课程分片放在 `public/data/words/`，启动时读取 `manifest.json`，并行加载各课 JSON，并由 `wordsLoader` 注入 `courseId`。练习、单词本、50音图共用同一份 Pinia 词库。

## 脚本

```bash
npm install
npm run dev
npm run test:unit
npm run build
```

`npm run dev` 启动开发服务器（默认 `http://localhost:5173/`）。`/` 会重定向到 `/practice`。

| 路由 | 页面 |
|------|------|
| `/practice` | 练习：课程/课次筛选、抽词作答、判分、错题加权 |
| `/words` | 单词本：显隐中日文、分页、语音朗读 |
| `/kana` | 50音图：清音、浊音、拗音，点击朗读 |

`npm run build` 会先跑 `vue-tsc -b`，再执行 `vite build`。`npm run preview` 预览生产构建。

## 新增课次

1. 在对应课程目录新增 JSON，例如 `public/data/words/course-n5/lesson-03.json`。新课程则新建目录，如 `public/data/words/course-n4/`。
2. 文件内容是词条数组。不要在 JSON 里写 `courseId`，加载时按所属课程写入。

```json
[
  {
    "index": 1,
    "cn": "明天",
    "jp": "あした",
    "jp_kanji": "明日",
    "part_of_speech": "名词",
    "lesson": 3
  }
]
```

3. 在 `public/data/words/manifest.json` 的对应课程下登记该课。`file` 相对 `public/data/words/`。

```json
{
  "id": 3,
  "name": "第3课",
  "file": "course-n5/lesson-03.json"
}
```

4. 刷新页面即可看到新词，不必改业务代码里的词表。

`lesson` 与 manifest 里的课次 `id` 应对齐，练习和单词本按这两个字段筛选。

## 错题权重

答错的词会把计数写入浏览器 `localStorage` 的 `wordErrorCounts`。刷新后权重仍在；抽词时错得越多，被抽到的机会越大。

## 语音

单词本和 50音图使用浏览器 `speechSynthesis`，下拉只列出 `lang` 为 `ja-JP` 的语音。系统没有日语语音时下拉为空，朗读仍以 `ja-JP` 发出，实际发音取决于本机语音引擎。

## 旧版代码

Vue 2 单页备份在 `legacy/`（`legacy/element-ui/` 与 `legacy/js/`），只作对照，不参与当前构建。
