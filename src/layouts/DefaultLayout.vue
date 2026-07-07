<script setup lang="ts">
import AppSidebar from './AppSidebar.vue'
</script>

<template>
  <div class="app-layout">
    <AppSidebar />
    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  background: transparent;
  padding: 2rem;
  position: relative;
}

/* ── Responsive ── */
@media (max-width: 900px) {
  .main-content {
    padding: 3rem 1rem 1.5rem;
  }
}
</style>
