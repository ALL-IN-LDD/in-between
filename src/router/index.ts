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
        meta: { title: 'In-Between', style: 'landing.scss', requireGuest: true },
      },
      {
        path: '/choose-player',
        name: 'choose-player',
        component: () => import('@/views/registration/ChoosePlayer.vue'),
        meta: {
          title: 'Choose Player',
          style: 'registration/choose-player.scss',
          requireGuest: true,
        },
      },
      {
        path: '/registration',
        name: 'registration',
        component: () => import('@/views/registration/RegistrationView.vue'),
        meta: { title: 'Register Player', style: 'registration.scss', requireGuest: true },
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
        meta: { title: 'In-Between', style: 'admin/dashboard.scss', requireGuest: true },
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
        meta: { title: 'Dashboard', style: 'game-zone/game-zone.scss', requireGuest: true },
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

// Keep track of loaded stylesheets
const loadedStylesheets = new Set<string>()
let currentStylesheet: HTMLLinkElement | null = null

// Function to load CSS dynamically
function loadStylesheet(stylePath: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // Remove current stylesheet if exists
    if (currentStylesheet) {
      currentStylesheet.remove()
      currentStylesheet = null
    }

    if (!stylePath) {
      resolve()
      return
    }

    // Create new link element
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.type = 'text/css'
    link.href = `/styles/${stylePath.replace('.scss', '.css')}`

    link.onload = () => {
      currentStylesheet = link
      loadedStylesheets.add(stylePath)
      resolve()
    }

    link.onerror = () => {
      reject(new Error(`Failed to load stylesheet: ${stylePath}`))
    }

    document.head.appendChild(link)
  })
}

// Navigation guard to handle CSS loading
router.beforeEach(async (to, from, next) => {
  // Update document title
  if (to.meta.title && typeof to.meta.title === 'string') {
    document.title = to.meta.title
  }

  // Load route-specific CSS
  if (to.meta.style && typeof to.meta.style === 'string') {
    try {
      await loadStylesheet(to.meta.style)
    } catch (error) {
      console.warn('Failed to load stylesheet:', (error as Error).message)
      // Continue navigation even if CSS fails to load
    }
  } else {
    // Remove current stylesheet if no style is specified
    if (currentStylesheet) {
      currentStylesheet.remove()
      currentStylesheet = null
    }
  }

  next()
})

export default router
