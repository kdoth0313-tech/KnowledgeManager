import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
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
  next()
})

export default router
