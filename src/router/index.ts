import { createRouter, createWebHistory } from "vue-router"
import { useAuthStore } from "../stores/auth"
import LoginView from "../views/LoginView.vue"
import HomeView from "../views/HomeView.vue"

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/login" },
    { path: "/login", name: "login", component: LoginView },
    {
      path: "/home",
      name: "home",
      component: HomeView,
      meta: { requiresAuth: true },
      redirect: { name: "home-index" },
      children: [
        { path: "index", name: "home-index", component: () => import("../views/home/indexView.vue") },
        { path: 'favorites', name: 'home-favorites', component: () => import("../views/home/favoriteView.vue") },
        { path: 'recent', name: 'home-recent', component: () => import("../views/home/recentView.vue") },
        { path: 'albums', name: 'home-albums', component: () => import("../views/home/albumsView.vue") },
        { path: 'artists', name: 'home-artists', component: () => import("../views/home/artistsView.vue") },
        { path: 'genres', name: 'home-genres', component: () => import("../views/home/genresView.vue") },
        { path: 'library', name: 'home-library', component: () => import("../views/home/libraryView.vue") },
        { path: 'playlists', name: 'home-playlists', component: () => import("../views/home/playlistsView.vue") },
        { path: '/settings', name: 'home-settings', component: () => import("../views/home/settingsView.vue") },
      ]
    },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: "login" }
  }
  if (to.name === "login" && auth.isLoggedIn) {
    return { name: "home" }
  }
  return true
})

export default router
