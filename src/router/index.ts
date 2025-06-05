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

// CSS Module cache
const cssModules = new Map<string, Promise<Record<string, unknown>>>()

// Define your CSS file mapping
const cssFileMap: Record<string, string> = {
  landing: 'landing.scss',
  registration: 'registration.scss',
  'registration/choose-player': 'registration-choose-player.scss', // or 'registration/choose-player.scss'
  'admin/dashboard': 'admin-dashboard.scss', // or 'admin/dashboard.scss'
  'game-zone/game-zone': 'game-zone.scss', // or 'game-zone/game-zone.scss'
}

// Function to resolve CSS file path
function resolveCSSPath(styleName: string): string {
  // Check if we have a specific mapping
  if (cssFileMap[styleName]) {
    return cssFileMap[styleName]
  }

  // Default: use the styleName as-is
  return `${styleName}.scss`
}

// Function to load CSS using Vite's dynamic imports
async function loadRouteCSS(styleName: string): Promise<void> {
  if (!styleName) {
    return
  }

  try {
    // Cache the import promise
    if (!cssModules.has(styleName)) {
      const cssFileName = resolveCSSPath(styleName)
      const importPromise = import(`../assets/styles/${cssFileName}`)
      cssModules.set(styleName, importPromise)
    }

    // Wait for the CSS to load
    await cssModules.get(styleName)

    // Vite automatically injects the CSS, so we don't need to do anything else
    console.log(`✅ Loaded CSS: ${styleName}`)
  } catch (error) {
    console.warn(`❌ Failed to load CSS module: ${styleName}`, error)
    console.warn(`Expected file: src/assets/styles/${resolveCSSPath(styleName)}`)
  }
}

// Navigation guard to handle CSS loading
router.beforeEach(async (to, from, next) => {
  // Update document title
  if (to.meta.title && typeof to.meta.title === 'string') {
    document.title = to.meta.title
  }

  // Load route-specific CSS
  if (to.meta.style && typeof to.meta.style === 'string') {
    await loadRouteCSS(to.meta.style)
  }

  next()
})

export default router
