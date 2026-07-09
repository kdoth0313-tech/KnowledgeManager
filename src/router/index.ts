import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/auth',
    name: 'auth',
    component: () => import('@/views/AuthPage.vue'),
    meta: { title: '登录' },
  },
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomePage.vue'),
    meta: { title: '首页' },
  },
  {
    path: '/editor/:id?',
    name: 'editor',
    component: () => import('@/views/EditorPage.vue'),
    meta: { title: '编辑器' },
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('@/views/SearchPage.vue'),
    meta: { title: '搜索' },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  document.title = `${to.meta.title ?? 'KnowledgeManager'} – KnowledgeManager`

  // Allow auth page through
  if (to.name === 'auth') return next()

  // Check auth for all other routes
  const authStore = useAuthStore()
  if (!authStore.isAuthenticated) {
    return next({ name: 'auth' })
  }

  next()
})

export default router
