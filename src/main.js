import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import HomeView from './views/HomeView.vue'
import CommunityView from './views/CommunityView.vue'
import WriteView from './views/WriteView.vue'
import PostView from './views/PostView.vue'
import FestivalCalendarView from './views/FestivalCalendarView.vue'
import './styles.css'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomeView },
    { path: '/community', component: CommunityView },
    { path: '/write', component: WriteView },
    { path: '/posts/:id', component: PostView },
    { path: '/festivals', component: FestivalCalendarView },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

createApp(App).use(router).mount('#app')
