import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

// Initialize draft from IndexedDB after app is mounted
import { useDraftStore } from '@/stores/draft'
const draftStore = useDraftStore()
draftStore.loadDraft()
