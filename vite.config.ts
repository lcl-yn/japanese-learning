/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { grammarSavePlugin } from './vite/grammarSavePlugin.ts'
import { lessonAudioPlugin } from './vite/lessonAudioPlugin.ts'

/**
 * 决定打包后静态资源的公共前缀。
 * 本地开发和 Cloudflare 不设置 GITHUB_PAGES，返回 '/'，网站仍挂在域名根路径。
 * GitHub Actions 会设置 GITHUB_PAGES=true，同时自带 GITHUB_REPOSITORY（形如 用户名/仓库名）。
 * 项目站点的地址是 https://用户名.github.io/仓库名/，所以前缀必须是 /仓库名/。
 * 仓库名以 .github.io 结尾时是用户主页，站点就在域名根路径，前缀保持 '/'。
 */
function resolveBase(): string {
  if (process.env.GITHUB_PAGES !== 'true') return '/'
  const repo = process.env.GITHUB_REPOSITORY?.split('/')[1]
  if (!repo || repo.endsWith('.github.io')) return '/'
  return `/${repo}/`
}

export default defineConfig({
  // 资源公共路径。页面、JS、CSS 的引用都会加上它，并写入 import.meta.env.BASE_URL
  base: resolveBase(),
  // Vite 插件。vue() 负责把 .vue 单文件组件编译成浏览器能运行的代码
  plugins: [vue(), grammarSavePlugin(), lessonAudioPlugin()],
  resolve: {
    alias: {
      // 让 import '@/...' 指向 src 目录，避免写很长的相对路径
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Vitest 配置。和 Vite 共用这份文件，npm run test:unit 时才会用到
  test: {
    environment: 'jsdom', // 在 Node 里模拟浏览器 DOM，组件测试才能查到页面元素
    globals: true, // 测试文件里可以直接写 describe、it、expect，不用每次手动导入
    passWithNoTests: true, // 某个测试文件暂时没有用例时也算通过，不让整次测试失败
  },
})
