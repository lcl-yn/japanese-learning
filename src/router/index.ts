import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeRedirect.vue'), props: { target: 'practice' } },
    { path: '/practice', redirect: '/' },
    {
      path: '/words',
      name: 'words',
      component: () => import('@/views/WordsView.vue'),
      meta: { title: '单词本', section: 'words' },
    },
    {
      path: '/study/:bookId/:unitId/:lessonId/practice',
      name: 'practice',
      component: () => import('@/views/PracticeView.vue'),
      meta: { title: '单词', section: 'practice' },
    },
    {
      path: '/study/:bookId/:unitId/:lessonId/reading',
      name: 'reading',
      component: () => import('@/views/SectionPlaceholder.vue'),
      meta: { title: '课文', section: 'reading' },
    },
    {
      path: '/study/:bookId/:unitId/:lessonId/grammar',
      name: 'grammar',
      component: () => import('@/views/SectionPlaceholder.vue'),
      meta: { title: '语法', section: 'grammar' },
    },
    { path: '/study/:bookId/:unitId/:lessonId/words', redirect: '/words' },
    { path: '/study/:bookId/:unitId/words', redirect: '/words' },
    {
      path: '/study/:bookId/:unitId/:section(practice|reading|grammar)',
      component: () => import('@/views/StudyLessonRedirect.vue'),
      props: true,
    },
    { path: '/kana', name: 'kana', component: () => import('@/views/KanaView.vue'), meta: { title: '50音图' } },
  ],
})

export default router
