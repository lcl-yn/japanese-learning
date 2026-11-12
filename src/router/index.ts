import { createRouter, createWebHistory } from 'vue-router'
import {
  GRAMMAR_DESCRIPTION,
  KANA_DESCRIPTION,
  KANA_SEO_TITLE,
  PRACTICE_DESCRIPTION,
  READING_DESCRIPTION,
  WORDS_DESCRIPTION,
  WORDS_SEO_TITLE,
} from '@/utils/seo'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/kana' },
    { path: '/practice', redirect: '/kana' },
    {
      path: '/words',
      name: 'words',
      component: () => import('@/views/WordsView.vue'),
      meta: { title: '单词本', seoTitle: WORDS_SEO_TITLE, description: WORDS_DESCRIPTION, section: 'words' },
    },
    {
      path: '/study/:bookId/:unitId/:lessonId/practice',
      name: 'practice',
      component: () => import('@/views/PracticeView.vue'),
      meta: { title: '单词', description: PRACTICE_DESCRIPTION, section: 'practice' },
    },
    {
      path: '/study/:bookId/:unitId/:lessonId/reading',
      name: 'reading',
      component: () => import('@/views/SectionPlaceholder.vue'),
      meta: { title: '课文', description: READING_DESCRIPTION, robots: 'noindex,follow', section: 'reading' },
    },
    {
      path: '/study/:bookId/:unitId/:lessonId/grammar',
      name: 'grammar',
      component: () => import('@/views/GrammarView.vue'),
      meta: { title: '语法', description: GRAMMAR_DESCRIPTION, robots: 'noindex,follow', section: 'grammar' },
    },
    { path: '/study/:bookId/:unitId/:lessonId/words', redirect: '/words' },
    { path: '/study/:bookId/:unitId/words', redirect: '/words' },
    {
      path: '/study/:bookId/:unitId/:section(practice|reading|grammar)',
      component: () => import('@/views/StudyLessonRedirect.vue'),
      props: true,
    },
    {
      path: '/kana',
      name: 'kana',
      component: () => import('@/views/KanaView.vue'),
      meta: { title: '50音图', seoTitle: KANA_SEO_TITLE, description: KANA_DESCRIPTION },
    },
  ],
})

export default router
