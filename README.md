# 日语学习

按册、单元、课练习日语，并对照单词本与五十音图。练习、单词本、五十音图共用同一份 Pinia 词库。启动时读取 `public/data/words/manifest.json`，再并行加载各课 JSON。书籍、单元号、课号由清单写入，词条 JSON 不写这些字段。

## 在线访问

| 环境 | 地址 |
| --- | --- |
| GitHub Pages | [lcl-yn.github.io/japanese-learning](https://lcl-yn.github.io/japanese-learning/) |
| Cloudflare Workers | [japanese-learning.1141193930.workers.dev](https://japanese-learning.1141193930.workers.dev/) |

GitHub Pages 在推送到 `master` 后，由 `.github/workflows/pages.yml` 构建并发布。Cloudflare 使用普通的 `npm run build`，站点挂在域名根路径。

## 页面

打开应用后进入五十音图。页面是顶栏、左侧目录、主区和底栏。目录在五十音图下面是单词本，再按书籍 → 单元 → 课 → 单词 / 课文 / 语法展开。课文和语法还没有内容。

| 路由 | 页面 | 能做什么 |
| --- | --- | --- |
| `/study/:bookId/:unitId/:lessonId/practice` | 练习 | 在当前课抽词作答、判分；下拉可改到本单元其他课 |
| `/words` | 单词本 | 按册、单元、课筛选，显隐中日文，分页，朗读。筛选不带动左侧目录 |
| `/kana` | 五十音图 | 清音、浊音、拗音，点击朗读 |

地址里的 `unitId`、`lessonId` 是清单上的 `unit`、`lesson`，不是记录 `id`。

## 技术栈

Vue 3、TypeScript、Vite、Vue Router、Pinia、Element Plus、Vitest。具体版本见 `package.json`。

## 本地开发

```bash
npm install
npm run dev
```

开发服务器默认是 [http://localhost:5173/](http://localhost:5173/)，端口占用时会顺延。

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run test:unit` | 运行一遍单元测试 |
| `npm run test:watch` | 监听文件并重复运行测试 |
| `npm run build` | 先执行 `vue-tsc -b`，通过后再 `vite build` |
| `npm run preview` | 预览生产构建 |

## 新增一课

1. 在对应册的目录新增 JSON，例如 `public/data/words/beginner-upper/lesson-03.json`。

```json
[
  {
    "cn": "明天",
    "jp": "あした",
    "jp_write": "明日",
    "describe": "",
    "part_of_speech": "名词"
  }
]
```

`describe` 默认是空字符串。看中文写日语时，说明去掉首尾空白后仍有内容，就在中文下一行显示「单词说明：」加这段说明。空字符串或 `null` 时只显示中文。

2. 在 `manifest.json` 对应单元的 `lessons` 里登记。`file` 相对 `public/data/words/`。`id` 留给以后的数据库主键；第几单元、第几课用 `unit`、`lesson`。

```json
{
  "id": 1,
  "unit": 1,
  "name": "第1单元",
  "lessons": [
    {
      "id": 3,
      "lesson": 3,
      "name": "第3课",
      "file": "beginner-upper/lesson-03.json"
    }
  ]
}
```

3. 刷新页面即可看到新词。没有课的单元在目录里显示「暂无课」。

## 错题权重

答错的词会把计数写入浏览器 `localStorage` 的 `wordErrorCounts`。刷新后权重仍在。抽词时，错得越多的词被抽到的机会越大。

## 语音

单词本和五十音图使用浏览器 `speechSynthesis`。下拉优先列出日语语音；本机没有日语语音时列出全部语音，朗读仍以 `ja-JP` 发出。
