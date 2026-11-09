import { createRouter, createWebHistory } from 'vue-router'
import Placeholder from '@/views/Placeholder.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Placeholder,
    },
  ],
})

export default router
