import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/practice' },
    { path: '/practice', name: 'practice', component: () => import('@/views/PracticeView.vue') },
    { path: '/words', name: 'words', component: () => import('@/views/WordsView.vue') },
    { path: '/kana', name: 'kana', component: () => import('@/views/KanaView.vue') },
  ],
})

export default router
