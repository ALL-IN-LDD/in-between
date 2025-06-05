import { createRouter, createWebHistory } from 'vue-router'
import RegistrationLayout from '@/layout/RegistrationLayout.vue'
import GameLayout from '@/layout/GameLayout.vue'
import NotFoundPageView from '@/views/empty/NotFoundPageView.vue'

const routes = [
  {
    path: '/',
    component: RegistrationLayout,
    children: [
      {
        path: '/',
        name: 'landing-page',
        component: () => import('@/views/LandingPageView.vue'),
        meta: { title: 'In-Between', style: 'landing', requireGuest: true },
      },
      {
        path: '/choose-player',
        name: 'choose-player',
        component: () => import('@/views/registration/ChoosePlayer.vue'),
        meta: {
          title: 'Choose Player',
          style: 'registration/choose-player',
          requireGuest: true,
        },
      },
      {
        path: '/registration',
        name: 'registration',
        component: () => import('@/views/registration/RegistrationView.vue'),
        meta: { title: 'Register Player', style: 'registration', requireGuest: true },
      },
    ],
  },

  {
    path: '/admin',
    component: RegistrationLayout,
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/admin/DashboardView.vue'),
        meta: { title: 'In-Between', style: 'admin/dashboard', requireGuest: true },
      },
    ],
  },

  {
    path: '/game-zone',
    component: GameLayout,
    children: [
      {
        path: '',
        name: 'game-zone',
        component: () => import('@/views/in-game/GameZoneView.vue'),
        meta: { title: 'Dashboard', style: 'game-zone/game-zone', requireGuest: true },
      },
    ],
  },

  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundPageView,
    meta: { title: 'Not Found' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Glob import of all SCSS files under /assets/styles and subfolders
const cssModules = import.meta.glob('../assets/styles/**/*.scss')

// Function to load CSS using glob-based dynamic imports
async function loadRouteCSS(styleName: string): Promise<void> {
  if (!styleName) return

  const path = `../assets/styles/${styleName}.scss`
  const importer = cssModules[path]

  if (!importer) {
    console.warn(`CSS module not found: ${path}`)
    return
  }

  try {
    await importer()
  } catch (error) {
    console.warn(`Failed to load CSS module: ${styleName}`, error)
  }
}

// Navigation guard to handle title updates and route-specific CSS
router.beforeEach(async (to, from, next) => {
  if (to.meta.title && typeof to.meta.title === 'string') {
    document.title = to.meta.title
  }

  if (to.meta.style && typeof to.meta.style === 'string') {
    await loadRouteCSS(to.meta.style)
  }

  next()
})

export default router
