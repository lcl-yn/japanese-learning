# 中日语言学习

按课程抽词练习日语，并对照单词本与五十音图。练习、单词本、五十音图共用同一份 Pinia 词库。词库按课次放在 `public/data/words/`，启动时读取 `manifest.json`，并行加载各课 JSON，再由 `wordsLoader` 写入 `courseId`。

## 在线访问

| 环境 | 地址 |
| --- | --- |
| GitHub Pages | [lcl-yn.github.io/japanese-learning](https://lcl-yn.github.io/japanese-learning/) |
| Cloudflare Workers | [japanese-learning.1141193930.workers.dev](https://japanese-learning.1141193930.workers.dev/practice) |

GitHub Pages 在推送到 `master` 后，由 `.github/workflows/pages.yml` 构建并发布。Cloudflare 使用普通的 `npm run build`，站点仍挂在域名根路径。

## 页面

打开应用后，`/` 会进入 `/practice`。

| 路由 | 页面 | 能做什么 |
| --- | --- | --- |
| `/practice` | 练习 | 按课程和课次筛选，抽词作答，判分，错题加权 |
| `/words` | 单词本 | 显隐中日文，分页浏览，语音朗读 |
| `/kana` | 五十音图 | 清音、浊音、拗音，点击朗读 |

## 技术栈

Vue 3、TypeScript、Vite、Vue Router、Pinia、Element Plus、Vitest。具体版本见 `package.json`。

## 本地开发

```bash
npm install
npm run dev
```

开发服务器默认是 [http://localhost:5173/](http://localhost:5173/)。

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run test:unit` | 运行一遍单元测试 |
| `npm run test:watch` | 监听文件并重复运行测试 |
| `npm run build` | 先执行 `vue-tsc -b`，通过后再 `vite build` |
| `npm run preview` | 预览生产构建 |

## 新增课次

1. 在对应课程目录新增 JSON，例如 `public/data/words/course-n5/lesson-03.json`。新课程则新建目录，如 `public/data/words/course-n4/`。
2. 文件内容是词条数组。`courseId` 由加载器按所属课程写入，词条 JSON 里不写这个字段。

```json
[
  {
    "cn": "明天",
    "jp": "あした",
    "jp_write": "明日",
    "describe": "",
    "part_of_speech": "名词",
    "lesson": 3
  }
]
```

`describe` 默认是空字符串。看中文写日语时，说明去掉首尾空白后仍有内容，就在中文下一行显示「单词说明：」加这段说明。空字符串或 `null` 时只显示中文。

3. 在 `public/data/words/manifest.json` 的对应课程下登记该课。`file` 相对 `public/data/words/`。

```json
{
  "id": "n5",
  "name": "N5 基础",
  "lessons": [
    {
      "id": 3,
      "name": "第3课",
      "file": "course-n5/lesson-03.json"
    }
  ]
}
```

4. 刷新页面即可看到新词。

词条里的 `lesson` 与 manifest 里的课次 `id` 对齐。练习和单词本按这两个字段筛选。

## 错题权重

答错的词会把计数写入浏览器 `localStorage` 的 `wordErrorCounts`。刷新后权重仍在。抽词时，错得越多的词被抽到的机会越大。

## 语音

单词本和五十音图使用浏览器 `speechSynthesis`。语音下拉只列出 `lang` 为 `ja-JP` 的语音。系统没有日语语音时下拉为空，朗读仍以 `ja-JP` 发出，实际发音取决于本机语音引擎。
