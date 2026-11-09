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

