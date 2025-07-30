import { createRouter, createWebHistory } from 'vue-router'
import axios from 'axios'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'calendar',
      component: () => import('@/components/CalendarView.vue'),
      beforeEnter: async (_to, _from, next) => {
        try {
          const response = await axios.get('/auth/status')
          if (response.data.authenticated) {
            next()
          } else {
            next('/setup')
          }
        } catch (error) {
          next('/setup')
        }
      }
    },
    {
      path: '/setup',
      name: 'setup',
      component: () => import('@/components/SetupPage.vue')
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/components/AdminPage.vue')
    }
  ]
})

export default router